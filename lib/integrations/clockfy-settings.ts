import { decryptSecret, isEncrypted } from '@/lib/crypto';
import { prisma } from '@/lib/prisma';

/** Configuração Clockfy de UM workspace do app, com a chave já descriptografada (aceita legado em texto puro). */
export async function getClockfySettings(userId: string, workspaceId: string | null | undefined) {
  // Projeto legado sem workspace: não há configuração para ele.
  const settings = workspaceId
    ? await prisma.clockfySettings.findFirst({ where: { userId, appWorkspaceId: workspaceId } })
    : null;
  const stored = settings?.apiKey ?? null;
  const apiKey = stored ? (isEncrypted(stored) ? decryptSecret(stored) : stored) : undefined;
  return { settings, apiKey };
}
