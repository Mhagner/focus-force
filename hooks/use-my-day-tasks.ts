'use client';

import { useMemo } from 'react';
import { isToday } from 'date-fns';
import { useAppStore } from '@/stores/useAppStore';
import { calculateTaskPriorityInsight, getTodayTasks } from '@/lib/utils';
import type { Task } from '@/types';

export function useMyDayTasks() {
  const { tasks, projects, sessions } = useAppStore();

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

  return { pending, completed, projectMap };
}
