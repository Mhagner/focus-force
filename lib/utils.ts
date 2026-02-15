import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, startOfDay, endOfDay, isToday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FocusSession, Task, Project } from '@/types';
import jsPDF from 'jspdf';

export type TaskDueLevel = 'overdue' | 'today' | 'upcoming' | null;

type DueSource = 'task' | 'project' | 'subtask';

export type TaskDueSignal = {
  source: DueSource;
  level: Exclude<TaskDueLevel, null>;
  date: Date;
  subtaskId?: string;
  subtaskTitle?: string;
};

export type TaskNotification = {
  id: string;
  taskId: string;
  taskTitle: string;
  projectName: string;
  level: Exclude<TaskDueLevel, null>;
  message: string;
};

export type TaskPriorityRiskLevel = 'baixo' | 'medio' | 'alto' | 'critico';

export type TaskPriorityInsight = {
  taskId: string;
  score: number;
  riskLevel: TaskPriorityRiskLevel;
  reasons: string[];
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatFriendlyDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return format(date, 'dd/MM/yyyy');
}

export function formatDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function getTodayHours(sessions: FocusSession[]): number {
  const today = new Date();
  const todaySessions = sessions.filter(session => {
    const sessionDate = new Date(session.start);
    return isToday(sessionDate);
  });
  
  return todaySessions.reduce((total, session) => total + session.durationSec, 0);
}

export function getWeekHours(sessions: FocusSession[]): number {
  const weekSessions = sessions.filter(session => {
    const sessionDate = new Date(session.start);
    return isThisWeek(sessionDate, { weekStartsOn: 1 }); // Monday start
  });
  
  return weekSessions.reduce((total, session) => total + session.durationSec, 0);
}

export function getTodayTasks(tasks: Task[]): Task[] {
  return tasks.filter(task => 
    task.plannedFor === 'today' || task.plannedFor === format(new Date(), 'yyyy-MM-dd')
  );
}

export function getTaskCompletionRate(tasks: Task[]): number {
  const todayTasks = getTodayTasks(tasks);
  if (todayTasks.length === 0) return 0;
  
  const completedTasks = todayTasks.filter(task => task.status === 'done');
  return Math.round((completedTasks.length / todayTasks.length) * 100);
}

export function getProjectHoursToday(sessions: FocusSession[], projectId: string): number {
  return getProjectHoursForDate(sessions, projectId, new Date());
}

export function getProjectHoursForDate(
  sessions: FocusSession[],
  projectId: string,
  date: Date
): number {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const projectSessions = sessions.filter(session => {
    const sessionDate = new Date(session.start);
    return session.projectId === projectId && sessionDate >= dayStart && sessionDate <= dayEnd;
  });

  return projectSessions.reduce((total, session) => total + session.durationSec, 0);
}

export function getTotalWorkSecondsForDate(sessions: FocusSession[], date: Date): number {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const daySessions = sessions.filter(session => {
    const sessionDate = new Date(session.start);
    return sessionDate >= dayStart && sessionDate <= dayEnd;
  });

  return daySessions.reduce((total, session) => total + session.durationSec, 0);
}

export function getHoursByProject(sessions: FocusSession[], projects: Project[]) {
  return projects.map(project => ({
    name: project.name,
    hours: getTodayHours(sessions.filter(s => s.projectId === project.id)) / 3600,
    color: project.color,
  }));
}

export function getDailyHours(sessions: FocusSession[], days: number = 7) {
  const result = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const daySessions = sessions.filter(session => {
      const sessionDate = new Date(session.start);
      return sessionDate >= dayStart && sessionDate <= dayEnd;
    });
    
    const hours = daySessions.reduce((total, session) => total + session.durationSec, 0) / 3600;
    
    result.push({
      date: format(date, 'dd/MM'),
      hours: Number(hours.toFixed(1)),
    });
  }
  
  return result;
}

export function exportToCsv(data: any[], filename: string) {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPdf(data: any[], filename: string) {
  if (data.length === 0) return;

  const doc = new jsPDF({ orientation: 'landscape' });
  const headers = Object.keys(data[0]);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const columnWidth = (pageWidth - 20) / headers.length;
  let y = 10;

  doc.setFontSize(10);
  headers.forEach((header, i) => {
    doc.text(header, 10 + i * columnWidth, y, { maxWidth: columnWidth - 2 });
  });

  y += 8;

  data.forEach(row => {
    headers.forEach((header, i) => {
      const text = String(row[header] ?? '');
      const lines = doc.splitTextToSize(text, columnWidth - 2);
      doc.text(lines, 10 + i * columnWidth, y);
    });
    y += 8;
    if (y > pageHeight - 10) {
      doc.addPage();
      y = 10;
      headers.forEach((header, i) => {
        doc.text(header, 10 + i * columnWidth, y, { maxWidth: columnWidth - 2 });
      });
      y += 8;
    }
  });

  doc.save(filename);
}

export function getPriorityColor(priority: 'alta' | 'media' | 'baixa'): string {
  switch (priority) {
    case 'alta': return 'text-red-400 bg-red-950/50';
    case 'media': return 'text-yellow-400 bg-yellow-950/50';
    case 'baixa': return 'text-green-400 bg-green-950/50';
    default: return 'text-gray-400 bg-gray-950/50';
  }
}

export function getStatusColor(status: 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done'): string {
  switch (status) {
    case 'todo': return 'text-gray-400 bg-gray-950/50';
    case 'call_agendada': return 'text-amber-400 bg-amber-950/50';
    case 'pronta_elaboracao': return 'text-purple-400 bg-purple-950/50';
    case 'doing': return 'text-blue-400 bg-blue-950/50';
    case 'done': return 'text-green-400 bg-green-950/50';
    default: return 'text-gray-400 bg-gray-950/50';
  }
}

function normalizeToDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toValidDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return normalizeToDay(date);
}

function getDueLevel(date: Date, baseDate: Date, upcomingWindowInDays: number): Exclude<TaskDueLevel, null> | null {
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / dayMs);
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= upcomingWindowInDays) return 'upcoming';
  return null;
}

export function getTaskDueSignals(
  task: Task,
  project?: Project,
  now: Date = new Date(),
  upcomingWindowInDays: number = 3,
): TaskDueSignal[] {
  if (task.status === 'done') return [];

  const baseDate = normalizeToDay(now);
  const signals: TaskDueSignal[] = [];
  const taskDate = toValidDate(task.estimatedDeliveryDate);
  const projectDate = toValidDate(project?.estimatedDeliveryDate);

  if (taskDate) {
    const level = getDueLevel(taskDate, baseDate, upcomingWindowInDays);
    if (level) signals.push({ source: 'task', level, date: taskDate });
  }

  if (projectDate) {
    const level = getDueLevel(projectDate, baseDate, upcomingWindowInDays);
    if (level) signals.push({ source: 'project', level, date: projectDate });
  }

  for (const subtask of task.subtasks ?? []) {
    if (subtask.completed) continue;
    const subtaskDate = toValidDate(subtask.estimatedDeliveryDate);
    if (!subtaskDate) continue;
    const level = getDueLevel(subtaskDate, baseDate, upcomingWindowInDays);
    if (!level) continue;
    signals.push({
      source: 'subtask',
      level,
      date: subtaskDate,
      subtaskId: subtask.id,
      subtaskTitle: subtask.title,
    });
  }

  return signals;
}

export function getTaskHighestDueLevel(signals: TaskDueSignal[]): TaskDueLevel {
  if (signals.some(signal => signal.level === 'overdue')) return 'overdue';
  if (signals.some(signal => signal.level === 'today')) return 'today';
  if (signals.some(signal => signal.level === 'upcoming')) return 'upcoming';
  return null;
}

export function buildTaskNotifications(tasks: Task[], projects: Project[]): TaskNotification[] {
  const projectMap = projects.reduce<Record<string, Project>>((acc, project) => {
    acc[project.id] = project;
    return acc;
  }, {});

  const notifications: TaskNotification[] = [];

  for (const task of tasks) {
    const project = projectMap[task.projectId];
    if (!project) continue;
    const signals = getTaskDueSignals(task, project);

    for (const signal of signals) {
      const sourceText =
        signal.source === 'task'
          ? 'na entrega da tarefa'
          : signal.source === 'project'
            ? 'na entrega do projeto'
            : `na subtarefa "${signal.subtaskTitle ?? 'checklist'}"`;

      const levelText =
        signal.level === 'overdue' ? 'Atrasada' : signal.level === 'today' ? 'Vence hoje' : 'Próxima do prazo';

      notifications.push({
        id: `${task.id}-${signal.source}-${signal.subtaskId ?? signal.subtaskTitle ?? signal.date.toISOString()}-${signal.level}`,
        taskId: task.id,
        taskTitle: task.title,
        projectName: project.name,
        level: signal.level,
        message: `${levelText}: ${task.title} (${sourceText})`,
      });
    }
  }

  const levelWeight = { overdue: 0, today: 1, upcoming: 2 };
  return notifications.sort((a, b) => levelWeight[a.level] - levelWeight[b.level]);
}

function getTaskPriorityRiskLevel(score: number): TaskPriorityRiskLevel {
  if (score >= 80) return 'critico';
  if (score >= 60) return 'alto';
  if (score >= 40) return 'medio';
  return 'baixo';
}

export function calculateTaskPriorityInsight(
  task: Task,
  project: Project | undefined,
  sessions: FocusSession[],
  now: Date = new Date(),
): TaskPriorityInsight {
  if (task.status === 'done') {
    return {
      taskId: task.id,
      score: 0,
      riskLevel: 'baixo',
      reasons: ['Já concluída'],
    };
  }

  let score = 0;
  const reasons: string[] = [];
  const priority = task.priority ?? 'media';

  const priorityWeight: Record<'alta' | 'media' | 'baixa', number> = {
    alta: 28,
    media: 18,
    baixa: 10,
  };

  score += priorityWeight[priority];
  if (priority === 'alta') reasons.push('Prioridade alta');

  const dueLevel = getTaskHighestDueLevel(getTaskDueSignals(task, project, now));
  if (dueLevel === 'overdue') {
    score += 38;
    reasons.push('Prazo atrasado');
  } else if (dueLevel === 'today') {
    score += 30;
    reasons.push('Vence hoje');
  } else if (dueLevel === 'upcoming') {
    score += 20;
    reasons.push('Prazo próximo');
  }

  const statusWeight = {
    todo: 16,
    call_agendada: 12,
    pronta_elaboracao: 10,
    doing: 6,
    done: 0,
  } as const;

  score += statusWeight[(task.status ?? 'todo') as keyof typeof statusWeight] ?? 10;

  if (task.estimateMin == null) {
    score += 8;
    reasons.push('Sem estimativa de esforço');
  } else if (task.estimateMin <= 60) {
    score += 10;
    reasons.push('Curta duração (ganho rápido)');
  } else if (task.estimateMin <= 180) {
    score += 6;
  } else {
    score += 2;
  }

  const todayISO = format(now, 'yyyy-MM-dd');
  if (task.plannedFor === 'today' || task.plannedFor === todayISO) {
    score += 6;
    reasons.push('Planejada para hoje');
  }

  const taskSessions = sessions.filter(session => session.taskId === task.id);
  const trackedSeconds = taskSessions.reduce((sum, session) => sum + session.durationSec, 0);
  if (task.estimateMin && trackedSeconds > 0) {
    const progressRatio = trackedSeconds / (task.estimateMin * 60);
    if (progressRatio >= 0.9) {
      score -= 8;
      reasons.push('Quase concluída pelo tempo já investido');
    } else if (progressRatio <= 0.25) {
      score += 6;
      reasons.push('Baixo avanço até agora');
    }
  }

  if ((task.subtasks?.length ?? 0) > 0) {
    const totalSubtasks = task.subtasks?.length ?? 0;
    const doneSubtasks = task.subtasks?.filter(subtask => subtask.completed).length ?? 0;
    if (totalSubtasks > 0 && doneSubtasks / totalSubtasks <= 0.2) {
      score += 6;
      reasons.push('Checklist com baixo progresso');
    }
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    taskId: task.id,
    score: boundedScore,
    riskLevel: getTaskPriorityRiskLevel(boundedScore),
    reasons: reasons.slice(0, 3),
  };
}
