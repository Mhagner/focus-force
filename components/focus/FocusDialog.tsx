'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/stores/useAppStore';
import { useTimerStore } from '@/stores/useTimerStore';
import { PriorityTag } from '@/components/ui/priority-tag';
import { getTodayTasks, cn } from '@/lib/utils';
import { Play, Timer, ChevronsUpDown, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface FocusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProjectId?: string;
  initialTaskId?: string;
  onStarted?: () => void;
}

export function FocusDialog({ open, onOpenChange, initialProjectId, initialTaskId, onStarted }: FocusDialogProps) {
  const { projects, tasks, sessionDescriptionPresets } = useAppStore();
  const { startTimer, switchTask, isRunning } = useTimerStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [timerType, setTimerType] = useState<'pomodoro' | 'manual'>('pomodoro');
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [description, setDescription] = useState('');

  const activeProjects = projects.filter(p => p.active);
  const todayTasks = getTodayTasks(tasks);
  const projectTasks = selectedProjectId
    ? tasks.filter(t => t.projectId === selectedProjectId && t.status !== 'done')
    : [];
  const selectedProject = selectedProjectId
    ? activeProjects.find(project => project.id === selectedProjectId)
    : undefined;
  const selectedTask = selectedTaskId && selectedTaskId !== 'none'
    ? projectTasks.find(task => task.id === selectedTaskId)
    : undefined;

  useEffect(() => {
    if (open) {
      setSelectedProjectId(initialProjectId ?? '');
      setSelectedTaskId(initialTaskId ?? '');
      setDescription('');
    }
  }, [open, initialProjectId, initialTaskId]);

  const handleStart = () => {
    const trimmedDescription = description.trim();
    if (!selectedProjectId || !trimmedDescription) return;
    const taskId = selectedTaskId && selectedTaskId !== 'none' ? selectedTaskId : undefined;
    if (isRunning) {
      switchTask(selectedProjectId, taskId, trimmedDescription);
    } else {
      startTimer(timerType, selectedProjectId, taskId, trimmedDescription);
    }
    onOpenChange(false);

    // Reset selections
    setSelectedProjectId('');
    setSelectedTaskId('');
    setDescription('');

    onStarted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Iniciar Sessão de Foco
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Timer Type */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
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
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Projeto *
            </label>
            <Popover open={isProjectOpen} onOpenChange={setIsProjectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isProjectOpen}
                  className="w-full justify-between text-left"
                >
                  {selectedProject ? (
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedProject.color }}
                      />
                      <span className="truncate">{selectedProject.name}</span>
                    </span>
                  ) : (
                    <span className="text-ink-muted">Selecione um projeto</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[320px] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Buscar projeto..." />
                  <CommandList>
                    <CommandEmpty className="py-6">
                      Nenhum projeto encontrado.
                    </CommandEmpty>
                    <CommandGroup>
                      {activeProjects.map((project) => (
                        <CommandItem
                          key={project.id}
                          value={`${project.name} ${project.client ?? ''}`}
                          onSelect={() => {
                            setSelectedProjectId(project.id);
                            setSelectedTaskId('');
                            setIsProjectOpen(false);
                            setIsTaskOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1 overflow-hidden">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: project.color }}
                            />
                            <span className="truncate">{project.name}</span>
                          </div>
                          <Check
                            className={cn(
                              'h-4 w-4',
                              selectedProjectId === project.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Task Selection (optional) */}
          {projectTasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">
                Tarefa (opcional)
              </label>
              <Popover open={isTaskOpen} onOpenChange={setIsTaskOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isTaskOpen}
                    className="w-full justify-between text-left"
                  >
                    {selectedTaskId ? (
                      <span className="flex items-center gap-2 truncate">
                        {selectedTaskId === 'none' ? (
                          <span className="truncate">Sem tarefa específica</span>
                        ) : (
                          <>
                            <PriorityTag priority={selectedTask?.priority || 'media'} />
                            <span className="truncate">{selectedTask?.title}</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-ink-muted">Selecione uma tarefa</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[320px] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Buscar tarefa..." />
                    <CommandList>
                      <CommandEmpty className="py-6">
                        Nenhuma tarefa encontrada.
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setSelectedTaskId('none');
                            setIsTaskOpen(false);
                          }}
                        >
                          <span className="flex-1 truncate">Sem tarefa específica</span>
                          <Check
                            className={cn(
                              'h-4 w-4',
                              selectedTaskId === 'none' ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                        </CommandItem>
                        {projectTasks.map((task) => (
                          <CommandItem
                            key={task.id}
                            value={`${task.title} ${task.description ?? ''}`}
                            onSelect={() => {
                              setSelectedTaskId(task.id);
                              setIsTaskOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1 overflow-hidden">
                              <PriorityTag priority={task.priority || 'media'} />
                              <span className="truncate">{task.title}</span>
                            </div>
                            <Check
                              className={cn(
                                'h-4 w-4',
                                selectedTaskId === task.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Session Description (required) */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Descrição da sessão *
            </label>
            {sessionDescriptionPresets.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {sessionDescriptionPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDescription(preset.label)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs border transition-colors',
                      description === preset.label
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-background border-border text-ink-muted hover:bg-secondary'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que você vai fazer nesta sessão?"
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Today's Tasks Preview */}
          {todayTasks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-ink-muted mb-2">
                Tarefas de Hoje
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {todayTasks.slice(0, 4).map((task) => {
                  const project = projects.find(p => p.id === task.projectId);
                  if (!project) return null;

                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-2 rounded bg-background text-sm cursor-pointer hover:bg-secondary"
                      onClick={() => {
                        setSelectedProjectId(task.projectId);
                        setSelectedTaskId(task.id);
                      }}
                    >
                      <PriorityTag priority={task.priority || 'media'} />
                      <span className="text-ink-muted truncate">{task.title}</span>
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
              disabled={!selectedProjectId || !description.trim()}
              className="flex-1"
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