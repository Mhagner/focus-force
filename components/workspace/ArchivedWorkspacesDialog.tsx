'use client';

import { useEffect, useState } from 'react';
import { Briefcase, GraduationCap, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/useAppStore';
import type { Workspace } from '@/types';

interface ArchivedWorkspacesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Lista os workspaces arquivados: dá para reativar ou excluir de vez (digitando o nome para confirmar). */
export function ArchivedWorkspacesDialog({ open, onOpenChange }: ArchivedWorkspacesDialogProps) {
  const workspaces = useAppStore((state) => state.workspaces);
  const setWorkspaceArchived = useAppStore((state) => state.setWorkspaceArchived);
  const deleteWorkspace = useAppStore((state) => state.deleteWorkspace);

  const archived = workspaces.filter((workspace) => workspace.archived);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Workspace | null>(null);
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => {
    if (!open) {
      setToDelete(null);
      setConfirmName('');
    }
  }, [open]);

  const handleRestore = async (target: Workspace) => {
    if (busyId) return;
    setBusyId(target.id);
    try {
      await setWorkspaceArchived(target.id, false);
      toast.success(`"${target.name}" reativado.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível reativar o workspace.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete || busyId || confirmName.trim() !== toDelete.name) return;
    setBusyId(toDelete.id);
    try {
      await deleteWorkspace(toDelete.id, confirmName.trim());
      toast.success(`"${toDelete.name}" excluído definitivamente.`);
      setToDelete(null);
      setConfirmName('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir o workspace.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {toDelete ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>Excluir &quot;{toDelete.name}&quot; definitivamente?</DialogTitle>
              <DialogDescription>
                Projetos, tarefas, sessões, colunas e configurações deste workspace serão apagados e não poderão ser
                recuperados. Os lançamentos já enviados ao Clockfy não são removidos de lá.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="confirm-workspace-name">
                Digite <strong>{toDelete.name}</strong> para confirmar
              </Label>
              <Input
                id="confirm-workspace-name"
                value={confirmName}
                onChange={(event) => setConfirmName(event.target.value)}
                autoComplete="off"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busyId !== null} onClick={() => setToDelete(null)}>
                Voltar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={busyId !== null || confirmName.trim() !== toDelete.name}
              >
                {busyId ? 'Excluindo...' : 'Excluir definitivamente'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Workspaces arquivados</DialogTitle>
              <DialogDescription>Reative um workspace ou exclua-o de vez.</DialogDescription>
            </DialogHeader>
            {archived.length === 0 ? (
              <p className="py-4 text-sm text-ink-muted">Nenhum workspace arquivado.</p>
            ) : (
              <ul className="space-y-2">
                {archived.map((workspace) => (
                  <li
                    key={workspace.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    {workspace.mode === 'STUDY' ? (
                      <GraduationCap className="h-4 w-4 shrink-0" />
                    ) : (
                      <Briefcase className="h-4 w-4 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{workspace.name}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyId !== null}
                      onClick={() => void handleRestore(workspace)}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reativar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={busyId !== null}
                      onClick={() => setToDelete(workspace)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
