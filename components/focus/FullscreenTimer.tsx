'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
import { useTimerStore } from '@/stores/useTimerStore';
import { Expand, Minimize } from 'lucide-react';

const phaseLabels: Record<string, string> = {
  work: 'Trabalho',
  'short-break': 'Pausa Curta',
  'long-break': 'Pausa Longa',
  manual: 'Cronômetro',
};

const TIMER_STORAGE_KEY = 'focusforge/timer-state';

function getTimeBlocks(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return {
      left: hours.toString().padStart(2, '0'),
      right: minutes.toString().padStart(2, '0'),
      caption: 'HH : MM',
    };
  }

  return {
    left: minutes.toString().padStart(2, '0'),
    right: seconds.toString().padStart(2, '0'),
    caption: 'MM : SS',
  };
}

export function FullscreenTimer() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const {
    isRunning,
    isPaused,
    currentPhase,
    timeRemaining,
    selectedProjectId,
    selectedTaskId,
    tick,
    restoreState,
  } = useTimerStore();
  const { projects, tasks } = useAppStore();

  const timeBlocks = useMemo(() => getTimeBlocks(timeRemaining), [timeRemaining]);

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

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    window.addEventListener('storage', handleStorage);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    handleFullscreenChange();

    return () => {
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [restoreState]);

  const project = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : undefined;
  const task = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : undefined;

  const handleFullscreenToggle = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  return (
    <div className="min-h-screen w-screen bg-neutral-950 text-white">
      <header className="flex items-center justify-between px-6 py-5 text-xs uppercase tracking-[0.3em] text-neutral-400">
        <div className="flex flex-col gap-1">
          <span>{phaseLabels[currentPhase] ?? 'Sessão'}</span>
          <span className="text-[10px] tracking-[0.35em] text-neutral-500">
            {isRunning ? (isPaused ? 'Pausado' : 'Em andamento') : 'Parado'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFullscreenToggle}
          className="h-8 gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 text-xs text-neutral-200 hover:bg-neutral-800"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
          {isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        </Button>
      </header>

      <main className="flex flex-1 flex-col justify-center px-6 pb-10">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-8">
          <div className="grid gap-6 md:grid-cols-2">
            {[timeBlocks.left, timeBlocks.right].map((value, index) => (
              <div
                key={`${value}-${index}`}
                className="flex min-h-[38vh] items-center justify-center rounded-[32px] border border-neutral-800 bg-gradient-to-b from-neutral-900 via-neutral-950 to-black shadow-[0_25px_80px_rgba(0,0,0,0.6)]"
              >
                <span className="font-mono text-[clamp(4rem,18vw,12rem)] font-bold leading-none text-white">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="text-center text-xs uppercase tracking-[0.4em] text-neutral-500">
            {timeBlocks.caption}
          </div>
        </div>
      </main>

      <footer className="flex flex-col items-center gap-2 px-6 pb-8 text-sm text-neutral-300">
        {project && (
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
            <span className="max-w-[240px] truncate">{project.name}</span>
          </div>
        )}
        {task && <span className="max-w-[320px] truncate text-xs text-neutral-500">{task.title}</span>}
      </footer>
    </div>
  );
}
