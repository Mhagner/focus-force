'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/useAppStore';
import type { Workspace } from '@/types';

interface WorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace;
}

/** Renomeia um workspace. A criação (com tipo, foco, colunas e descrições) é feita pelo onboarding. */
export function WorkspaceDialog({ open, onOpenChange, workspace }: WorkspaceDialogProps) {
  const renameWorkspace = useAppStore((state) => state.renameWorkspace);
  const [name, setName] = useState(workspace.name);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) setName(workspace.name);
  }, [open, workspace]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      await renameWorkspace(workspace.id, trimmed);
      toast.success('Workspace renomeado.');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível renomear o workspace.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renomear workspace</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Nome</Label>
            <Input id="workspace-name" value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
