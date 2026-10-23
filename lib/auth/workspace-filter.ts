import { assertWorkspaceOwned } from '@/lib/auth/ownership';

/** Lê ?workspaceId= da URL e confirma que pertence ao usuário (404 caso contrário). */
export async function getWorkspaceFilter(userId: string, url: string): Promise<string | undefined> {
  const workspaceId = new URL(url).searchParams.get('workspaceId') || undefined;
  if (workspaceId) {
    await assertWorkspaceOwned(userId, workspaceId);
  }
  return workspaceId;
}
