import { HttpError } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';

const NOT_FOUND = () => new HttpError(404, 'Não encontrado.');

// 404 (e não 403) para não revelar a existência de recursos de outros usuários.

export async function assertProjectOwned(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  if (!project) throw NOT_FOUND();
}

export async function assertTaskOwned(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, userId }, select: { id: true } });
  if (!task) throw NOT_FOUND();
}

export async function assertWorkspaceOwned(userId: string, workspaceId: string) {
  const workspace = await prisma.workspace.findFirst({ where: { id: workspaceId, userId }, select: { id: true } });
  if (!workspace) throw NOT_FOUND();
}

/** Workspace padrão do usuário (o mais antigo não arquivado). */
export async function getDefaultWorkspaceId(userId: string): Promise<string> {
  const workspace = await prisma.workspace.findFirst({
    where: { userId, archived: false },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!workspace) throw new HttpError(409, 'Nenhum workspace disponível.');
  return workspace.id;
}
