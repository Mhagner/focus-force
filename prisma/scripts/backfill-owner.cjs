/* eslint-disable no-console */
/**
 * Vincula TODOS os dados legados (sem userId) ao usuário dono.
 *
 * Uso (depois de aplicar a migration "expand" e fazer backup do banco):
 *   OWNER_EMAIL=voce@exemplo.com ENCRYPTION_KEY=... node prisma/scripts/backfill-owner.cjs --dry-run
 *   OWNER_EMAIL=voce@exemplo.com ENCRYPTION_KEY=... node prisma/scripts/backfill-owner.cjs
 *
 * Flags:
 *   --dry-run                  executa tudo numa transação e desfaz no final (só mostra contagens)
 *   --delete-extra-settings    apaga linhas "extras" das tabelas de configuração (singletons legados)
 *
 * Idempotente: pode ser executado de novo (ex.: após o deploy, para pegar linhas criadas pelo
 * código antigo entre a migration e o deploy).
 */
const { createCipheriv, randomBytes } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const DELETE_EXTRA = process.argv.includes('--delete-extra-settings');

const DOMAIN_TABLES = [
  'project',
  'task',
  'taskComment',
  'taskSubtask',
  'focusSession',
  'sessionDescriptionPreset',
  'dailyPlan',
  'dailyPlanBlock',
];
const SINGLETON_TABLES = ['pomodoroSettings', 'clockfySettings', 'taskBoardSettings'];

class Rollback extends Error {}

function encrypt(plain) {
  const raw = process.env.ENCRYPTION_KEY;
  const key = raw ? Buffer.from(raw, 'base64') : null;
  if (!key || key.length !== 32) {
    throw new Error('ENCRYPTION_KEY ausente ou inválida (precisa de 32 bytes em base64).');
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join(':');
}

async function main() {
  const email = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
  if (!email) throw new Error('Defina OWNER_EMAIL.');

  console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}Dono dos dados legados: ${email}`);

  try {
    await prisma.$transaction(
      async (tx) => {
        // 1) Usuário dono
        let user = await tx.user.findUnique({ where: { email } });
        if (!user) {
          user = await tx.user.create({ data: { email, emailVerified: new Date(), name: null } });
          console.log('Usuário criado.');
        } else if (!user.emailVerified) {
          user = await tx.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
        }
        const userId = user.id;

        // 2) Workspace padrão
        let workspace = await tx.workspace.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
        if (!workspace) {
          workspace = await tx.workspace.create({ data: { userId, name: 'Trabalho', mode: 'WORK' } });
          console.log('Workspace "Trabalho" criado.');
        }

        // 3) Plano e assinatura do dono (sem limites)
        const plan = await tx.plan.upsert({
          where: { key: 'owner' },
          update: {},
          create: { key: 'owner', name: 'Proprietário', limits: { workspaces: null, projects: null } },
        });
        await tx.subscription.upsert({
          where: { userId },
          update: {},
          create: { userId, planId: plan.id, status: 'active' },
        });

        // 4) Tabelas de domínio
        const counts = {};
        for (const table of DOMAIN_TABLES) {
          const { count } = await tx[table].updateMany({ where: { userId: null }, data: { userId } });
          counts[table] = count;
        }
        const projectsNoWs = await tx.project.updateMany({
          where: { workspaceId: null },
          data: { workspaceId: workspace.id },
        });
        console.log('Linhas vinculadas ao dono:', counts, `| projetos sem workspace corrigidos: ${projectsNoWs.count}`);

        // 5) Singletons de configuração: um por usuário
        for (const table of SINGLETON_TABLES) {
          const mine = await tx[table].findFirst({ where: { userId } });
          const orphans = await tx[table].findMany({ where: { userId: null }, orderBy: { id: 'asc' } });
          if (!mine && orphans.length > 0) {
            await tx[table].update({ where: { id: orphans[0].id }, data: { userId } });
            orphans.shift();
          }
          if (orphans.length > 0) {
            if (!DELETE_EXTRA) {
              throw new Error(
                `${table} tem ${orphans.length} linha(s) extra(s) sem dono. ` +
                  'Revise e rode de novo com --delete-extra-settings para apagá-las.'
              );
            }
            await tx[table].deleteMany({ where: { id: { in: orphans.map((row) => row.id) } } });
            console.log(`${table}: ${orphans.length} linha(s) extra(s) apagada(s).`);
          }
        }

        // 6) Clockfy: cifrar a chave em texto puro; se o dono usava a chave do .env, migrar para a conta dele
        const clockfy = await tx.clockfySettings.findFirst({ where: { userId } });
        const envKey = process.env.CLOCKFY_API_KEY;
        const envWorkspace = process.env.CLOCKFY_WORKSPACE_ID;
        if (clockfy) {
          const patch = {};
          if (clockfy.apiKey && !clockfy.apiKey.startsWith('v1:')) patch.apiKey = encrypt(clockfy.apiKey);
          if (!clockfy.apiKey && envKey) patch.apiKey = encrypt(envKey);
          if (!clockfy.workspaceId && envWorkspace) patch.workspaceId = envWorkspace;
          if (Object.keys(patch).length) {
            await tx.clockfySettings.update({ where: { id: clockfy.id }, data: patch });
            console.log('Clockfy: chave protegida/migrada para a conta do dono.');
          }
        } else if (envKey) {
          await tx.clockfySettings.create({
            data: { userId, apiKey: encrypt(envKey), workspaceId: envWorkspace || null },
          });
          console.log('Clockfy: chave do .env migrada para a conta do dono.');
        }

        // 7) Verificação final: nada pode ficar sem dono
        const leftovers = {};
        for (const table of [...DOMAIN_TABLES, ...SINGLETON_TABLES]) {
          leftovers[table] = await tx[table].count({ where: { userId: null } });
        }
        const bad = Object.entries(leftovers).filter(([, n]) => n > 0);
        if (bad.length) {
          throw new Error(`Ainda há linhas sem dono: ${JSON.stringify(Object.fromEntries(bad))}`);
        }

        const totals = {};
        for (const table of DOMAIN_TABLES) {
          totals[table] = await tx[table].count({ where: { userId } });
        }
        console.log('Totais do dono após backfill:', totals);

        if (DRY_RUN) throw new Rollback();
      },
      { timeout: 120_000, maxWait: 30_000 }
    );
    console.log('Backfill concluído e confirmado.');
  } catch (error) {
    if (error instanceof Rollback) {
      console.log('[DRY-RUN] Tudo certo; transação desfeita, nada foi gravado.');
      return;
    }
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Backfill FALHOU (nada foi gravado):', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
