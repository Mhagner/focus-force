'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Play, Pause, RotateCcw, LogOut, SquareArrowOutUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { useTimerStore } from '@/stores/useTimerStore';
import { useAppStore } from '@/stores/useAppStore';
import { cn, formatTime } from '@/lib/utils';
import { FocusDialog } from '@/components/focus/FocusDialog';

export function TopNav() {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocusDialogOpen, setIsFocusDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const {
    isRunning,
    isPaused,
    timeRemaining,
    currentPhase,
    selectedProjectId,
    pauseTimer,
    resumeTimer,
    resetTimer,
    tick,
    restoreState,
  } = useTimerStore();

  const { projects, tasks } = useAppStore();
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleOpenMiniTimer = () => {
    const features = 'width=360,height=260,menubar=no,toolbar=no,location=no,status=no';
    window.open('/mini-timer', 'focusforge-mini-timer', features);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });

      if (!response.ok) {
        throw new Error('Falha ao encerrar sessão');
      }

      router.replace('/login');
      router.refresh();
    } catch (err) {
      toast.error('Não foi possível sair. Tente novamente.');
      setIsLoggingOut(false);
    }
  };

  const projectMap = useMemo(() => {
    return projects.reduce<Record<string, typeof projects[number]>>((acc, project) => {
      acc[project.id] = project;
      return acc;
    }, {});
  }, [projects]);

  const searchTerm = searchQuery.trim().toLowerCase();
  const filteredProjects = projects.filter((project) => {
    if (!searchTerm) {
      return true;
    }
    return (
      project.name.toLowerCase().includes(searchTerm) ||
      (project.client ?? '').toLowerCase().includes(searchTerm)
    );
  });

  const filteredTasks = tasks.filter((task) => {
    if (!searchTerm) {
      return true;
    }
    const projectName = (projectMap[task.projectId]?.name ?? '').toLowerCase();
    const description = (task.description ?? '').toLowerCase();
    return (
      task.title.toLowerCase().includes(searchTerm) ||
      description.includes(searchTerm) ||
      projectName.includes(searchTerm)
    );
  });

  const handleSelect = (path: string, term?: string, focusId?: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    const params: string[] = [];
    if (term && term.trim()) params.push(`search=${encodeURIComponent(term.trim())}`);
    if (focusId) params.push(`focusId=${encodeURIComponent(focusId)}`);
    const suffix = params.length ? `?${params.join('&')}` : '';
    router.push(`${path}${suffix}`);
  };

  useEffect(() => {
    restoreState();
  }, [restoreState]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      const interval = setInterval(() => {
        tick();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isRunning, isPaused, tick]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <>
      <header className="bg-gray-950/80 backdrop-blur border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSearchOpen(true)}
              className="w-80 justify-start bg-gray-900/50 border-gray-700 text-gray-400 hover:text-white"
            >
              <Search className="mr-2 h-4 w-4" />
              <span className="flex-1 text-left">Buscar projetos, tarefas...</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-gray-700 px-1.5 font-sans text-[10px] font-medium text-gray-400">
                ⌘K
              </kbd>
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer Status */}
            {isRunning && (
              <div className="flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    currentPhase === 'work' ? "bg-green-500" : "bg-orange-500"
                  )} />
                  <span className="text-sm font-medium text-white">
                    {formatTime(timeRemaining)}
                  </span>
                </div>

                {selectedProject && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedProject.color }}
                    />
                    <span>{selectedProject.name}</span>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenMiniTimer}
                    className="h-8 w-8 p-0 hover:bg-gray-700"
                    title="Abrir mini cronômetro"
                  >
                    <SquareArrowOutUpRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isPaused ? resumeTimer : pauseTimer}
                    className="h-8 w-8 p-0 hover:bg-gray-700"
                  >
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetTimer}
                    className="h-8 w-8 p-0 hover:bg-gray-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button
              onClick={() => setIsFocusDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <Play className="h-4 w-4 mr-2" />
              Iniciar Foco
            </Button>
            <Button
              variant="ghost"
              className="text-gray-300 hover:text-white"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </Button>
          </div>
        </div>
      </header>

      <FocusDialog
        open={isFocusDialogOpen}
        onOpenChange={setIsFocusDialogOpen}
      />

      <CommandDialog
        open={isSearchOpen}
        onOpenChange={(open) => {
          setIsSearchOpen(open);
          if (!open) {
            setSearchQuery('');
          }
        }}
      >
        <CommandInput
          placeholder="Buscar por projetos ou tarefas"
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          {filteredProjects.length > 0 && (
            <CommandGroup heading="Projetos">
              {filteredProjects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.name} ${project.client ?? ''}`}
                  onSelect={() => handleSelect('/projects', searchQuery, project.id)}
                >
                  <div
                    className="mr-2 h-2 w-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-white">{project.name}</span>
                    {project.client && (
                      <span className="text-xs text-gray-400">{project.client}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {filteredTasks.length > 0 && (
            <CommandGroup heading="Tarefas">
              {filteredTasks.map((task) => {
                const project = projectMap[task.projectId];
                return (
                  <CommandItem
                    key={task.id}
                    value={`${task.title} ${task.description ?? ''} ${project?.name ?? ''}`}
                    onSelect={() => handleSelect('/tasks', searchQuery, task.id)}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm text-white">{task.title}</span>
                      <span className="text-xs text-gray-400">
                        {project ? project.name : 'Projeto sem nome'}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
