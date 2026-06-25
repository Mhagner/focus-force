'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDuration } from '@/lib/utils';
import { FocusSession, Project, Task } from '@/types';

interface SessionDetailDialogProps {
  session: FocusSession | null;
  project?: Project;
  task?: Task;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<FocusSession>) => void;
  onDuplicate: (session: FocusSession) => void;
}

export function SessionDetailDialog({
  session,
  project,
  task,
  onOpenChange,
  onSave,
  onDuplicate,
}: SessionDetailDialogProps) {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (!session) return;
    setStartTime(format(new Date(session.start), 'HH:mm'));
    const end = session.end
      ? new Date(session.end)
      : new Date(new Date(session.start).getTime() + session.durationSec * 1000);
    setEndTime(format(end, 'HH:mm'));
  }, [session]);

  if (!session) return null;

  const dateLabel = format(new Date(session.start), 'dd/MM/yyyy');
  const durationSec = (() => {
    if (!startTime || !endTime) return session.durationSec;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return Math.max(0, diff * 60);
  })();

  const hasChanges = (() => {
    const originalStart = format(new Date(session.start), 'HH:mm');
    const originalEnd = format(
      session.end ? new Date(session.end) : new Date(new Date(session.start).getTime() + session.durationSec * 1000),
      'HH:mm',
    );
    return startTime !== originalStart || endTime !== originalEnd;
  })();

  const handleSave = () => {
    if (!startTime || !endTime || durationSec <= 0) return;
    const day = new Date(session.start);
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);

    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), sh, sm);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), eh, em);

    onSave(session.id, {
      start: start.toISOString(),
      end: end.toISOString(),
      durationSec,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={Boolean(session)} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Detalhe da sessão</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              {project && (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
              )}
              <span className="font-medium text-white">{task?.title ?? 'Sessão sem tarefa'}</span>
            </div>
            {project && <div className="mt-0.5 text-xs text-gray-500">{project.name}</div>}
          </div>

          <div className="text-sm text-gray-400">{dateLabel}</div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Início</label>
              <Input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Fim</label>
              <Input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <div className="text-sm text-gray-300">
            Duração: <span className="font-semibold text-white">{formatDuration(durationSec)}</span>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 border-gray-700 text-gray-300 hover:text-white"
              onClick={() => {
                onDuplicate(session);
                onOpenChange(false);
              }}
            >
              <Copy className="h-4 w-4" />
              Duplicar sessão
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={!hasChanges || durationSec <= 0}
              onClick={handleSave}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
