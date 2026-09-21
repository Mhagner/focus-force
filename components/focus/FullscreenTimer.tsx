'use client';

import { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
import { useTimerStore } from '@/stores/useTimerStore';
import { cn } from '@/lib/utils';
import { X, Pause, Play, StopCircle, SkipForward } from 'lucide-react';

const phaseLabels: Record<string, string> = {
  work: 'Trabalho',
  'short-break': 'Pausa Curta',
  'long-break': 'Pausa Longa',
  manual: 'Cronômetro',
};

const TIMER_STORAGE_KEY = 'focusforge/timer-state';

interface FullscreenTimerProps {
  onClose?: () => void;
  enableTicker?: boolean;
}

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

export function FullscreenTimer({ onClose, enableTicker = false }: FullscreenTimerProps) {
  const {
    isRunning,
    isPaused,
    currentPhase,
    timeRemaining,
    selectedProjectId,
    selectedTaskId,
    currentCycle,
    cycles,
    tick,
    restoreState,
    pauseTimer,
    resumeTimer,
    stopTimer,
    nextPhase,
  } = useTimerStore();
  const { projects, tasks } = useAppStore();
  const isBreakPhase = currentPhase === 'short-break' || currentPhase === 'long-break';

  const timeBlocks = useMemo(() => getTimeBlocks(timeRemaining), [timeRemaining]);

  const project = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : undefined;
  const task = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId)
    : undefined;

  useEffect(() => {
    restoreState();
  }, [restoreState]);

  // Importante: só um lugar deve chamar tick() por segundo.
  // No app normal o TopNav já faz isso. Aqui habilitamos apenas quando necessário (ex: /mini-timer).
  useEffect(() => {
    if (!enableTicker) {
      return;
    }

    if (isRunning && !isPaused) {
      const id = setInterval(() => {
        tick();
      }, 1000);
      return () => clearInterval(id);
    }
  }, [enableTicker, isRunning, isPaused, tick]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === TIMER_STORAGE_KEY) {
        restoreState();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [restoreState, onClose]);

  return (
    <div
      className={cn(
        'flex min-h-screen w-full flex-col text-white transition-colors duration-500',
        isBreakPhase
          ? 'bg-gradient-to-br from-accent-brown via-accent-orange/80 to-ink'
          : 'bg-primary'
      )}
    >
      <header className="flex items-center justify-between px-6 py-5 text-xs uppercase tracking-[0.3em] text-white/60">
        <div className="flex flex-col gap-1">
          <span>{phaseLabels[currentPhase] ?? 'Sessão'}</span>
          <span className="text-[10px] tracking-[0.35em] text-white/45">
            {isRunning ? (isPaused ? 'Pausado' : 'Em andamento') : 'Parado'}
          </span>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 gap-2 rounded-full border border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
            Fechar
          </Button>
        )}
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
          {isBreakPhase && (
            <div className="animate-pulse rounded-xl border-2 border-accent-orange/80 bg-accent-orange/20 px-6 py-4 text-center shadow-[0_0_50px_rgba(222,122,0,0.45)]">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white">
                Pausa Obrigatória
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                Levante, hidrate-se e só retome quando terminar a pausa.
              </p>
            </div>
          )}

          <div className="grid gap-8 md:grid-cols-2">
            {[timeBlocks.left, timeBlocks.right].map((value, index) => (
              <div
                key={`${value}-${index}`}
                className={cn(
                  'flex min-h-[50vh] items-center justify-center rounded-lg border bg-gradient-to-b shadow-[0_25px_80px_rgba(0,0,0,0.4)] transition-colors duration-500',
                  isBreakPhase
                    ? 'border-accent-orange/70 from-accent-orange/25 via-accent-brown/30 to-ink shadow-[0_25px_120px_rgba(222,122,0,0.25)]'
                    : 'border-white/15 from-white/10 via-primary to-ink'
                )}
              >
                <span className="font-mono text-[clamp(6rem,22vw,16rem)] font-bold leading-none text-white">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="text-center text-xs uppercase tracking-[0.4em] text-white/50">
            {currentPhase === 'manual'
              ? 'Cronômetro Manual'
              : `Ciclo ${currentCycle} de ${cycles}`}
          </div>

          {isRunning && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={isPaused ? resumeTimer : pauseTimer}
                className="h-14 gap-2 rounded-lg border-white/20 bg-white/10 px-8 text-base text-white hover:bg-white/20"
              >
                {isPaused ? (
                  <>
                    <Play className="h-5 w-5" />
                    Retomar
                  </>
                ) : (
                  <>
                    <Pause className="h-5 w-5" />
                    Pausar
                  </>
                )}
              </Button>

              {currentPhase !== 'manual' && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={nextPhase}
                  className="h-14 gap-2 rounded-lg border-white/20 bg-white/10 px-8 text-base text-white hover:bg-white/20"
                >
                  <SkipForward className="h-5 w-5" />
                  Próxima Fase
                </Button>
              )}

              <Button
                variant="outline"
                size="lg"
                onClick={stopTimer}
                className="h-14 gap-2 rounded-lg border-danger/50 bg-danger/20 px-8 text-base text-white hover:bg-danger/30"
              >
                <StopCircle className="h-5 w-5" />
                Concluir
              </Button>
            </div>
          )}
        </div>
      </main>

      <footer className="flex flex-col items-center gap-3 px-6 pb-8 text-lg text-white/80">
        {project && (
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
            <span className="max-w-[400px] truncate font-medium">{project.name}</span>
          </div>
        )}
        {task && <span className="max-w-[500px] truncate text-base text-white/60">{task.title}</span>}
      </footer>
    </div>
  );
}
