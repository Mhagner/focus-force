'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useTimerStore } from '@/stores/useTimerStore';
import { cn, formatTime } from '@/lib/utils';

const TIMER_STORAGE_KEY = 'focusforge/timer-state';

const phaseLabels: Record<string, string> = {
  work: 'Trabalho',
  'short-break': 'Pausa Curta',
  'long-break': 'Pausa Longa',
  manual: 'Cronômetro',
};

/**
 * Read-only view: mirrors the timer persisted by the main window. It never
 * ticks the store nor writes to storage; the countdown is derived for display.
 */
export function MiniTimerView() {
  const { isRunning, isPaused, currentPhase, timeRemaining, lastTickAt, selectedProjectId, hydrateFromStorage } =
    useTimerStore();
  const projects = useAppStore((s) => s.projects);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    hydrateFromStorage();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === TIMER_STORAGE_KEY) hydrateFromStorage();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!isRunning || isPaused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isRunning, isPaused]);

  let remaining = timeRemaining;
  if (isRunning && !isPaused && lastTickAt) {
    const ref = Date.parse(lastTickAt);
    if (!Number.isNaN(ref)) {
      remaining = Math.max(timeRemaining - Math.floor((now - ref) / 1000), 0);
    }
  }

  const project = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : undefined;
  const isBreak = currentPhase === 'short-break' || currentPhase === 'long-break';

  return (
    <div
      className={cn(
        'flex min-h-screen w-full flex-col items-center justify-center gap-3 text-white',
        isBreak ? 'bg-accent-orange' : 'bg-primary',
      )}
    >
      <span className="text-xs uppercase tracking-[0.3em] text-white/60">
        {phaseLabels[currentPhase] ?? 'Sessão'} · {isRunning ? (isPaused ? 'Pausado' : 'Em andamento') : 'Parado'}
      </span>
      <span className="font-mono text-6xl font-bold leading-none">{formatTime(remaining)}</span>
      {project && (
        <span className="flex items-center gap-2 text-sm text-white/80">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} />
          {project.name}
        </span>
      )}
    </div>
  );
}
