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

  const requestStatusChange = (task: Task, status: Task['status']) => {
    if (status === 'done' && task.status !== 'done' && isTaskTimeOverrun(task.id, sessions)) {
      setPendingTask(task);
      return;
    }

    updateTask(task.id, { status });
  };

  const confirmPendingCompletion = () => {
    if (!pendingTask) return;
    updateTask(pendingTask.id, { status: 'done' });
    setPendingTask(null);
  };

  const cancelPendingCompletion = () => setPendingTask(null);

  const pendingTaskTrackedSeconds = pendingTask ? getTaskTrackedSeconds(pendingTask.id, sessions) : 0;

  return {
    pendingTask,
    pendingTaskTrackedSeconds,
    requestStatusChange,
    confirmPendingCompletion,
    cancelPendingCompletion,
  };
}
