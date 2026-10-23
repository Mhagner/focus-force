'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MODE_DESCRIPTIONS } from '@/lib/workspace/labels';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import type { Workspace, WorkspaceMode } from '@/types';

interface WorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se informado, o diálogo renomeia esse workspace (o modo não pode ser alterado). */
  workspace?: Workspace;
}

export function WorkspaceDialog({ open, onOpenChange, workspace }: WorkspaceDialogProps) {
  const { addWorkspace, renameWorkspace, setActiveWorkspace } = useAppStore();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<WorkspaceMode>('STUDY');
  const [isSaving, setIsSaving] = useState(false);
  const isRename = Boolean(workspace);

  useEffect(() => {
    if (!open) return;
    setName(workspace?.name ?? '');
    setMode(workspace?.mode ?? 'STUDY');
  }, [open, workspace]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      if (workspace) {
        await renameWorkspace(workspace.id, trimmed);
        toast.success('Workspace renomeado.');
      } else {
        const created = await addWorkspace({ name: trimmed, mode });
        await setActiveWorkspace(created.id);
        toast.success(`Workspace "${created.name}" criado.`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o workspace.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isRename ? 'Renomear workspace' : 'Novo workspace'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Nome</Label>
            <Input
              id="workspace-name"
              value={name}
              maxLength={60}
              autoFocus
              placeholder={mode === 'STUDY' ? 'Ex.: Concurso TRF, ENEM 2026' : 'Ex.: Trabalho, Freelas'}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {!isRename && (
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(Object.keys(MODE_DESCRIPTIONS) as WorkspaceMode[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMode(option)}
                    aria-pressed={mode === option}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors',
                      mode === option ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40'
                    )}
                  >
                    <p className="font-medium text-ink">{MODE_DESCRIPTIONS[option].title}</p>
                    <p className="mt-1 text-xs text-ink-muted">{MODE_DESCRIPTIONS[option].description}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-muted">O tipo não pode ser alterado depois de criado.</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {isSaving ? 'Salvando...' : isRename ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
