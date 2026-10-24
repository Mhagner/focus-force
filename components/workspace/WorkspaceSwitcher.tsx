'use client';

import { useState } from 'react';
import { Archive, Briefcase, Check, ChevronsUpDown, GraduationCap, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { WorkspaceOnboarding } from '@/components/onboarding/WorkspaceOnboarding';
import { WorkspaceDialog } from '@/components/workspace/WorkspaceDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/hooks/use-workspace';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import type { Workspace } from '@/types';

const ModeIcon = ({ mode, className }: { mode: Workspace['mode']; className?: string }) =>
  mode === 'STUDY' ? <GraduationCap className={className} /> : <Briefcase className={className} />;

export function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const { workspace } = useWorkspace();
  const { workspaces, setActiveWorkspace, setWorkspaceArchived } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const visible = workspaces.filter((item) => !item.archived);
  const canArchive = visible.length > 1;

  const handleArchive = async (target: Workspace) => {
    try {
      await setWorkspaceArchived(target.id, true);
      toast.success(`"${target.name}" arquivado. Seus dados foram mantidos.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível arquivar.');
    }
  };

  if (!workspace) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Workspace ativo: ${workspace.name}`}
            className={cn(
              'flex w-full items-center gap-3 rounded-md bg-white/10 px-3 py-2 text-left text-white transition-colors hover:bg-white/15',
              collapsed && 'justify-center px-2'
            )}
          >
            <ModeIcon mode={workspace.mode} className="h-5 w-5 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{workspace.name}</span>
                  <span className="block text-xs text-white/65">
                    {workspace.mode === 'STUDY' ? 'Estudos' : 'Trabalho'}
                  </span>
                </span>
                <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-white/60" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Seus workspaces</DropdownMenuLabel>
          {visible.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onSelect={() => void setActiveWorkspace(item.id)}
              className="gap-2"
            >
              <ModeIcon mode={item.mode} className="h-4 w-4" />
              <span className="flex-1 truncate">{item.name}</span>
              {item.id === workspace.id && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo workspace
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsRenaming(true)} className="gap-2">
            <Pencil className="h-4 w-4" /> Renomear atual
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canArchive}
            onSelect={() => void handleArchive(workspace)}
            className="gap-2"
          >
            <Archive className="h-4 w-4" /> Arquivar atual
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WorkspaceOnboarding variant="new" open={isCreating} onOpenChange={setIsCreating} />
      <WorkspaceDialog open={isRenaming} workspace={workspace} onOpenChange={setIsRenaming} />
    </>
  );
}
