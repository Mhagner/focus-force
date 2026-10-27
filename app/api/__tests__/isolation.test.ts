/**
 * Teste de isolamento multi-tenant: chama os route handlers reais contra um Postgres de teste.
 * Roda só com TEST_DATABASE_URL (apenas localhost/127.0.0.1, nunca produção) e com o schema já migrado:
 *   TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/ff_test npx vitest run
 */
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;
const enabled = Boolean(TEST_DB);

if (TEST_DB && !/@(localhost|127\.0\.0\.1)[:/]/.test(TEST_DB)) {
  throw new Error('TEST_DATABASE_URL deve apontar para localhost/127.0.0.1.');
}

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string }; tv: number },
}));

vi.mock('@/auth', () => ({ auth: async () => state.session }));

type Json = any;
const withWs = (workspaceId: string, method = 'GET', body?: unknown) =>
  new Request(`http://test.local/api?workspaceId=${workspaceId}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = (id: string, extra: Record<string, string> = {}) => ({ params: Promise.resolve({ id, ...extra }) });
const jsonReq = (method: string, body?: unknown) =>
  new Request('http://test.local/api', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe.skipIf(!enabled)('isolamento entre usuários (rotas /api)', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let A: { id: string };
  let B: { id: string };
  let wsA: string;
  let wsB: string;
  let projectA: string;
  let taskA: string;
  let sessionA: string;
  let presetA: string;
  const tag = randomBytes(4).toString('hex');

  const as = (user: { id: string } | null, tv = 0) => {
    state.session = user ? { user: { id: user.id }, tv } : null;
  };

  const routes = async () => ({
    projects: await import('@/app/api/projects/route'),
    project: await import('@/app/api/projects/[id]/route'),
    tasks: await import('@/app/api/tasks/route'),
    task: await import('@/app/api/tasks/[id]/route'),
    comments: await import('@/app/api/tasks/[id]/comments/route'),
    subtasks: await import('@/app/api/tasks/[id]/subtasks/route'),
    sessions: await import('@/app/api/sessions/route'),
    session: await import('@/app/api/sessions/[id]/route'),
    presets: await import('@/app/api/session-description-presets/route'),
    preset: await import('@/app/api/session-description-presets/[id]/route'),
    plans: await import('@/app/api/daily-plans/route'),
    settings: await import('@/app/api/settings/route'),
    board: await import('@/app/api/settings/tasks-board/route'),
    clockfy: await import('@/app/api/integrations/clockfy/route'),
  });
  let r: Awaited<ReturnType<typeof routes>>;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB!;
    process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64');
    ({ prisma } = await import('@/lib/prisma'));
    r = await routes();

    const mk = async (n: string) => {
      const u = await prisma.user.create({
        data: { email: `${n}-${tag}@test.local`, emailVerified: new Date() },
      });
      const { createWorkspaceWithSetup } = await import('@/lib/workspace/create');
      const workspace = await createWorkspaceWithSetup(u.id, { name: 'Trabalho', mode: 'WORK' });
      return { user: u, workspaceId: workspace.id };
    };
    const madeA = await mk('a');
    const madeB = await mk('b');
    A = madeA.user;
    B = madeB.user;
    wsA = madeA.workspaceId;
    wsB = madeB.workspaceId;

    as(A);
    projectA = (await (await r.projects.POST(jsonReq('POST', { name: 'Proj A', color: '#000' }))).json()).id;
    taskA = (await (await r.tasks.POST(jsonReq('POST', { projectId: projectA, title: 'Tarefa A' }))).json()).id;
    sessionA = (
      await (
        await r.sessions.POST(
          jsonReq('POST', {
            projectId: projectA,
            taskId: taskA,
            start: new Date().toISOString(),
            end: new Date().toISOString(),
            durationSec: 60,
            type: 'manual',
            notes: 'x',
          })
        )
      ).json()
    ).id;
    presetA = (await (await r.presets.POST(jsonReq('POST', { workspaceId: wsA, label: 'preset A' }))).json()).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    const ids = [A?.id, B?.id].filter(Boolean) as string[];
    await prisma.focusSession.deleteMany({ where: { userId: { in: ids } } });
    await prisma.dailyPlanBlock.deleteMany({ where: { userId: { in: ids } } });
    await prisma.dailyPlan.deleteMany({ where: { userId: { in: ids } } });
    await prisma.task.deleteMany({ where: { userId: { in: ids } } });
    await prisma.project.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('controle positivo: A enxerga os próprios dados', async () => {
    as(A);
    expect(((await (await r.projects.GET(jsonReq("GET"))).json()) as Json[]).map((p) => p.id)).toContain(projectA);
    expect(((await (await r.tasks.GET(jsonReq("GET"))).json()) as Json[]).map((t) => t.id)).toContain(taskA);
    expect(((await (await r.sessions.GET(jsonReq("GET"))).json()) as Json[]).map((s) => s.id)).toContain(sessionA);
  });

  it('sem sessão: toda rota responde 401', async () => {
    as(null);
    const responses = await Promise.all([
      r.projects.GET(jsonReq("GET")),
      r.tasks.GET(jsonReq("GET")),
      r.sessions.GET(jsonReq("GET")),
      r.presets.GET(jsonReq('GET')),
      r.plans.GET(jsonReq("GET")),
      r.settings.GET(jsonReq('GET')),
      r.board.GET(),
      r.clockfy.GET(jsonReq('GET')),
      r.project.DELETE(jsonReq('DELETE'), ctx(projectA)),
    ]);
    expect(responses.map((res) => res.status)).toEqual(Array(responses.length).fill(401));
  });

  it('sessão com tokenVersion defasado (senha trocada) é rejeitada', async () => {
    as(A, 99);
    expect((await r.projects.GET(jsonReq("GET"))).status).toBe(401);
  });

  it('B não vê nenhum dado de A nas listagens', async () => {
    as(B);
    expect(await (await r.projects.GET(jsonReq("GET"))).json()).toEqual([]);
    expect(await (await r.tasks.GET(jsonReq("GET"))).json()).toEqual([]);
    expect(await (await r.sessions.GET(jsonReq("GET"))).json()).toEqual([]);
    // B tem as próprias descrições padrão, mas nunca a de A
    const labelsB = ((await (await r.presets.GET(withWs(wsB))).json()) as Json[]).map((preset) => preset.label);
    expect(labelsB).not.toContain('preset A');
    // e não consegue listar as descrições/configurações de um workspace de A
    expect((await r.presets.GET(withWs(wsA))).status).toBe(404);
    expect((await r.settings.GET(withWs(wsA))).status).toBe(404);
    expect(await (await r.plans.GET(jsonReq("GET"))).json()).toEqual([]);
    expect(await (await r.subtasks.GET(jsonReq('GET'), ctx(taskA))).json()).toEqual([]);
  });

  it('B não consegue ler/alterar/apagar recursos de A pelo ID (404)', async () => {
    as(B);
    const attempts = await Promise.all([
      r.project.PATCH(jsonReq('PATCH', { name: 'hack' }), ctx(projectA)),
      r.project.DELETE(jsonReq('DELETE'), ctx(projectA)),
      r.task.PATCH(jsonReq('PATCH', { title: 'hack' }), ctx(taskA)),
      r.task.DELETE(jsonReq('DELETE'), ctx(taskA)),
      r.comments.POST(jsonReq('POST', { message: 'oi' }), ctx(taskA)),
      r.subtasks.POST(jsonReq('POST', { title: 'oi' }), ctx(taskA)),
      r.session.PATCH(jsonReq('PATCH', { notes: 'hack' }), ctx(sessionA)),
      r.session.DELETE(jsonReq('DELETE'), ctx(sessionA)),
      r.preset.PATCH(jsonReq('PATCH', { label: 'hack' }), ctx(presetA)),
      r.preset.DELETE(jsonReq('DELETE'), ctx(presetA)),
    ]);
    expect(attempts.map((res) => res.status)).toEqual(Array(attempts.length).fill(404));

    // e nada mudou para A
    as(A);
    const projects = (await (await r.projects.GET(jsonReq("GET"))).json()) as Json[];
    expect(projects.find((p) => p.id === projectA)?.name).toBe('Proj A');
    expect(await prisma.task.count({ where: { id: taskA } })).toBe(1);
    expect(await prisma.focusSession.count({ where: { id: sessionA } })).toBe(1);
  });

  it('B não consegue criar filhos apontando para projeto/tarefa de A', async () => {
    as(B);
    const attempts = await Promise.all([
      r.tasks.POST(jsonReq('POST', { projectId: projectA, title: 'invasão' })),
      r.sessions.POST(
        jsonReq('POST', {
          projectId: projectA,
          start: new Date().toISOString(),
          durationSec: 1,
          type: 'manual',
          notes: 'x',
        })
      ),
      r.plans.POST(jsonReq('POST', { dateISO: '2026-01-01', blocks: [{ projectId: projectA, targetMinutes: 30 }] })),
      r.projects.POST(jsonReq('POST', { name: 'x', color: '#000', workspaceId: 'inexistente' })),
    ]);
    expect(attempts.map((res) => res.status)).toEqual([404, 404, 404, 404]);
  });

  it('mass assignment: userId/clockfyTimeEntryId no corpo do PATCH são ignorados', async () => {
    as(A);
    const res = await r.session.PATCH(
      jsonReq('PATCH', { notes: 'ok', userId: B.id, clockfyTimeEntryId: 'forjado', id: 'outro' }),
      ctx(sessionA)
    );
    expect(res.status).toBe(200);
    const row = await prisma.focusSession.findUniqueOrThrow({ where: { id: sessionA } });
    expect(row.userId).toBe(A.id);
    expect(row.clockfyTimeEntryId).toBeNull();
    expect(row.notes).toBe('ok');
  });

  it('configurações de foco são por workspace e por usuário', async () => {
    as(A);
    await r.settings.PATCH(
      withWs(wsA, 'PATCH', {
        workMin: 25,
        shortBreakMin: 5,
        longBreakMin: 15,
        cyclesToLongBreak: 4,
        autoStartNext: false,
        soundOn: false,
        defaultChecklist: [],
      })
    );
    as(B);
    const settingsB = (await (await r.settings.GET(withWs(wsB))).json()) as Json;
    expect(settingsB.workMin).toBe(50); // padrão de Trabalho, não os 25 de A
    expect(settingsB.userId).toBe(B.id);
    expect(settingsB.workspaceId).toBe(wsB);
    // B não escreve nas configurações do workspace de A
    expect((await r.settings.PATCH(withWs(wsA, 'PATCH', { workMin: 1, shortBreakMin: 1, longBreakMin: 1, cyclesToLongBreak: 1, autoStartNext: true, soundOn: true, defaultChecklist: [] }))).status).toBe(404);
  });

  it('Clockfy: configuração por workspace, chave criptografada e nunca devolvida; B não a vê', async () => {
    as(A);
    const saved = (await (
      await r.clockfy.PATCH(withWs(wsA, 'PATCH', { apiKey: 'ckey_SEGREDO_DE_A', workspaces: [{ id: 'w1' }] }))
    ).json()) as Json;
    expect(saved.apiKey).toBe('');
    expect(saved.hasApiKey).toBe(true);
    expect(JSON.stringify(saved)).not.toContain('SEGREDO');

    const row = await prisma.clockfySettings.findUniqueOrThrow({ where: { appWorkspaceId: wsA } });
    expect(row.userId).toBe(A.id);
    expect(row.apiKey?.startsWith('v1:')).toBe(true);
    expect(row.apiKey).not.toContain('SEGREDO');

    // salvar de novo sem apiKey mantém a chave
    await r.clockfy.PATCH(withWs(wsA, 'PATCH', { workspaces: [{ id: 'w1' }, { id: 'w2' }] }));
    const kept = await prisma.clockfySettings.findUniqueOrThrow({ where: { appWorkspaceId: wsA } });
    expect(kept.apiKey).toBe(row.apiKey);

    // outro workspace do mesmo usuário não herda a configuração
    const other = await prisma.workspace.create({ data: { userId: A.id, name: 'Outro A' } });
    const forOther = (await (await r.clockfy.GET(withWs(other.id))).json()) as Json;
    expect(forOther.hasApiKey).toBe(false);
    expect(forOther.workspaces).toEqual([]);

    // sem workspace informado a rota recusa
    expect((await r.clockfy.GET(jsonReq('GET'))).status).toBe(400);

    as(B);
    const forB = (await (await r.clockfy.GET(withWs(wsB))).json()) as Json;
    expect(forB.hasApiKey).toBe(false);
    expect(forB.workspaces).toEqual([]);
    // B não lê nem escreve na configuração do workspace de A
    expect((await r.clockfy.GET(withWs(wsA))).status).toBe(404);
    expect((await r.clockfy.PATCH(withWs(wsA, 'PATCH', { apiKey: 'x' }))).status).toBe(404);
  });

  it('erros internos não vazam detalhes (corpo inválido → 400 genérico)', async () => {
    as(A);
    const res = await r.projects.POST(jsonReq('POST', { name: '' }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as Json;
    expect(body.message).toBe('Dados inválidos.');
    expect(JSON.stringify(body)).not.toMatch(/prisma|invocation|stack/i);
  });
});
