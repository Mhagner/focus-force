# Migração para multiusuário (autenticação + isolamento por usuário)

Roteiro de implantação. Cada passo é seguro de repetir; o passo 4 só depende de o passo 3 ter sido feito.

## 0. Pré-requisitos

- **Backup do banco de produção** (Neon: crie um *branch* de restauração ou `pg_dump`). Não prossiga sem isso.
- Ensaiar tudo num branch/cópia do banco antes de repetir em produção.

## 1. Variáveis de ambiente (produção)

| Variável | Valor |
|---|---|
| `AUTH_SECRET` | segredo aleatório (`openssl rand -base64 32`) |
| `AUTH_URL` | URL pública do app, ex.: `https://app.seudominio.com` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | credenciais OAuth (também aceita `GOOGLE_CLIENT_ID/SECRET`) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | e-mail transacional (domínio verificado no Resend) |
| `ENCRYPTION_KEY` | 32 bytes em base64 (`openssl rand -base64 32`). **Guarde em cofre: perder a chave inutiliza as chaves Clockfy salvas.** |
| `OWNER_EMAIL` | `m.hagner.sp@gmail.com` (só para o script de backfill) |
| `ALLOW_SIGNUP` | **deixe ausente** até o passo 7 |

Google Cloud Console → Credenciais OAuth → *URI de redirecionamento autorizado*:
`https://<seu-dominio>/api/auth/callback/google` (e `http://localhost:3000/api/auth/callback/google` para dev).

## 2. Migration "expand" (aditiva)

```bash
npx prisma migrate deploy
```

Cria as tabelas novas e adiciona `userId`/`workspaceId` **anuláveis**. Não remove nem altera nada existente; o app antigo continua funcionando.

## 3. Backfill dos dados legados para o seu usuário

```bash
npm run db:backfill-owner -- --dry-run   # confere as contagens; desfaz tudo no final
npm run db:backfill-owner                # grava
```

O script cria o usuário `OWNER_EMAIL` (e-mail já verificado), o workspace "Trabalho", uma assinatura sem limites, vincula todas as linhas sem dono, criptografa a chave Clockfy e **falha sem gravar nada** se sobrar linha sem dono. Se houver mais de uma linha nas tabelas de configuração, ele aborta e pede `--delete-extra-settings`.

## 4. Deploy do código novo

Depois do deploy, **rode o backfill de novo** (é idempotente) para capturar linhas criadas pelo app antigo entre os passos 2 e 4.

## 5. Primeiro acesso do dono

Entre com **Google** usando `m.hagner.sp@gmail.com` (o `User` já existe e fica vinculado à conta Google). Para também ter senha: "Esqueci a senha" na tela de login.

Confira: projetos, tarefas, sessões, plano diário e configurações aparecem como antes.

## 6. Migration "contract" (depois de confirmar o passo 5)

Só depois de validar em produção, tornar `userId` obrigatório (no `schema.prisma` troque `String?` por `String` nos models de domínio e gere a migration), com SQL equivalente a:

```sql
ALTER TABLE "Project" ALTER COLUMN "userId" SET NOT NULL;
-- idem: Task, TaskComment, TaskSubtask, FocusSession, SessionDescriptionPreset,
--       DailyPlan, DailyPlanBlock, PomodoroSettings, ClockfySettings, TaskBoardSettings
```

Antes: `SELECT count(*) FROM "Project" WHERE "userId" IS NULL;` (e demais tabelas) deve dar 0.

Remova também `ACCESS_CODE` do ambiente (o login por código foi eliminado).

## 7. Abrir cadastros

Defina `ALLOW_SIGNUP=true` somente depois de: isolamento verificado em produção com uma 2ª conta de teste, e-mails chegando (Resend), Termos de Uso e Política de Privacidade publicados (hoje o cadastro só exibe o aceite; as páginas ainda não existem).

## Testes

```bash
npm test                                   # unitários (sem banco)
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/ff_test npm test   # inclui isolamento e auth com banco
```

`TEST_DATABASE_URL` só é aceito se apontar para `localhost`/`127.0.0.1`.
