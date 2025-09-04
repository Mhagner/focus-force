'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTimerStore } from '@/stores/useTimerStore';
import { useAppStore } from '@/stores/useAppStore';
import { formatTime } from '@/lib/utils';
import { ProjectBadge } from '@/components/ui/project-badge';
import { Play, Pause, Square, RotateCcw, SkipForward } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function PomodoroTimer() {
  const {
    isRunning,
    isPaused,
    currentPhase,
    timeRemaining,
    totalTime,
    currentCycle,
    cycles,
    selectedProjectId,
    selectedTaskId,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    nextPhase,
    tick,
    restoreState,
  } = useTimerStore();

  const { projects, tasks } = useAppStore();

  // Restore timer state on mount
  useEffect(() => {
    restoreState();
  }, [restoreState]);

  // Timer tick effect
  useEffect(() => {
    if (isRunning && !isPaused) {
      const interval = setInterval(() => {
        tick();
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isRunning, isPaused, tick]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isRunning) {
            isPaused ? resumeTimer() : pauseTimer();
          }
          break;
        case 'r':
          e.preventDefault();
          resetTimer();
          break;
        case 'n':
          e.preventDefault();
          if (currentPhase !== 'manual') {
            nextPhase();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, isPaused, currentPhase, pauseTimer, resumeTimer, resetTimer, nextPhase]);

  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;
  
  const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;
  
  const phaseLabels = {
    work: 'Trabalho',
    'short-break': 'Pausa Curta',
    'long-break': 'Pausa Longa',
    manual: 'Cronômetro',
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8 bg-gray-900/50 border-gray-800">
        {/* Phase and Project Info */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            {phaseLabels[currentPhase]}
          </h2>
          
          {selectedProject && (
            <div className="flex justify-center mb-4">
              <ProjectBadge 
                name={selectedProject.name} 
                color={selectedProject.color} 
                size="lg" 
              />
            </div>
          )}
          
          {selectedTask && (
            <p className="text-gray-400 mb-2">{selectedTask.title}</p>
          )}
          
          {currentPhase !== 'manual' && cycles > 0 && (
            <p className="text-sm text-gray-500">
              Ciclo {currentCycle} de {cycles}
            </p>
          )}
        </div>

        {/* Timer Display */}
        <div className="text-center mb-8">
          <div className="text-6xl font-mono font-bold text-white mb-4">
            {formatTime(timeRemaining)}
          </div>
          
          <Progress 
            value={progress}
            className="h-3 mb-4"
          />
          
          <p className="text-gray-400">
            {isRunning ? (isPaused ? 'Pausado' : 'Em execução') : 'Parado'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-6">
          <Button
            variant="outline"
            size="lg"
            onClick={isRunning ? (isPaused ? resumeTimer : pauseTimer) : undefined}
            disabled={!isRunning}
            className="w-24"
          >
            {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={stopTimer}
            disabled={!isRunning && !isPaused}
            className="w-24"
          >
            <Square className="h-5 w-5" />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={resetTimer}
            disabled={!isRunning && !isPaused}
            className="w-24"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          
          {currentPhase !== 'manual' && (
            <Button
              variant="outline"
              size="lg"
              onClick={nextPhase}
              disabled={!isRunning}
              className="w-24"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Keyboard Shortcuts */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">Atalhos do teclado:</p>
          <div className="flex justify-center gap-4 text-xs text-gray-600">
            <span><kbd className="bg-gray-800 px-1 rounded">Espaço</kbd> Pausar/Retomar</span>
            <span><kbd className="bg-gray-800 px-1 rounded">R</kbd> Reset</span>
            {currentPhase !== 'manual' && (
              <span><kbd className="bg-gray-800 px-1 rounded">N</kbd> Próxima Fase</span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}