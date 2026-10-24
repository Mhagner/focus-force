/** Colunas por workspace: CRUD, reordenação, coluna de conclusão e status derivado das tarefas. */
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

describe.skipIf(!TEST_DB)('colunas e tarefas', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let cols: typeof import('@/app/api/columns/route');
  let colId: typeof import('@/app/api/columns/[id]/route');
  let reorder: typeof import('@/app/api/columns/reorder/route');
  let projects: typeof import('@/app/api/projects/route');
  let tasks: typeof import('@/app/api/tasks/route');
  let task: typeof import('@/app/api/tasks/[id]/route');
  let A: { id: string };
  let B: { id: string };
  let wsStudy: string;
  let wsWork: string;
  let projStudy: string;
  let projWork: string;
  const tag = randomBytes(4).toString('hex');
  const as = (u: { id: string } | null) => {
    state.session = u ? { user: { id: u.id }, tv: 0 } : null;
  };

  const getCols = async (workspaceId: string) =>
    (await (await cols.GET(req('GET', undefined, q(workspaceId)))).json()) as Json[];
  const byTitle = async (workspaceId: string, title: string) => (await getCols(workspaceId)).find((c) => c.title === title)!;
  const newTask = async (projectId: string, extra: Record<string, unknown> = {}) =>
    (await (await tasks.POST(req('POST', { projectId, title: `t-${Math.random().toString(36).slice(2, 7)}`, ...extra }))).json()) as Json;
  const move = async (id: string, body: Record<string, unknown>) => {
    const res = await task.PATCH(req('PATCH', body), ctx(id));
    return { res, body: (await res.json()) as Json };
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB!;
    ({ prisma } = await import('@/lib/prisma'));
    cols = await import('@/app/api/columns/route');
    colId = await import('@/app/api/columns/[id]/route');
    reorder = await import('@/app/api/columns/reorder/route');
    projects = await import('@/app/api/projects/route');
    tasks = await import('@/app/api/tasks/route');
    task = await import('@/app/api/tasks/[id]/route');

    const { createWorkspaceWithSetup } = await import('@/lib/workspace/create');
    const mk = (n: string) => prisma.user.create({ data: { email: `${n}-${tag}@col.local`, emailVerified: new Date() } });
    A = await mk('a');
    B = await mk('b');
    wsStudy = (await createWorkspaceWithSetup(A.id, { name: 'Estudos', mode: 'STUDY' })).id;
    wsWork = (await createWorkspaceWithSetup(A.id, { name: 'Trabalho', mode: 'WORK' })).id;

    as(A);
    projStudy = ((await (await projects.POST(req('POST', { name: 'Direito', color: '#111', workspaceId: wsStudy }))).json()) as Json).id;
    projWork = ((await (await projects.POST(req('POST', { name: 'Cliente', color: '#222', workspaceId: wsWork }))).json()) as Json).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    const ids = [A?.id, B?.id].filter(Boolean) as string[];
    await prisma.task.deleteMany({ where: { userId: { in: ids } } });
    await prisma.project.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it('lista na ordem; exige workspaceId; outro usuário recebe 404', async () => {
    as(A);
    expect((await getCols(wsStudy)).map((c) => c.title)).toEqual(['A estudar', 'Teoria', 'Exercícios', 'Revisão', 'Dominado']);
    expect((await cols.GET(req('GET'))).status).toBe(400);
    as(B);
    expect((await cols.GET(req('GET', undefined, q(wsStudy)))).status).toBe(404);
  });

  it('nova coluna entra antes da conclusão e as posições continuam contíguas', async () => {
    as(A);
    const res = await cols.POST(req('POST', { workspaceId: wsStudy, title: 'Simulados' }));
    expect(res.status).toBe(201);
    const list = await getCols(wsStudy);
    expect(list.map((c) => c.title)).toEqual(['A estudar', 'Teoria', 'Exercícios', 'Revisão', 'Simulados', 'Dominado']);
    expect(list.map((c) => c.position)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(list.filter((c) => c.isDone)).toHaveLength(1);
    expect((await cols.POST(req('POST', { workspaceId: wsStudy, title: '  ' }))).status).toBe(400);
  });

  it('renomear funciona e não dá para desmarcar/mudar a coluna de conclusão', async () => {
    as(A);
    const done = await byTitle(wsStudy, 'Dominado');
    const res = await colId.PATCH(req('PATCH', { title: 'Dominei', isDone: false }), ctx(done.id));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.title).toBe('Dominei');
    expect(body.isDone).toBe(true); // o campo isDone enviado é ignorado
    await colId.PATCH(req('PATCH', { title: 'Dominado' }), ctx(done.id));

    expect((await colId.PATCH(req('PATCH', { title: '' }), ctx(done.id))).status).toBe(400);
    as(B);
    expect((await colId.PATCH(req('PATCH', { title: 'hack' }), ctx(done.id))).status).toBe(404);
  });

  it('tarefa nova entra na primeira coluna; coluna de outro workspace é recusada', async () => {
    as(A);
    const t = await newTask(projStudy);
    const first = await byTitle(wsStudy, 'A estudar');
    expect([t.columnId, t.status]).toEqual([first.id, 'todo']);

    const foreign = await byTitle(wsWork, 'Backlog');
    expect((await tasks.POST(req('POST', { projectId: projStudy, title: 'x', columnId: foreign.id }))).status).toBe(400);
  });

  it('mover entre colunas deriva o status; entrar na conclusão carimba e sair limpa', async () => {
    as(A);
    const t = await newTask(projStudy, { plannedFor: 'today' });
    const teoria = await byTitle(wsStudy, 'Teoria');
    const dominado = await byTitle(wsStudy, 'Dominado');
    const aEstudar = await byTitle(wsStudy, 'A estudar');

    let r = await move(t.id, { columnId: teoria.id });
    expect([r.body.columnId, r.body.status, r.body.completedAt]).toEqual([teoria.id, 'doing', null]);
    expect(r.body.plannedFor).toBe('today'); // seguir em andamento mantém no Meu Dia

    r = await move(t.id, { columnId: dominado.id });
    expect(r.body.status).toBe('done');
    expect(r.body.completedAt).toBeTruthy();
    expect(r.body.plannedFor).toBeNull(); // concluir tira do Meu Dia

    r = await move(t.id, { columnId: aEstudar.id });
    expect([r.body.status, r.body.completedAt]).toEqual(['todo', null]);
  });

  it('status legado (Meu Dia, TaskCard, guarda de conclusão) é traduzido para as colunas', async () => {
    as(A);
    const t = await newTask(projWork);
    const cols3 = await getCols(wsWork); // Backlog, Em andamento, Concluído

    let r = await move(t.id, { status: 'done' });
    expect([r.body.columnId, r.body.status]).toEqual([cols3[2].id, 'done']);
    r = await move(t.id, { status: 'todo' });
    expect([r.body.columnId, r.body.status]).toEqual([cols3[0].id, 'todo']);
    r = await move(t.id, { status: 'doing' });
    expect([r.body.columnId, r.body.status]).toEqual([cols3[1].id, 'doing']);
  });

  it('coluna inválida ao mover é 400; outro usuário não move tarefa alheia (404)', async () => {
    as(A);
    const t = await newTask(projStudy);
    const foreign = await byTitle(wsWork, 'Backlog');
    expect((await move(t.id, { columnId: foreign.id })).res.status).toBe(400);
    as(B);
    const mine = await byTitle(wsStudy, 'Teoria').catch(() => null);
    expect(mine).toBeNull(); // B nem consegue listar as colunas de A
    expect((await task.PATCH(req('PATCH', { title: 'hack' }), ctx(t.id))).status).toBe(404);
  });

  it('reordenar: aceita a lista completa; recusa faltando, repetindo ou com id alheio', async () => {
    as(A);
    const before = await getCols(wsStudy);
    const ids = before.map((c) => c.id);

    const swapped = [ids[1], ids[0], ...ids.slice(2)];
    const ok = await reorder.PATCH(req('PATCH', { workspaceId: wsStudy, orderedIds: swapped }));
    expect(ok.status).toBe(200);
    expect((await getCols(wsStudy)).map((c) => c.id)).toEqual(swapped);

    expect((await reorder.PATCH(req('PATCH', { workspaceId: wsStudy, orderedIds: ids.slice(1) }))).status).toBe(400);
    expect((await reorder.PATCH(req('PATCH', { workspaceId: wsStudy, orderedIds: [ids[0], ids[0], ...ids.slice(2)] }))).status).toBe(400);
    const foreign = await byTitle(wsWork, 'Backlog');
    expect((await reorder.PATCH(req('PATCH', { workspaceId: wsStudy, orderedIds: [foreign.id, ...ids.slice(1)] }))).status).toBe(400);

    as(B);
    expect((await reorder.PATCH(req('PATCH', { workspaceId: wsStudy, orderedIds: ids }))).status).toBe(404);
    as(A);
    await reorder.PATCH(req('PATCH', { workspaceId: wsStudy, orderedIds: ids })); // restaura
  });

  it('reordenar recalcula o status: quem era "primeira coluna" passa a "doing"', async () => {
    as(A);
    const t = await newTask(projStudy);
    expect(t.status).toBe('todo');
    const ids = (await getCols(wsStudy)).map((c) => c.id);

    // "A estudar" (1ª) vai para o fim das abertas; "Teoria" vira a primeira aberta
    const reordered = [ids[1], ids[2], ids[3], ids[4], ids[0], ids[5]];
    await reorder.PATCH(req('PATCH', { workspaceId: wsStudy, orderedIds: reordered }));
    const fresh = await prisma.task.findUniqueOrThrow({ where: { id: t.id } });
    expect(fresh.status).toBe('doing');

    await reorder.PATCH(req('PATCH', { workspaceId: wsStudy, orderedIds: ids }));
    expect((await prisma.task.findUniqueOrThrow({ where: { id: t.id } })).status).toBe('todo');
  });

  it('conclusão arrastada para o início continua sendo a de conclusão', async () => {
    as(A);
    const ids = (await getCols(wsWork)).map((c) => c.id);
    const doneFirst = [ids[2], ids[0], ids[1]];
    expect((await reorder.PATCH(req('PATCH', { workspaceId: wsWork, orderedIds: doneFirst }))).status).toBe(200);
    const list = await getCols(wsWork);
    expect(list[0].isDone).toBe(true);
    expect(list.filter((c) => c.isDone)).toHaveLength(1);
    await reorder.PATCH(req('PATCH', { workspaceId: wsWork, orderedIds: ids }));
  });

  it('excluir: nunca a de conclusão; com itens exige destino; mover para conclusão conclui os itens', async () => {
    as(A);
    const done = await byTitle(wsStudy, 'Dominado');
    expect((await colId.DELETE(req('DELETE'), ctx(done.id))).status).toBe(400);

    const sim = await byTitle(wsStudy, 'Simulados');
    const t = await newTask(projStudy, { columnId: sim.id, plannedFor: 'today' });
    expect((await colId.DELETE(req('DELETE'), ctx(sim.id))).status).toBe(400); // tem item e falta o destino
    expect((await colId.DELETE(req('DELETE', undefined, `http://t/api?moveTo=${sim.id}`), ctx(sim.id))).status).toBe(400); // destino = ela mesma

    const res = await colId.DELETE(req('DELETE', undefined, `http://t/api?moveTo=${done.id}`), ctx(sim.id));
    expect(res.status).toBe(200);
    const moved = await prisma.task.findUniqueOrThrow({ where: { id: t.id } });
    expect([moved.columnId, moved.status, moved.plannedFor]).toEqual([done.id, 'done', null]);
    expect(moved.completedAt).toBeTruthy();

    const list = await getCols(wsStudy);
    expect(list.map((c) => c.title)).toEqual(['A estudar', 'Teoria', 'Exercícios', 'Revisão', 'Dominado']);
    expect(list.map((c) => c.position)).toEqual([0, 1, 2, 3, 4]); // posições renumeradas
  });

  it('excluir coluna vazia não pede destino; não deixa menos de 2 colunas', async () => {
    as(A);
    const extra = (await (await cols.POST(req('POST', { workspaceId: wsStudy, title: 'Temporária' }))).json()) as Json;
    expect((await colId.DELETE(req('DELETE'), ctx(extra.id))).status).toBe(200);

    const { createWorkspaceWithSetup } = await import('@/lib/workspace/create');
    const tiny = await createWorkspaceWithSetup(A.id, {
      name: 'Mínimo',
      mode: 'WORK',
      columns: [{ title: 'Fazer', isDone: false }, { title: 'Feito', isDone: true }],
    });
    const fazer = await byTitle(tiny.id, 'Fazer');
    expect((await colId.DELETE(req('DELETE'), ctx(fazer.id))).status).toBe(400);
  });

  it('trocar o projeto da tarefa para outro workspace a coloca na coluna certa de lá', async () => {
    as(A);
    const t = await newTask(projStudy);
    const { res, body } = await move(t.id, { projectId: projWork });
    expect(res.status).toBe(200);
    const backlog = await byTitle(wsWork, 'Backlog');
    expect([body.columnId, body.status]).toEqual([backlog.id, 'todo']);

    // concluída continua concluída ao trocar de workspace
    const doneTask = await newTask(projStudy);
    await move(doneTask.id, { status: 'done' });
    const moved = await move(doneTask.id, { projectId: projWork });
    const concluido = await byTitle(wsWork, 'Concluído');
    expect([moved.body.columnId, moved.body.status]).toEqual([concluido.id, 'done']);
  });
});
