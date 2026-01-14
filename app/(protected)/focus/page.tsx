'use client';

import { useState } from 'react';
import { PomodoroTimer } from '@/components/focus/PomodoroTimer';
import { FullscreenTimer } from '@/components/focus/FullscreenTimer';
import { Button } from '@/components/ui/button';
import { Expand, Minimize } from 'lucide-react';
import { useTimerStore } from '@/stores/useTimerStore';

export default function FocusPage() {
  const [isFullscreenView, setIsFullscreenView] = useState(false);
  const { isRunning } = useTimerStore();

  if (isFullscreenView) {
    return (
      <div className="absolute inset-0 z-10">
        <FullscreenTimer onClose={() => setIsFullscreenView(false)} />
      </div>
    );
  }

  return (
    <div className="p-6 min-h-full flex items-center justify-center">
      <div className="w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-3xl font-bold text-white">Sessão de Foco</h1>
            {isRunning && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreenView(true)}
                className="gap-2 border-neutral-700 bg-neutral-800/50 text-neutral-200 hover:bg-neutral-700"
              >
                <Expand className="h-4 w-4" />
                Tela Cheia
              </Button>
            )}
          </div>
          <p className="text-gray-400">
            Concentre-se no que importa com timer Pomodoro ou manual
          </p>
        </div>

        <PomodoroTimer />
      </div>
    </div>
  );
}