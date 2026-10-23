'use client';

import { useMemo } from 'react';

import { useAppStore } from '@/stores/useAppStore';
import { STATUS_SHORT_TITLES, STATUS_TITLES, WORKSPACE_LABELS } from '@/lib/workspace/labels';

/** Workspace ativo e o vocabulário do seu modo (Trabalho: Projeto/Tarefa; Estudos: Matéria/Tópico). */
export function useWorkspace() {
  const workspaces = useAppStore((state) => state.workspaces);
  const activeId = useAppStore((state) => state.activeWorkspaceId);
  const allOverrides = useAppStore((state) => state.statusTitles);
  const workspace = workspaces.find((item) => item.id === activeId) ?? null;
  const mode = workspace?.mode ?? 'WORK';

  const statusTitles = useMemo(
    () => ({ ...STATUS_TITLES[mode], ...allOverrides[mode] }),
    [mode, allOverrides],
  );
  const statusShortTitles = useMemo(
    () => ({ ...STATUS_SHORT_TITLES[mode], ...allOverrides[mode] }),
    [mode, allOverrides],
  );

  return {
    workspace,
    mode,
    isStudy: mode === 'STUDY',
    labels: WORKSPACE_LABELS[mode],
    /** Nome de cada coluna do quadro (padrão do modo + personalizações do usuário). */
    statusTitles,
    /** Versão curta para botões; usa o nome personalizado quando existir. */
    statusShortTitles,
  };
}
