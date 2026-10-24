'use client';

import { useState } from 'react';
import { Task } from '@/types';
import { useAppStore } from '@/stores/useAppStore';
import { getTaskTrackedSeconds, isTaskTimeOverrun } from '@/lib/utils';

/**
 * Gates marking a task as "done" behind a mandatory comment when its
 * accumulated tracked time exceeds the overrun threshold — management wants
 * an explanation attached (and synced to Clockfy) whenever a task runs over.
 */
export function useTaskCompletionGuard() {
  const { sessions, updateTask } = useAppStore();
  const [pendingTask, setPendingTask] = useState<Task | null>(null);
  // Coluna de destino quando a conclusão foi pedida arrastando/escolhendo uma coluna (e não por "status").
  const [pendingColumnId, setPendingColumnId] = useState<string | null>(null);

  // Compatível com quem ainda manda "status" (Meu Dia, TaskCard): o servidor traduz para a coluna.
  const requestStatusChange = (task: Task, status: Task['status']) => {
    if (status === 'done' && task.status !== 'done' && isTaskTimeOverrun(task.id, sessions)) {
      setPendingTask(task);
      setPendingColumnId(null);
      return;
    }

    updateTask(task.id, { status });
  };

  /** Move a tarefa para uma coluna do quadro; entrar na coluna de conclusão passa pelo guarda de tempo extra. */
  const requestColumnChange = (task: Task, column: { id: string; isDone: boolean }) => {
    if (task.columnId === column.id) return;
    if (column.isDone && task.status !== 'done' && isTaskTimeOverrun(task.id, sessions)) {
      setPendingTask(task);
      setPendingColumnId(column.id);
      return;
    }

    updateTask(task.id, { columnId: column.id });
  };

  const confirmPendingCompletion = () => {
    if (!pendingTask) return;
    updateTask(pendingTask.id, pendingColumnId ? { columnId: pendingColumnId } : { status: 'done' });
    setPendingTask(null);
    setPendingColumnId(null);
  };

  const cancelPendingCompletion = () => {
    setPendingTask(null);
    setPendingColumnId(null);
  };

  const pendingTaskTrackedSeconds = pendingTask ? getTaskTrackedSeconds(pendingTask.id, sessions) : 0;

  return {
    pendingTask,
    pendingTaskTrackedSeconds,
    requestStatusChange,
    requestColumnChange,
    confirmPendingCompletion,
    cancelPendingCompletion,
  };
}
