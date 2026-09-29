'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, ChevronDown, ChevronRight, Circle, ExternalLink, Sun, X } from 'lucide-react';
import { useAppStore, subscribeToTasksChanges } from '@/stores/useAppStore';
import { useTaskCompletionGuard } from '@/hooks/use-task-completion-guard';
import { TaskOverrunCommentDialog } from '@/components/tasks/TaskOverrunCommentDialog';
import { calculateTaskPriorityInsight, getTodayTasks, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Task } from '@/types';

const REFRESH_INTERVAL_MS = 30_000;

interface MyDayProps {
  /** Standalone = rendered in the detached popup window (fills the screen). */
  standalone?: boolean;
}

export function MyDay({ standalone = false }: MyDayProps) {
  const { tasks, projects, sessions, updateTask, refreshTasks, isDataInitialized } = useAppStore();
  const {
    pendingTask,
    pendingTaskTrackedSeconds,
    requestStatusChange,
    confirmPendingCompletion,
    cancelPendingCompletion,
  } = useTaskCompletionGuard();
  const [showCompleted, setShowCompleted] = useState(true);

  // Keep in sync with edits made in other windows (board <-> popup).
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') refreshTasks().catch(() => {});
    };
    const unsubscribe = subscribeToTasksChanges(() => refreshTasks().catch(() => {}));
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [refreshTasks]);

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const { pending, completed } = useMemo(() => {
    const isVisible = (t: Task) => projectMap.get(t.projectId)?.active !== false;
    // Completing a task clears its "planned for today" flag, so completed
    // ones are picked by completion date instead (only today's).
    return {
      // Same score as the board's Priority Radar, highest first.
      pending: getTodayTasks(tasks)
        .filter((t) => t.status !== 'done' && isVisible(t))
        .map((task) => ({
          task,
          score: calculateTaskPriorityInsight(task, projectMap.get(task.projectId), sessions).score,
        }))
        .sort((a, b) => b.score - a.score)
        .map(({ task }) => task),
      completed: tasks.filter(
        (t) => t.status === 'done' && t.completedAt && isToday(new Date(t.completedAt)) && isVisible(t),
      ),
    };
  }, [tasks, projectMap, sessions]);

  const handleToggle = (task: Task, isDone: boolean) => {
    if (isDone) {
      // Reopening returns the task to the board's "todo" column and to today's list.
      updateTask(task.id, { status: 'todo', plannedFor: 'today' });
      return;
    }
    requestStatusChange(task, 'done');
  };

  const handleOpenPopup = () => {
    const features = 'width=420,height=720,menubar=no,toolbar=no,location=no,status=no';
    window.open('/my-day', 'focusforge-my-day', features);
  };

  const renderTask = (task: Task, isDone: boolean) => {
    const project = projectMap.get(task.projectId);
    return (
      <li
        key={task.id}
        className="group flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-3"
      >
        <button
          type="button"
          aria-label={isDone ? 'Reabrir tarefa' : 'Concluir tarefa'}
          onClick={() => handleToggle(task, isDone)}
          className="shrink-0 text-ink-muted transition-colors hover:text-ink"
        >
          {isDone ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-muted text-background">
              <Check className="h-3 w-3" />
            </span>
          ) : (
            <>
              <Circle className="h-5 w-5 group-hover:hidden" />
              <Check className="hidden h-5 w-5 rounded-full border border-current p-1 group-hover:block" />
            </>
          )}
        </button>

        <div className="min-w-0 flex-1">
          {project && (
            <p
              className={cn(
                'flex items-center gap-2 truncate text-sm font-semibold text-ink',
                isDone && 'text-ink-muted line-through',
              )}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
              {project.name}
            </p>
          )}
          <p className={cn('truncate text-xs text-ink-muted', isDone && 'line-through')}>{task.title}</p>
        </div>

        {!isDone && (
          <button
            type="button"
            aria-label="Remover do Meu Dia"
            title="Remover do Meu Dia"
            onClick={() => updateTask(task.id, { plannedFor: null })}
            className="shrink-0 text-ink-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </li>
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-background text-ink',
        standalone ? 'min-h-screen p-4' : 'rounded-xl border border-border p-5',
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Sun className="h-5 w-5" /> Meu Dia
          </h2>
          <p className="text-sm capitalize text-ink-muted">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        {!standalone && (
          <Button variant="ghost" size="sm" onClick={handleOpenPopup} title="Abrir em janela separada">
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </header>

      {!isDataInitialized ? (
        <p className="py-8 text-center text-sm text-ink-muted">Carregando...</p>
      ) : pending.length === 0 && completed.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">
          Nenhuma tarefa para hoje. Use “Planejar para hoje” em uma tarefa para vê-la aqui.
        </p>
      ) : (
        <>
          <ul className="space-y-2">{pending.map((t) => renderTask(t, false))}</ul>
          {pending.length === 0 && (
            <p className="py-4 text-center text-sm text-ink-muted">Tudo concluído por hoje 🎉</p>
          )}

          {completed.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="mb-2 flex items-center gap-1.5 rounded-md bg-surface px-3 py-1.5 text-sm text-ink"
              >
                {showCompleted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                Concluída <span className="ml-1 text-ink-muted">{completed.length}</span>
              </button>
              {showCompleted && <ul className="space-y-2">{completed.map((t) => renderTask(t, true))}</ul>}
            </div>
          )}
        </>
      )}

      {pendingTask && (
        <TaskOverrunCommentDialog
          open
          onOpenChange={(open) => !open && cancelPendingCompletion()}
          taskId={pendingTask.id}
          taskTitle={pendingTask.title}
          trackedSeconds={pendingTaskTrackedSeconds}
          onConfirmed={confirmPendingCompletion}
        />
      )}
    </div>
  );
}
