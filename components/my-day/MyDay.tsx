'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePathname, useRouter } from 'next/navigation';
import { Check, ChevronDown, ChevronRight, Circle, Play, Sun, X } from 'lucide-react';
import { useAppStore, subscribeToTasksChanges } from '@/stores/useAppStore';
import { useTaskCompletionGuard } from '@/hooks/use-task-completion-guard';
import { useWorkspace } from '@/hooks/use-workspace';
import { TaskOverrunCommentDialog } from '@/components/tasks/TaskOverrunCommentDialog';
import { FocusDialog } from '@/components/focus/FocusDialog';
import { useMyDayTasks } from '@/hooks/use-my-day-tasks';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

const REFRESH_INTERVAL_MS = 30_000;

export function MyDay() {
  const { updateTask, refreshTasks, isDataInitialized } = useAppStore();
  const { isStudy, labels } = useWorkspace();
  const {
    pendingTask,
    pendingTaskTrackedSeconds,
    requestStatusChange,
    confirmPendingCompletion,
    cancelPendingCompletion,
  } = useTaskCompletionGuard();
  const [showCompleted, setShowCompleted] = useState(true);
  const [focusTask, setFocusTask] = useState<Task | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Keep in sync with edits made elsewhere.
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

  const { pending, completed, projectMap } = useMyDayTasks();

  const handleToggle = (task: Task, isDone: boolean) => {
    if (isDone) {
      // Reopening returns the task to the board's "todo" column and to today's list.
      updateTask(task.id, { status: 'todo', plannedFor: 'today' });
      return;
    }
    requestStatusChange(task, 'done');
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
          aria-label={isDone ? `Reabrir ${labels.task.toLowerCase()}` : `Concluir ${labels.task.toLowerCase()}`}
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
          <>
            <button
              type="button"
              aria-label="Iniciar sessão de foco"
              title="Iniciar sessão de foco"
              onClick={() => setFocusTask(task)}
              className="shrink-0 text-ink-muted transition-colors hover:text-ink"
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Remover do Meu Dia"
              title="Remover do Meu Dia"
              onClick={() => updateTask(task.id, { plannedFor: null })}
              className="shrink-0 text-ink-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </li>
    );
  };

  return (
    <div className="flex flex-col p-4 text-ink">
      <header className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
            <Sun className="h-5 w-5" /> Meu Dia
          </h2>
          <p className="text-sm capitalize text-ink-muted">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </header>

      {!isDataInitialized ? (
        <p className="py-8 text-center text-sm text-ink-muted">Carregando...</p>
      ) : pending.length === 0 && completed.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">
          {isStudy
            ? 'Nenhum tópico para hoje. Use “Planejar para hoje” em um tópico para vê-lo aqui.'
            : 'Nenhuma tarefa para hoje. Use “Planejar para hoje” em uma tarefa para vê-la aqui.'}
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

      {focusTask && (
        <FocusDialog
          open
          onOpenChange={(open) => !open && setFocusTask(null)}
          initialProjectId={focusTask.projectId}
          initialTaskId={focusTask.id}
          onStarted={() => {
            if (pathname !== '/focus') router.push('/focus');
          }}
        />
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
