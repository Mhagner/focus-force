'use client';

import { PomodoroTimer } from '@/components/focus/PomodoroTimer';

export default function FocusPage() {
  return (
    <div className="p-6 min-h-full flex items-center justify-center">
      <div className="w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Sessão de Foco</h1>
          <p className="text-gray-400">
            Concentre-se no que importa com timer Pomodoro ou manual
          </p>
        </div>
        
        <PomodoroTimer />
      </div>
    </div>
  );
}