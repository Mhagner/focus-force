'use client';

import { useAppStore } from '@/stores/useAppStore';
import { WORKSPACE_LABELS } from '@/lib/workspace/labels';

/** Workspace ativo e o vocabulário do seu modo (Trabalho: Projeto/Tarefa; Estudos: Matéria/Tópico). */
export function useWorkspace() {
  const workspaces = useAppStore((state) => state.workspaces);
  const activeId = useAppStore((state) => state.activeWorkspaceId);
  const workspace = workspaces.find((item) => item.id === activeId) ?? null;
  const mode = workspace?.mode ?? 'WORK';

  return {
    workspace,
    mode,
    isStudy: mode === 'STUDY',
    labels: WORKSPACE_LABELS[mode],
  };
}
