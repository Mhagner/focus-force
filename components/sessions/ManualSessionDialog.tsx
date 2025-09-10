'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/useAppStore';

interface ManualSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualSessionDialog({ open, onOpenChange }: ManualSessionDialogProps) {
  const { projects, tasks, addSession } = useAppStore();
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const projectTasks = projectId ? tasks.filter(t => t.projectId === projectId) : [];

  const handleSave = async () => {
    if (!projectId || !date || !startTime || !endTime) return;
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    const durationSec = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
    await addSession({
      projectId,
      taskId: taskId || undefined,
      start: start.toISOString(),
      end: end.toISOString(),
      durationSec,
      type: 'manual',
    });
    onOpenChange(false);
    setProjectId('');
    setTaskId('');
    setDate('');
    setStartTime('');
    setEndTime('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Adicionar Sessão Manual</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Projeto *</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {projectTasks.length > 0 && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Tarefa</label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="">Sem tarefa</SelectItem>
                  {projectTasks.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Data *</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-gray-800 border-gray-700" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Início *</label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-gray-800 border-gray-700" />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Fim *</label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-gray-800 border-gray-700" />
            </div>
          </div>
          <div className="pt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={!projectId || !date || !startTime || !endTime}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
