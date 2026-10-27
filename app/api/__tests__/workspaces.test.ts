/** Workspaces: criação com onboarding, defaults por tipo, isolamento de configurações, filtros e limites. */
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;

if (TEST_DB && !/@(localhost|127\.0\.0\.1)[:/]/.test(TEST_DB)) {
  throw new Error('TEST_DATABASE_URL deve apontar para localhost/127.0.0.1.');
}

const state = vi.hoisted(() => ({ session: null as null | { user: { id: string }; tv: number } }));
vi.mock('@/auth', () => ({ auth: async () => state.session }));

type Json = any;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (method: string, body?: unknown, url = 'http://test.local/api') =>
  new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const q = (workspaceId: string) => `http://t/api?workspaceId=${workspaceId}`;

describe.skipIf(!TEST_DB)('workspaces', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let ws: typeof import('@/app/api/workspaces/route');
  let wsId: typeof import('@/app/api/workspaces/[id]/route');
  let limits: typeof import('@/app/api/workspaces/limits/route');
  let projects: typeof import('@/app/api/projects/route');
  let tasks: typeof import('@/app/api/tasks/route');
  let sessions: typeof import('@/app/api/sessions/route');
  let plans: typeof import('@/app/api/daily-plans/route');
  let settings: typeof import('@/app/api/settings/route');
  let presets: typeof import('@/app/api/session-description-presets/route');
  let columnsApi: typeof import('@/app/api/columns/route');
  let A: { id: string };
  let B: { id: string };
  const tag = randomBytes(4).toString('hex');
  const as = (u: { id: string } | null) => {
    state.session = u ? { user: { id: u.id }, tv: 0 } : null;
  };
  const list = async (res: Response) => (await res.json()) as Json[];
  const colTitles = async (workspaceId: string) =>
    (await list(await columnsApi.GET(req('GET', undefined, q(workspaceId))))).map((c) => c.title);

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB!;
    ({ prisma } = await import('@/lib/prisma'));
    ws = await import('@/app/api/workspaces/route');
    wsId = await import('@/app/api/workspaces/[id]/route');
    limits = await import('@/app/api/workspaces/limits/route');
    projects = await import('@/app/api/projects/route');
    tasks = await import('@/app/api/tasks/route');
    sessions = await import('@/app/api/sessions/route');
    plans = await import('@/app/api/daily-plans/route');
    settings = await import('@/app/api/settings/route');
    presets = await import('@/app/api/session-description-presets/route');
    columnsApi = await import('@/app/api/columns/route');

    const { bootstrapUser } = await import('@/lib/auth/bootstrap');
    const mk = async (n: string) => {
      const u = await prisma.user.create({ data: { email: `${n}-${tag}@ws.local`, emailVerified: new Date() } });
      await bootstrapUser(u.id); // só a assinatura em trial: o workspace nasce no onboarding
      return u;
    };
    A = await mk('a');
    B = await mk('b');
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

  it('usuário novo não tem workspace: GET devolve lista vazia e NÃO cria nada', async () => {
    as(A);
    expect(await list(await ws.GET())).toEqual([]);
    expect(await list(await ws.GET())).toEqual([]);
    expect(await prisma.workspace.count({ where: { userId: A.id } })).toBe(0);
    expect(((await (await limits.GET()).json()) as Json).canCreate).toBe(true);
  });

  let workId: string;
  let studyId: string;

  it('cria workspace de Trabalho só com nome e tipo: usa os padrões do tipo', async () => {
    as(A);
    const res = await ws.POST(req('POST', { name: 'Meu trabalho', mode: 'WORK' }));
    expect(res.status).toBe(201);
    const created = (await res.json()) as Json;
    workId = created.id;
    expect(created.onboardedAt).toBeTruthy();

    expect(await colTitles(workId)).toEqual(['Backlog', 'Em andamento', 'Concluído']);
    const cols = await list(await columnsApi.GET(req('GET', undefined, q(workId))));
    expect(cols.filter((c) => c.isDone)).toHaveLength(1);
    expect(cols[2].isDone).toBe(true);

    const focus = (await (await settings.GET(req('GET', undefined, q(workId)))).json()) as Json;
    expect([focus.workMin, focus.shortBreakMin, focus.longBreakMin, focus.cyclesToLongBreak]).toEqual([50, 10, 20, 3]);

    const labels = (await list(await presets.GET(req('GET', undefined, q(workId))))).map((p) => p.label);
    expect(labels).toEqual(['Reunião e alinhamento', 'Desenvolvimento e execução', 'Planejamento e documentação']);
  });

  it('cria workspace de Estudos: colunas, foco e descrições próprios do tipo, sem valor/hora', async () => {
    as(A);
    const created = (await (await ws.POST(req('POST', { name: 'Concurso TRF', mode: 'STUDY' }))).json()) as Json;
    studyId = created.id;

    expect(await colTitles(studyId)).toEqual(['A estudar', 'Teoria', 'Exercícios', 'Revisão', 'Dominado']);
    const focus = (await (await settings.GET(req('GET', undefined, q(studyId)))).json()) as Json;
    expect([focus.workMin, focus.shortBreakMin, focus.longBreakMin, focus.cyclesToLongBreak]).toEqual([25, 5, 15, 4]);
    expect(focus.defaultHourlyRate).toBeNull();
    const labels = (await list(await presets.GET(req('GET', undefined, q(studyId))))).map((p) => p.label);
    expect(labels).toEqual(['Aula e leitura teórica', 'Resolução de questões', 'Revisão e resumos']);
  });

  it('o novo workspace NÃO herda nada do outro (configurações, descrições, colunas)', async () => {
    as(A);
    // mexe só no workspace de trabalho
    await settings.PATCH(
      req('PATCH', { workMin: 33, shortBreakMin: 7, longBreakMin: 17, cyclesToLongBreak: 2, autoStartNext: false, soundOn: false, defaultChecklist: ['x'], defaultHourlyRate: 80 }, q(workId))
    );
    await presets.POST(req('POST', { workspaceId: workId, label: 'Só do trabalho' }));
    await columnsApi.POST(req('POST', { workspaceId: workId, title: 'Aguardando cliente' }));

    // novo workspace de trabalho criado depois: volta aos padrões, não copia o anterior
    const fresh = (await (await ws.POST(req('POST', { name: 'Freela', mode: 'WORK' }))).json()) as Json;
    const focus = (await (await settings.GET(req('GET', undefined, q(fresh.id)))).json()) as Json;
    expect([focus.workMin, focus.shortBreakMin, focus.autoStartNext, focus.soundOn]).toEqual([50, 10, true, true]);
    expect(focus.defaultChecklist).toEqual([]);
    expect(await colTitles(fresh.id)).toEqual(['Backlog', 'Em andamento', 'Concluído']);
    const labels = (await list(await presets.GET(req('GET', undefined, q(fresh.id))))).map((p) => p.label);
    expect(labels).not.toContain('Só do trabalho');

    // e o de estudos continua intacto
    expect(await colTitles(studyId)).toEqual(['A estudar', 'Teoria', 'Exercícios', 'Revisão', 'Dominado']);
    await prisma.workspace.update({ where: { id: fresh.id }, data: { archived: true } }); // libera para os próximos testes
  });

  it('aceita configuração personalizada do onboarding e a grava exatamente como enviada', async () => {
    as(A);
    const created = (await (
      await ws.POST(
        req('POST', {
          name: 'Vestibular',
          mode: 'STUDY',
          settings: { workMin: 40, shortBreakMin: 8, longBreakMin: 20, cyclesToLongBreak: 3, autoStartNext: false, soundOn: true, defaultChecklist: ['Ler', 'Resumir'] },
          columns: [
            { title: 'Fila', isDone: false },
            { title: 'Estudando', isDone: false },
            { title: 'Pronto', isDone: true },
          ],
          presets: ['Aula', 'Simulado'],
        })
      )
    ).json()) as Json;

    expect(await colTitles(created.id)).toEqual(['Fila', 'Estudando', 'Pronto']);
    const focus = (await (await settings.GET(req('GET', undefined, q(created.id)))).json()) as Json;
    expect([focus.workMin, focus.autoStartNext, focus.defaultChecklist]).toEqual([40, false, ['Ler', 'Resumir']]);
    expect((await list(await presets.GET(req('GET', undefined, q(created.id))))).map((p) => p.label)).toEqual(['Aula', 'Simulado']);
    await prisma.workspace.update({ where: { id: created.id }, data: { archived: true } });
  });

  it('colunas inválidas são recusadas (400) e nada é criado', async () => {
    as(A);
    const before = await prisma.workspace.count({ where: { userId: A.id } });
    const bad = [
      [{ title: 'Só uma', isDone: true }],
      [{ title: 'A', isDone: false }, { title: 'B', isDone: false }],
      [{ title: 'A', isDone: true }, { title: 'B', isDone: true }],
      [{ title: '   ', isDone: false }, { title: 'B', isDone: true }],
    ];
    for (const columns of bad) {
      const res = await ws.POST(req('POST', { name: 'Inválido', mode: 'WORK', columns }));
      expect(res.status).toBe(400);
    }
    expect(await prisma.workspace.count({ where: { userId: A.id } })).toBe(before);
  });

  it('o modo é imutável: PATCH com mode é ignorado; renomear funciona', async () => {
    as(A);
    const res = await wsId.PATCH(req('PATCH', { name: 'TRF 2026', mode: 'WORK' }), ctx(studyId));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.name).toBe('TRF 2026');
    expect(body.mode).toBe('STUDY');
  });

  it('B não consegue alterar nem usar o workspace de A', async () => {
    as(B);
    expect((await wsId.PATCH(req('PATCH', { name: 'hack' }), ctx(studyId))).status).toBe(404);
    expect((await projects.POST(req('POST', { name: 'x', color: '#000', workspaceId: studyId }))).status).toBe(404);
    expect((await projects.GET(req('GET', undefined, q(studyId)))).status).toBe(404);
    expect((await columnsApi.GET(req('GET', undefined, q(studyId)))).status).toBe(404);
    expect((await settings.GET(req('GET', undefined, q(studyId)))).status).toBe(404);
  });

  it('projetos, tarefas e sessões são filtrados por workspace', async () => {
    as(A);
    const pStudy = (await (await projects.POST(req('POST', { name: 'Direito', color: '#111', workspaceId: studyId }))).json()) as Json;
    const pWork = (await (await projects.POST(req('POST', { name: 'Cliente X', color: '#222', workspaceId: workId }))).json()) as Json;
    expect(pStudy.workspaceId).toBe(studyId);
    expect(pWork.workspaceId).toBe(workId);

    const tStudy = (await (await tasks.POST(req('POST', { projectId: pStudy.id, title: 'Art. 5º' }))).json()) as Json;
    await tasks.POST(req('POST', { projectId: pWork.id, title: 'Reunião' }));
    const now = new Date().toISOString();
    await sessions.POST(req('POST', { projectId: pStudy.id, taskId: tStudy.id, start: now, end: now, durationSec: 60, type: 'manual', notes: 'n' }));
    await sessions.POST(req('POST', { projectId: pWork.id, start: now, end: now, durationSec: 60, type: 'manual', notes: 'n' }));

    expect((await list(await projects.GET(req('GET', undefined, q(studyId))))).map((p) => p.name)).toEqual(['Direito']);
    expect((await list(await tasks.GET(req('GET', undefined, q(studyId))))).map((t) => t.title)).toEqual(['Art. 5º']);
    expect(await list(await sessions.GET(req('GET', undefined, q(studyId))))).toHaveLength(1);
    expect((await list(await projects.GET(req('GET', undefined, q(workId))))).map((p) => p.name)).toEqual(['Cliente X']);

    // plano diário: salvar num workspace não apaga os blocos do outro
    const day = { dateISO: '2026-03-10', blocks: [] as { projectId: string; targetMinutes: number }[] };
    await plans.POST(req('POST', { ...day, blocks: [{ projectId: pWork.id, targetMinutes: 30 }] }, q(workId)));
    await plans.POST(req('POST', { ...day, blocks: [{ projectId: pStudy.id, targetMinutes: 90 }] }, q(studyId)));
    const onlyStudy = await list(await plans.GET(req('GET', undefined, q(studyId))));
    expect(onlyStudy[0].blocks).toEqual([{ projectId: pStudy.id, targetMinutes: 90 }]);
    const onlyWork = await list(await plans.GET(req('GET', undefined, q(workId))));
    expect(onlyWork[0].blocks).toEqual([{ projectId: pWork.id, targetMinutes: 30 }]);
    const bad = await plans.POST(req('POST', { ...day, blocks: [{ projectId: pWork.id, targetMinutes: 5 }] }, q(studyId)));
    expect(bad.status).toBe(400);
  });

  it('não permite arquivar o último workspace ativo', async () => {
    as(A);
    await prisma.workspace.updateMany({ where: { userId: A.id, id: { notIn: [workId, studyId] } }, data: { archived: true } });
    expect((await wsId.PATCH(req('PATCH', { archived: true }), ctx(studyId))).status).toBe(200);
    expect((await wsId.PATCH(req('PATCH', { archived: true }), ctx(workId))).status).toBe(409);
    await wsId.PATCH(req('PATCH', { archived: false }), ctx(studyId));
  });

  it('limite do plano: trial vencido (gratuito) permite 1 workspace ativo e não cria nada parcial', async () => {
    as(B);
    const first = await ws.POST(req('POST', { name: 'Primeiro', mode: 'WORK' }));
    expect(first.status).toBe(201); // o primeiro workspace é sempre permitido

    await prisma.subscription.update({ where: { userId: B.id }, data: { trialEndsAt: new Date(Date.now() - 1000) } });
    const info = (await (await limits.GET()).json()) as Json;
    expect([info.max, info.used, info.canCreate]).toEqual([1, 1, false]);

    const columnsBefore = await prisma.boardColumn.count({ where: { userId: B.id } });
    const res = await ws.POST(req('POST', { name: 'Extra', mode: 'STUDY' }));
    expect(res.status).toBe(402);
    expect(await prisma.boardColumn.count({ where: { userId: B.id } })).toBe(columnsBefore);

    await prisma.subscription.update({ where: { userId: B.id }, data: { status: 'active', trialEndsAt: null } });
    expect((await ws.POST(req('POST', { name: 'Extra', mode: 'STUDY' }))).status).toBe(201);
  });

  it('estudos não têm Clockfy: o servidor ignora os campos de trabalho e recusa a sincronização', async () => {
    as(A);
    const created = (await (
      await projects.POST(
        req('POST', {
          name: 'Biologia',
          color: '#0a0',
          workspaceId: studyId,
          syncWithClockfy: true,
          clockfyWorkspaceId: 'w1',
          hourlyRate: 150,
          salesforceOppUrl: 'https://x.test',
          sharepointRepoUrl: 'https://y.test',
        })
      )
    ).json()) as Json;
    expect(created.workspaceId).toBe(studyId);
    expect(created.syncWithClockfy).toBe(false);
    expect(created.clockfyWorkspaceId).toBeNull();
    expect(created.hourlyRate).toBeNull();
    expect(created.salesforceOppUrl).toBeNull();
    expect(created.sharepointRepoUrl).toBeNull();

    const projectId = await import('@/app/api/projects/[id]/route');
    const patched = (await (
      await projectId.PATCH(req('PATCH', { syncWithClockfy: true, hourlyRate: 99, name: 'Biologia 2' }), ctx(created.id))
    ).json()) as Json;
    expect(patched.name).toBe('Biologia 2');
    expect(patched.syncWithClockfy).toBe(false);
    expect(patched.hourlyRate).toBeNull();

    const task = (await (await tasks.POST(req('POST', { projectId: created.id, title: 'Células' }))).json()) as Json;
    const now = new Date().toISOString();
    const session = (await (
      await sessions.POST(req('POST', { projectId: created.id, taskId: task.id, start: now, end: now, durationSec: 60, type: 'manual', notes: 'n' }))
    ).json()) as Json;

    const sessionSync = await import('@/app/api/sessions/[id]/sync-clockfy/route');
    const taskSync = await import('@/app/api/tasks/[id]/sync-clockfy/route');
    expect((await sessionSync.POST(req('POST'), ctx(session.id))).status).toBe(400);
    expect((await taskSync.POST(req('POST'), ctx(task.id))).status).toBe(400);
  });
});
