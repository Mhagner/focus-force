import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Fonte de verdade da autorização nas rotas /api. O middleware é só barreira de navegação.
 * Confere no banco que o usuário existe, não foi removido e que a sessão não foi invalidada
 * (troca/reset de senha incrementa tokenVersion).
 */
export async function requireUser(): Promise<{ userId: string }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    throw new HttpError(401, 'Não autenticado.');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true, deletedAt: true },
  });
  if (!user || user.deletedAt || user.tokenVersion !== session.tv) {
    throw new HttpError(401, 'Sessão expirada. Entre novamente.');
  }

  return { userId };
}
