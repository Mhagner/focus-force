'use client';

import { useState } from 'react';
import { Search, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTimerStore } from '@/stores/useTimerStore';
import { useAppStore } from '@/stores/useAppStore';
import { formatTime } from '@/lib/utils';
import { FocusDialog } from '@/components/focus/FocusDialog';

export function TopNav() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFocusDialogOpen, setIsFocusDialogOpen] = useState(false);
  
  const { 
    isRunning, 
    isPaused, 
    timeRemaining, 
    currentPhase,
    selectedProjectId,
    pauseTimer, 
    resumeTimer, 
    stopTimer,
    resetTimer 
  } = useTimerStore();
  
  const { projects } = useAppStore();
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  return (
    <>
      <header className="bg-gray-950/80 backdrop-blur border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar projetos, tarefas... (⌘K)"
                className="w-80 pl-10 bg-gray-900/50 border-gray-700 focus:border-blue-500"
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={handleKeyDown}
              />
            </div>
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
          </div>
        </div>
      </header>

      <FocusDialog 
        open={isFocusDialogOpen} 
        onOpenChange={setIsFocusDialogOpen}
      />
    </>
  );
}