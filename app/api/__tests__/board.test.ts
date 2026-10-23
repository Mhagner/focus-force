/** Quadro de tarefas: colunas personalizadas e nomes das colunas padrão. Requer TEST_DATABASE_URL (localhost). */
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;

if (TEST_DB && !/@(localhost|127\.0\.0\.1)[:/]/.test(TEST_DB)) {
  throw new Error('TEST_DATABASE_URL deve apontar para localhost/127.0.0.1.');
}

const state = vi.hoisted(() => ({ session: null as null | { user: { id: string }; tv: number } }));
vi.mock('@/auth', () => ({ auth: async () => state.session }));

type Json = any;
const req = (body?: unknown) =>
  new Request('http://test.local/api', {
    method: body === undefined ? 'GET' : 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe.skipIf(!TEST_DB)('quadro: nomes das colunas', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let board: typeof import('@/app/api/settings/tasks-board/route');
  let A: { id: string };
  let B: { id: string };
  const tag = randomBytes(4).toString('hex');
  const as = (u: { id: string }) => {
    state.session = { user: { id: u.id }, tv: 0 };
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB!;
    ({ prisma } = await import('@/lib/prisma'));
    board = await import('@/app/api/settings/tasks-board/route');
    const mk = (n: string) => prisma.user.create({ data: { email: `${n}-${tag}@board.local`, emailVerified: new Date() } });
    A = await mk('a');
    B = await mk('b');
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.user.deleteMany({ where: { id: { in: [A?.id, B?.id].filter(Boolean) as string[] } } });
    await prisma.$disconnect();
  });

  it('por padrão não há personalização', async () => {
    as(A);
    const body = (await (await board.GET()).json()) as Json;
    expect(body.statusTitles).toEqual({ WORK: {}, STUDY: {} });
  });

  it('grava nomes por modo e devolve limpos', async () => {
    as(A);
    const res = await board.PATCH(
      req({ statusTitles: { STUDY: { todo: '  Para ler  ', done: 'Dominei' }, WORK: { doing: 'Em andamento' } } })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Json;
    expect(body.statusTitles.STUDY).toEqual({ todo: 'Para ler', done: 'Dominei' });
    expect(body.statusTitles.WORK).toEqual({ doing: 'Em andamento' });
  });

  it('atualizar só as colunas personalizadas não apaga os nomes (e vice-versa)', async () => {
    as(A);
    await board.PATCH(req({ columns: [{ id: 'c1', title: 'Simulados' }], taskColumnMap: { t1: 'c1' } }));
    let body = (await (await board.GET()).json()) as Json;
    expect(body.columns).toEqual([{ id: 'c1', title: 'Simulados' }]);
    expect(body.statusTitles.STUDY.todo).toBe('Para ler');

    await board.PATCH(req({ statusTitles: { STUDY: { todo: 'A ler' } } }));
    body = (await (await board.GET()).json()) as Json;
    expect(body.statusTitles.STUDY).toEqual({ todo: 'A ler' }); // o objeto enviado substitui o do modo
    expect(body.columns).toEqual([{ id: 'c1', title: 'Simulados' }]);
    expect(body.taskColumnMap).toEqual({ t1: 'c1' });
  });

  it('enviar um modo vazio restaura os nomes padrão daquele modo', async () => {
    as(A);
    await board.PATCH(req({ statusTitles: { WORK: {}, STUDY: {} } }));
    const body = (await (await board.GET()).json()) as Json;
    expect(body.statusTitles).toEqual({ WORK: {}, STUDY: {} });
  });

  it('rejeita status desconhecido e nome vazio ou longo demais', async () => {
    as(A);
    expect((await board.PATCH(req({ statusTitles: { STUDY: { inexistente: 'x' } } }))).status).toBe(400);
    expect((await board.PATCH(req({ statusTitles: { STUDY: { todo: '   ' } } }))).status).toBe(400);
    expect((await board.PATCH(req({ statusTitles: { STUDY: { todo: 'x'.repeat(41) } } }))).status).toBe(400);
  });

  it('cada usuário tem os próprios nomes', async () => {
    as(A);
    await board.PATCH(req({ statusTitles: { STUDY: { todo: 'Só do A' } } }));
    as(B);
    const body = (await (await board.GET()).json()) as Json;
    expect(body.statusTitles).toEqual({ WORK: {}, STUDY: {} });
  });
});
