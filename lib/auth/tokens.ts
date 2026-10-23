import type { AuthTokenType } from '@prisma/client';

import { generateToken, hashToken } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';

const TTL_MS: Record<AuthTokenType, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

/** Emite um token novo e invalida os anteriores ainda não usados do mesmo tipo. */
export async function issueAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const { token, tokenHash } = generateToken();
  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, type, usedAt: null } }),
    prisma.authToken.create({
      data: { userId, type, tokenHash, expiresAt: new Date(Date.now() + TTL_MS[type]) },
    }),
  ]);
  return token;
}

/** Consome o token (uso único). Devolve o userId ou null se inválido/expirado/já usado. */
export async function consumeAuthToken(token: string, type: AuthTokenType): Promise<string | null> {
  const tokenHash = hashToken(token);
  const record = await prisma.authToken.findUnique({ where: { tokenHash } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  // updateMany condicionado a usedAt null garante uso único mesmo com requisições concorrentes.
  const { count } = await prisma.authToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  return count === 1 ? record.userId : null;
}
