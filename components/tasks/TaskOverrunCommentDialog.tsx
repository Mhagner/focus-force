'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { formatDuration } from '@/lib/utils';

interface TaskOverrunCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  trackedSeconds: number;
  onConfirmed: () => void;
}

export function TaskOverrunCommentDialog({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  trackedSeconds,
  onConfirmed,
}: TaskOverrunCommentDialogProps) {
  const { addTaskComment, syncTaskCommentWithClockfy } = useAppStore();
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    const trimmed = comment.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addTaskComment(taskId, trimmed);

      try {
        await syncTaskCommentWithClockfy(taskId);
      } catch (error) {
        console.error(error);
        toast({
          title: 'Comentário salvo, mas não sincronizado com o Clockfy',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        });
      }

      setComment('');
      onOpenChange(false);
      onConfirmed();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent-orange" />
            Tarefa com tempo acima do esperado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-ink-muted">
            <span className="font-semibold text-ink">{taskTitle}</span> acumulou{' '}
            <span className="font-semibold text-accent-orange">{formatDuration(trackedSeconds)}</span> de trabalho.
            Antes de concluir, explique o motivo do tempo extra para registro no Clockfy.
          </p>

          <div>
            <label className="block text-sm text-ink-muted mb-2">Comentário *</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ex: Retrabalho por mudança de escopo do cliente"
              className="resize-none"
              rows={3}
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={!comment.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Concluir tarefa'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
