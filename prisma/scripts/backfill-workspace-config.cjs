/* eslint-disable no-console */
/**
 * Converte os dados anteriores ao onboarding para o modelo "por workspace", PRESERVANDO o que existe:
 *  - colunas do quadro: as 5 de status (com os nomes que o usuário usava) + as personalizadas que tinham tarefas;
 *  - cada tarefa recebe a coluna correspondente (nenhuma tarefa muda de lugar);
 *  - configurações de foco e descrições de sessão do usuário são COPIADAS para cada workspace existente
 *    (a partir daí cada workspace é independente);
 *  - workspaces existentes ficam marcados como onboarded.
 *
 * Uso (depois de `prisma migrate deploy` e de fazer backup):
 *   node prisma/scripts/backfill-workspace-config.cjs --dry-run
 *   node prisma/scripts/backfill-workspace-config.cjs
 *
 * Idempotente: workspaces que já têm colunas/configurações/descrições não são alterados; só tarefas
 * ainda sem coluna são atribuídas. Pode rodar de novo após o deploy.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// Ordem e nomes que o quadro tinha antes (STATUS_TITLES de lib/workspace/labels.ts).
const STATUS_ORDER = ['todo', 'call_agendada', 'pronta_elaboracao', 'doing', 'done'];
const LEGACY_TITLES = {
  WORK: { todo: 'Todo', call_agendada: 'Call agendada', pronta_elaboracao: 'Pronta para elaboracao', doing: 'Fazendo', done: 'Feito' },
  STUDY: { todo: 'A estudar', call_agendada: 'Teoria', pronta_elaboracao: 'Exercícios', doing: 'Revisão', done: 'Dominado' },
};
const FOCUS_DEFAULTS = {
  WORK: { workMin: 50, shortBreakMin: 10, longBreakMin: 20, cyclesToLongBreak: 3 },
  STUDY: { workMin: 25, shortBreakMin: 5, longBreakMin: 15, cyclesToLongBreak: 4 },
};

class Rollback extends Error {}

/** Mesma regra de lib/tasks/column-status.ts: conclusão = done; 1ª aberta = todo; demais = doing. */
function derivedStatus(column, columns) {
  if (column.isDone) return 'done';
  const firstOpen = [...columns].sort((a, b) => a.position - b.position).find((c) => !c.isDone);
  return firstOpen && firstOpen.id === column.id ? 'todo' : 'doing';
}

async function processWorkspace(tx, workspace, board, legacyPomodoro, legacyPresets, summary) {
  const { id: workspaceId, userId, mode } = workspace;
  const titleOverrides = (board && board.statusTitles && board.statusTitles[mode]) || {};
  const customMap = (board && board.taskColumnMap && typeof board.taskColumnMap === 'object') ? board.taskColumnMap : {};
  const customDefs = Array.isArray(board && board.columns) ? board.columns : [];

  let columns = await tx.boardColumn.findMany({ where: { workspaceId }, orderBy: { position: 'asc' } });

  const tasks = await tx.task.findMany({
    where: { project: { workspaceId } },
    select: { id: true, status: true, columnId: true },
  });

  // 1) Colunas
  const customIdToColumnId = new Map();
  const statusToColumnId = new Map();
  if (columns.length === 0) {
    let position = 0;
    for (const status of STATUS_ORDER) {
      const title = (titleOverrides[status] || LEGACY_TITLES[mode][status]).slice(0, 40);
      const column = await tx.boardColumn.create({
        data: { userId, workspaceId, title, position: position++, isDone: status === 'done' },
      });
      statusToColumnId.set(status, column.id);
    }
    // personalizadas: só as que têm tarefa neste workspace (antes eram compartilhadas entre workspaces)
    const usedCustomIds = new Set(tasks.map((t) => customMap[t.id]).filter(Boolean));
    for (const def of customDefs) {
      if (!def || typeof def.id !== 'string' || !usedCustomIds.has(def.id)) continue;
      const column = await tx.boardColumn.create({
        data: { userId, workspaceId, title: String(def.title || 'Coluna').slice(0, 40), position: position++, isDone: false },
      });
      customIdToColumnId.set(def.id, column.id);
    }
    columns = await tx.boardColumn.findMany({ where: { workspaceId }, orderBy: { position: 'asc' } });
    summary.columnsCreated += columns.length;
  }

  // 2) Tarefas sem coluna → coluna correspondente (concluídas sempre vão para a coluna de conclusão)
  const done = columns.find((c) => c.isDone);
  if (!done) throw new Error(`Workspace ${workspaceId} ficou sem coluna de conclusão.`);
  const firstOpen = columns.find((c) => !c.isDone) || columns[0];
  for (const task of tasks) {
    if (task.columnId) continue;
    let target;
    if (task.status === 'done') {
      target = done;
    } else if (customMap[task.id] && customIdToColumnId.has(customMap[task.id])) {
      target = columns.find((c) => c.id === customIdToColumnId.get(customMap[task.id]));
    } else if (statusToColumnId.size > 0) {
      target = columns.find((c) => c.id === statusToColumnId.get(task.status));
    }
    target = target || firstOpen;
    await tx.task.update({
      where: { id: task.id },
      data: { columnId: target.id, status: derivedStatus(target, columns) },
    });
    summary.tasksAssigned += 1;
  }

  // 3) Configurações de foco (cópia das do usuário, uma por workspace)
  const hasSettings = await tx.pomodoroSettings.findUnique({ where: { workspaceId } });
  if (!hasSettings) {
    const source = legacyPomodoro || { ...FOCUS_DEFAULTS[mode], autoStartNext: true, soundOn: true, defaultChecklist: [], defaultHourlyRate: 0 };
    await tx.pomodoroSettings.create({
      data: {
        userId,
        workspaceId,
        workMin: source.workMin,
        shortBreakMin: source.shortBreakMin,
        longBreakMin: source.longBreakMin,
        cyclesToLongBreak: source.cyclesToLongBreak,
        autoStartNext: source.autoStartNext,
        soundOn: source.soundOn,
        defaultChecklist: source.defaultChecklist ?? [],
        defaultHourlyRate: mode === 'WORK' ? source.defaultHourlyRate ?? 0 : null,
      },
    });
    summary.settingsCreated += 1;
  }

  // 4) Descrições de sessão (cópia das do usuário)
  const presetCount = await tx.sessionDescriptionPreset.count({ where: { workspaceId } });
  if (presetCount === 0 && legacyPresets.length > 0) {
    await tx.sessionDescriptionPreset.createMany({
      data: legacyPresets.map((preset, index) => ({
        userId,
        workspaceId,
        label: preset.label,
        active: preset.active,
        order: index,
      })),
    });
    summary.presetsCreated += legacyPresets.length;
  }

  // 5) Onboarding
  if (!workspace.onboardedAt) {
    await tx.workspace.update({ where: { id: workspaceId }, data: { onboardedAt: new Date() } });
  }
}

async function main() {
  console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}Convertendo workspaces para o modelo por workspace...`);
  const summary = { workspaces: 0, columnsCreated: 0, tasksAssigned: 0, settingsCreated: 0, presetsCreated: 0 };

  try {
    await prisma.$transaction(
      async (tx) => {
        const workspaces = await tx.workspace.findMany({ orderBy: { createdAt: 'asc' } });

        for (const workspace of workspaces) {
          const [board, legacyPomodoro, legacyPresets] = await Promise.all([
            tx.taskBoardSettings.findFirst({ where: { userId: workspace.userId } }),
            tx.pomodoroSettings.findFirst({ where: { userId: workspace.userId, workspaceId: null } }),
            tx.sessionDescriptionPreset.findMany({
              where: { userId: workspace.userId, workspaceId: null, active: true },
              orderBy: { order: 'asc' },
            }),
          ]);
          await processWorkspace(tx, workspace, board, legacyPomodoro, legacyPresets, summary);
          summary.workspaces += 1;
        }

        // Verificação final
        const orphans = await tx.task.count({ where: { columnId: null, project: { workspaceId: { not: null } } } });
        if (orphans > 0) throw new Error(`${orphans} tarefa(s) continuam sem coluna.`);

        const noWorkspace = await tx.task.count({ where: { project: { workspaceId: null } } });
        if (noWorkspace > 0) {
          throw new Error(`${noWorkspace} tarefa(s) pertencem a projetos sem workspace. Rode antes o backfill-owner.`);
        }

        const dones = await tx.boardColumn.groupBy({ by: ['workspaceId'], where: { isDone: true }, _count: true });
        if (dones.length !== workspaces.length || dones.some((row) => row._count !== 1)) {
          throw new Error('Cada workspace deve ter exatamente uma coluna de conclusão.');
        }

        console.log('Resumo:', summary);
        if (DRY_RUN) throw new Rollback();
      },
      { timeout: 120_000, maxWait: 30_000 }
    );
    console.log('Conversão concluída e confirmada.');
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
    console.error('Conversão FALHOU (nada foi gravado):', error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
