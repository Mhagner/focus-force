import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, startOfDay, endOfDay, isToday, isThisWeek } from 'date-fns';
import { FocusSession, Task, Project } from '@/types';

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
  const today = new Date();
  const projectSessions = sessions.filter(session => {
    const sessionDate = new Date(session.start);
    return isToday(sessionDate) && session.projectId === projectId;
  });
  
  return projectSessions.reduce((total, session) => total + session.durationSec, 0);
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

export function getPriorityColor(priority: 'alta' | 'media' | 'baixa'): string {
  switch (priority) {
    case 'alta': return 'text-red-400 bg-red-950/50';
    case 'media': return 'text-yellow-400 bg-yellow-950/50';
    case 'baixa': return 'text-green-400 bg-green-950/50';
    default: return 'text-gray-400 bg-gray-950/50';
  }
}

export function getStatusColor(status: 'todo' | 'doing' | 'done'): string {
  switch (status) {
    case 'todo': return 'text-gray-400 bg-gray-950/50';
    case 'doing': return 'text-blue-400 bg-blue-950/50';
    case 'done': return 'text-green-400 bg-green-950/50';
    default: return 'text-gray-400 bg-gray-950/50';
  }
}