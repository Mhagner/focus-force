import { HttpError } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';

/** True se o workspace (do usuário) é de Estudos. */
export async function isStudyWorkspace(userId: string, workspaceId: string): Promise<boolean> {
  const count = await prisma.workspace.count({ where: { id: workspaceId, userId, mode: 'STUDY' } });
  return count > 0;
}

/** True se o projeto (do usuário) pertence a um workspace de Estudos. */
export async function isStudyProject(userId: string, projectId: string): Promise<boolean> {
  const count = await prisma.project.count({ where: { id: projectId, userId, workspace: { mode: 'STUDY' } } });
  return count > 0;
}

/** Integrações de trabalho (Clockfy) não existem em Estudos: recusa com 400. */
export async function assertClockfyAllowedForProject(userId: string, projectId: string) {
  if (await isStudyProject(userId, projectId)) {
    throw new HttpError(400, 'Workspaces de estudo não usam a integração com o Clockfy.');
  }
}
