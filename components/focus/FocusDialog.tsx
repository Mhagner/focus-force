'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/useAppStore';
import { useTimerStore } from '@/stores/useTimerStore';
import { ProjectBadge } from '@/components/ui/project-badge';
import { PriorityTag } from '@/components/ui/priority-tag';
import { getTodayTasks } from '@/lib/utils';
import { Play, Timer } from 'lucide-react';

interface FocusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FocusDialog({ open, onOpenChange }: FocusDialogProps) {
  const { projects, tasks } = useAppStore();
  const { startTimer } = useTimerStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [timerType, setTimerType] = useState<'pomodoro' | 'manual'>('pomodoro');

  const activeProjects = projects.filter(p => p.active);
  const todayTasks = getTodayTasks(tasks);
  const projectTasks = selectedProjectId
    ? tasks.filter(t => t.projectId === selectedProjectId && t.status !== 'done')
    : [];

  const handleStart = () => {
    if (!selectedProjectId) return;
    const taskId = selectedTaskId && selectedTaskId !== 'none' ? selectedTaskId : undefined;
    startTimer(timerType, selectedProjectId, taskId);
    onOpenChange(false);

    // Reset selections
    setSelectedProjectId('');
    setSelectedTaskId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Iniciar Sessão de Foco
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Timer Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de Timer
            </label>
            <div className="flex gap-2">
              <Button
                variant={timerType === 'pomodoro' ? 'default' : 'outline'}
                onClick={() => setTimerType('pomodoro')}
                className="flex-1"
              >
                Pomodoro
              </Button>
              <Button
                variant={timerType === 'manual' ? 'default' : 'outline'}
                onClick={() => setTimerType('manual')}
                className="flex-1"
              >
                Manual
              </Button>
            </div>
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Projeto *
            </label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue placeholder="Selecione um projeto" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {activeProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <span>{project.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task Selection (optional) */}
          {projectTasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tarefa (opcional)
              </label>
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger className="bg-gray-800 border-gray-700">
                  <SelectValue placeholder="Selecione uma tarefa" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="none">Sem tarefa específica</SelectItem>
                  {projectTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      <div className="flex items-center gap-2">
                        <PriorityTag priority={task.priority || 'media'} />
                        <span className="truncate">{task.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Today's Tasks Preview */}
          {todayTasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tarefas de Hoje
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {todayTasks.slice(0, 4).map((task) => {
                  const project = projects.find(p => p.id === task.projectId);
                  if (!project) return null;

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2 rounded bg-gray-800/30 text-sm cursor-pointer hover:bg-gray-800/50"
                      onClick={() => {
                        setSelectedProjectId(task.projectId);
                        setSelectedTaskId(task.id);
                      }}
                    >
                      <PriorityTag priority={task.priority || 'media'} />
                      <span className="text-gray-300 truncate">{task.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStart}
              disabled={!selectedProjectId}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}