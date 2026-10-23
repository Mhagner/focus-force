/** Testes com banco (somente localhost). Veja app/api/__tests__/isolation.test.ts para como rodar. */
import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_DB = process.env.TEST_DATABASE_URL;

if (TEST_DB && !/@(localhost|127\.0\.0\.1)[:/]/.test(TEST_DB)) {
  throw new Error('TEST_DATABASE_URL deve apontar para localhost/127.0.0.1.');
}

describe.skipIf(!TEST_DB)('auth com banco', () => {
  let prisma: typeof import('@/lib/prisma').prisma;
  let userId: string;
  const tag = randomBytes(4).toString('hex');

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB!;
    ({ prisma } = await import('@/lib/prisma'));
    userId = (await prisma.user.create({ data: { email: `auth-${tag}@test.local` } })).id;
  });

  afterAll(async () => {
    await prisma.rateLimit.deleteMany({ where: { key: { startsWith: `t-${tag}` } } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('rateLimit: permite até o limite e bloqueia depois (inclusive em paralelo)', async () => {
    const { rateLimit } = await import('@/lib/rate-limit');
    const key = `t-${tag}:serial`;
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await rateLimit(key, 3, 60)).ok);
    expect(results).toEqual([true, true, true, false, false]);

    const parallel = await Promise.all(
      Array.from({ length: 10 }, () => rateLimit(`t-${tag}:parallel`, 4, 60))
    );
    expect(parallel.filter((r) => r.ok)).toHaveLength(4); // atômico: nunca passa do limite
  });

  it('token de reset: uso único e rejeita tipo errado', async () => {
    const { issueAuthToken, consumeAuthToken } = await import('@/lib/auth/tokens');
    const token = await issueAuthToken(userId, 'PASSWORD_RESET');

    expect(await consumeAuthToken(token, 'EMAIL_VERIFY')).toBeNull(); // tipo errado
    expect(await consumeAuthToken(token, 'PASSWORD_RESET')).toBe(userId);
    expect(await consumeAuthToken(token, 'PASSWORD_RESET')).toBeNull(); // já usado
  });

  it('token: corrida de dois consumos simultâneos só deixa um vencer', async () => {
    const { issueAuthToken, consumeAuthToken } = await import('@/lib/auth/tokens');
    const token = await issueAuthToken(userId, 'EMAIL_VERIFY');
    const results = await Promise.all([consumeAuthToken(token, 'EMAIL_VERIFY'), consumeAuthToken(token, 'EMAIL_VERIFY')]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('token expirado e token novo invalida o anterior', async () => {
    const { issueAuthToken, consumeAuthToken } = await import('@/lib/auth/tokens');
    const first = await issueAuthToken(userId, 'PASSWORD_RESET');
    const second = await issueAuthToken(userId, 'PASSWORD_RESET');
    expect(await consumeAuthToken(first, 'PASSWORD_RESET')).toBeNull();

    await prisma.authToken.updateMany({ where: { userId, usedAt: null }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await consumeAuthToken(second, 'PASSWORD_RESET')).toBeNull();
  });

  it('bootstrapUser é idempotente (1 workspace, 1 assinatura em trial)', async () => {
    const { bootstrapUser } = await import('@/lib/auth/bootstrap');
    await bootstrapUser(userId);
    await bootstrapUser(userId);
    expect(await prisma.workspace.count({ where: { userId } })).toBe(1);
    const sub = await prisma.subscription.findUniqueOrThrow({ where: { userId } });
    expect(sub.status).toBe('trialing');
    expect(sub.trialEndsAt!.getTime()).toBeGreaterThan(Date.now());
  });
});
