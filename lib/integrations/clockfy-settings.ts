import { decryptSecret, isEncrypted } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';

/** Configuração Clockfy do usuário, com a chave já descriptografada (aceita legado em texto puro). */
export async function getClockfySettings(userId: string) {
  const settings = await prisma.clockfySettings.findUnique({ where: { userId } });
  const stored = settings?.apiKey ?? null;
  const apiKey = stored ? (isEncrypted(stored) ? decryptSecret(stored) : stored) : undefined;
  return { settings, apiKey };
}
