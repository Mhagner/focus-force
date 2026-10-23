/** Workspaces (modo WORK/STUDY), filtros e limites. Requer TEST_DATABASE_URL (somente localhost). */
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

describe.skipIf(!TEST_DB)('workspaces', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let ws: typeof import('@/app/api/workspaces/route');
  let wsId: typeof import('@/app/api/workspaces/[id]/route');
  let projects: typeof import('@/app/api/projects/route');
  let tasks: typeof import('@/app/api/tasks/route');
  let sessions: typeof import('@/app/api/sessions/route');
  let plans: typeof import('@/app/api/daily-plans/route');
  let A: { id: string };
  let B: { id: string };
  const tag = randomBytes(4).toString('hex');
  const as = (u: { id: string } | null) => {
    state.session = u ? { user: { id: u.id }, tv: 0 } : null;
  };
  const list = async (res: Response) => (await res.json()) as Json[];

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB!;
    ({ prisma } = await import('@/lib/prisma'));
    ws = await import('@/app/api/workspaces/route');
    wsId = await import('@/app/api/workspaces/[id]/route');
    projects = await import('@/app/api/projects/route');
    tasks = await import('@/app/api/tasks/route');
    sessions = await import('@/app/api/sessions/route');
    plans = await import('@/app/api/daily-plans/route');

    const { bootstrapUser } = await import('@/lib/auth/bootstrap');
    const mk = async (n: string) => {
      const u = await prisma.user.create({ data: { email: `${n}-${tag}@ws.local`, emailVerified: new Date() } });
      await bootstrapUser(u.id); // workspace "Trabalho" + trial Pro
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

  it('novo usuário já tem um workspace WORK; só lista os próprios', async () => {
    as(A);
    const mine = await list(await ws.GET());
    expect(mine).toHaveLength(1);
    expect(mine[0].mode).toBe('WORK');
    as(B);
    expect((await list(await ws.GET())).every((w) => w.userId === B.id)).toBe(true);
  });

  let studyId: string;
  let workId: string;

  it('cria workspace de Estudos; modo inválido e nome vazio são rejeitados', async () => {
    as(A);
    workId = (await list(await ws.GET()))[0].id;
    const created = await ws.POST(req('POST', { name: 'Concurso TRF', mode: 'STUDY' }));
    expect(created.status).toBe(201);
    studyId = ((await created.json()) as Json).id;

    expect((await ws.POST(req('POST', { name: 'x', mode: 'OUTRO' }))).status).toBe(400);
    expect((await ws.POST(req('POST', { name: '  ', mode: 'WORK' }))).status).toBe(400);
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
    expect((await projects.GET(req('GET', undefined, `http://t/api?workspaceId=${studyId}`))).status).toBe(404);
  });

  it('projetos, tarefas e sessões são filtrados por workspace', async () => {
    as(A);
    const pStudy = (await (await projects.POST(req('POST', { name: 'Direito', color: '#111', workspaceId: studyId }))).json()) as Json;
    const pWork = (await (await projects.POST(req('POST', { name: 'Cliente X', color: '#222' }))).json()) as Json;
    expect(pStudy.workspaceId).toBe(studyId);
    expect(pWork.workspaceId).toBe(workId); // sem workspaceId => o mais antigo

    const tStudy = (await (await tasks.POST(req('POST', { projectId: pStudy.id, title: 'Art. 5º' }))).json()) as Json;
    await tasks.POST(req('POST', { projectId: pWork.id, title: 'Reunião' }));
    const now = new Date().toISOString();
    await sessions.POST(req('POST', { projectId: pStudy.id, taskId: tStudy.id, start: now, end: now, durationSec: 60, type: 'manual', notes: 'n' }));
    await sessions.POST(req('POST', { projectId: pWork.id, start: now, end: now, durationSec: 60, type: 'manual', notes: 'n' }));

    const q = (id: string) => `http://t/api?workspaceId=${id}`;
    expect((await list(await projects.GET(req('GET', undefined, q(studyId))))).map((p) => p.name)).toEqual(['Direito']);
    expect((await list(await tasks.GET(req('GET', undefined, q(studyId))))).map((t) => t.title)).toEqual(['Art. 5º']);
    expect(await list(await sessions.GET(req('GET', undefined, q(studyId))))).toHaveLength(1);
    expect((await list(await projects.GET(req('GET', undefined, q(workId))))).map((p) => p.name)).toEqual(['Cliente X']);
    expect(await list(await projects.GET(req('GET', undefined, 'http://t/api')))).toHaveLength(2); // sem filtro: tudo

    // plano diário: salvar num workspace não apaga os blocos do outro
    const day = { dateISO: '2026-03-10', blocks: [] as { projectId: string; targetMinutes: number }[] };
    await plans.POST(req('POST', { ...day, blocks: [{ projectId: pWork.id, targetMinutes: 30 }] }, q(workId)));
    await plans.POST(req('POST', { ...day, blocks: [{ projectId: pStudy.id, targetMinutes: 90 }] }, q(studyId)));
    const onlyStudy = await list(await plans.GET(req('GET', undefined, q(studyId))));
    expect(onlyStudy[0].blocks).toEqual([{ projectId: pStudy.id, targetMinutes: 90 }]);
    const onlyWork = await list(await plans.GET(req('GET', undefined, q(workId))));
    expect(onlyWork[0].blocks).toEqual([{ projectId: pWork.id, targetMinutes: 30 }]);

    // bloco de projeto de outro workspace é recusado
    const bad = await plans.POST(req('POST', { ...day, blocks: [{ projectId: pWork.id, targetMinutes: 5 }] }, q(studyId)));
    expect(bad.status).toBe(400);
  });

  it('não permite arquivar o último workspace ativo', async () => {
    as(A);
    expect((await wsId.PATCH(req('PATCH', { archived: true }), ctx(studyId))).status).toBe(200);
    expect((await wsId.PATCH(req('PATCH', { archived: true }), ctx(workId))).status).toBe(409);
  });

  it('limite do plano: gratuito (ou trial vencido) permite 1 workspace ativo', async () => {
    as(B);
    // trial vencido => cai para o plano gratuito (1 workspace)
    await prisma.subscription.update({ where: { userId: B.id }, data: { trialEndsAt: new Date(Date.now() - 1000) } });
    const res = await ws.POST(req('POST', { name: 'Extra', mode: 'STUDY' }));
    expect(res.status).toBe(402);

    // plano Pro ativo => sem limite
    await prisma.subscription.update({ where: { userId: B.id }, data: { status: 'active', trialEndsAt: null } });
    expect((await ws.POST(req('POST', { name: 'Extra', mode: 'STUDY' }))).status).toBe(201);
  });

  it('estudos não têm Clockfy: o servidor ignora os campos de trabalho e recusa a sincronização', async () => {
    as(A);
    const study = (await (await ws.POST(req('POST', { name: 'Vestibular', mode: 'STUDY' }))).json()) as Json;

    const created = (await (
      await projects.POST(
        req('POST', {
          name: 'Biologia',
          color: '#0a0',
          workspaceId: study.id,
          syncWithClockfy: true,
          clockfyWorkspaceId: 'w1',
          hourlyRate: 150,
          salesforceOppUrl: 'https://x.test',
          sharepointRepoUrl: 'https://y.test',
        })
      )
    ).json()) as Json;
    expect(created.workspaceId).toBe(study.id);
    expect(created.syncWithClockfy).toBe(false);
    expect(created.clockfyWorkspaceId).toBeNull();
    expect(created.hourlyRate).toBeNull();
    expect(created.salesforceOppUrl).toBeNull();
    expect(created.sharepointRepoUrl).toBeNull();

    // PATCH também não consegue ligar o Clockfy nem definir valor/hora
    const projectId = await import('@/app/api/projects/[id]/route');
    const patched = (await (
      await projectId.PATCH(req('PATCH', { syncWithClockfy: true, hourlyRate: 99, name: 'Biologia 2' }), ctx(created.id))
    ).json()) as Json;
    expect(patched.name).toBe('Biologia 2');
    expect(patched.syncWithClockfy).toBe(false);
    expect(patched.hourlyRate).toBeNull();

    // rotas de sincronização recusam projetos de estudo
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
