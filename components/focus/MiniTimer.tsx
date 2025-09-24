'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTimerStore } from '@/stores/useTimerStore';
import { useAppStore } from '@/stores/useAppStore';
import { formatTime } from '@/lib/utils';
import { Pause, Play, RotateCcw, Square } from 'lucide-react';

const phaseLabels: Record<string, string> = {
  work: 'Trabalho',
  'short-break': 'Pausa Curta',
  'long-break': 'Pausa Longa',
  manual: 'Cronômetro',
};

const TIMER_STORAGE_KEY = 'focusforge/timer-state';

export function MiniTimer() {
  const {
    isRunning,
    isPaused,
    currentPhase,
    timeRemaining,
    selectedProjectId,
    selectedTaskId,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    tick,
    restoreState,
  } = useTimerStore();

  const { projects, tasks } = useAppStore();

  useEffect(() => {
    restoreState();
  }, [restoreState]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      const id = setInterval(() => {
        tick();
      }, 1000);
      return () => clearInterval(id);
    }
  }, [isRunning, isPaused, tick]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === TIMER_STORAGE_KEY) {
        restoreState();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [restoreState]);

  const project = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : undefined;
  const task = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : undefined;

  return (
    <div className="w-full max-w-xs rounded-2xl border border-gray-800 bg-gray-900/80 p-4 shadow-xl">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-400">
        <span>{phaseLabels[currentPhase] ?? 'Sessão'}</span>
        <span>{isRunning ? (isPaused ? 'Pausado' : 'Em andamento') : 'Parado'}</span>
      </div>

      <div className="mt-4 text-center">
        <div className="text-5xl font-mono font-bold text-white">
          {formatTime(Math.max(timeRemaining, 0))}
        </div>

        {project && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-200">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <span className="truncate max-w-[180px]">{project.name}</span>
          </div>
        )}

        {task && (
          <p className="mt-1 text-xs text-gray-500 truncate max-w-[220px] mx-auto">
            {task.title}
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <Button
          size="sm"
          variant="ghost"
          onClick={isPaused ? resumeTimer : pauseTimer}
          disabled={!isRunning}
          className="h-8 w-8 p-0 text-gray-200 hover:text-white hover:bg-gray-800"
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={stopTimer}
          disabled={!isRunning && !isPaused}
          className="h-8 w-8 p-0 text-gray-200 hover:text-white hover:bg-gray-800"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={resetTimer}
          disabled={!isRunning && !isPaused}
          className="h-8 w-8 p-0 text-gray-200 hover:text-white hover:bg-gray-800"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
