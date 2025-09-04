'use client';

import { Card } from '@/components/ui/card';
import { useAppStore } from '@/stores/useAppStore';
import { formatDuration, getTodayHours, getWeekHours, getTodayTasks, getTaskCompletionRate } from '@/lib/utils';
import { Clock, Calendar, CheckCircle2, Target } from 'lucide-react';

export function StatsCards() {
  const { sessions, tasks, projects } = useAppStore();
  
  const todayHours = getTodayHours(sessions);
  const weekHours = getWeekHours(sessions);
  const todayTasks = getTodayTasks(tasks);
  const completionRate = getTaskCompletionRate(tasks);
  const activeProjects = projects.filter(p => p.active).length;

  const stats = [
    {
      title: 'Horas Hoje',
      value: formatDuration(todayHours),
      icon: Clock,
      color: 'text-blue-400',
    },
    {
      title: 'Horas na Semana', 
      value: formatDuration(weekHours),
      icon: Calendar,
      color: 'text-green-400',
    },
    {
      title: 'Projetos Ativos',
      value: activeProjects.toString(),
      icon: Target,
      color: 'text-purple-400',
    },
    {
      title: 'Taxa de Conclusão',
      value: `${completionRate}%`,
      subtitle: `${todayTasks.filter(t => t.status === 'done').length}/${todayTasks.length} tarefas`,
      icon: CheckCircle2,
      color: 'text-orange-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="p-6 bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">{stat.title}</p>
              <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              {stat.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
              )}
            </div>
          
          </div>
        </Card>
      ))}
    </div>
  );
}