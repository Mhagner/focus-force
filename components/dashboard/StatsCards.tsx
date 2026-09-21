'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/stores/useAppStore';
import { formatDuration, getTodayHours, getWeekHours, getTodayTasks, getTaskCompletionRate } from '@/lib/utils';
import { Clock, Calendar, CheckCircle2, Target, BadgeDollarSign } from 'lucide-react';
import { isToday } from 'date-fns';

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function StatsCards() {
  const { sessions, tasks, projects } = useAppStore();

  const todayHours = getTodayHours(sessions);
  const weekHours = getWeekHours(sessions);
  const todayTasks = getTodayTasks(tasks);
  const completionRate = getTaskCompletionRate(tasks);
  const activeProjects = projects.filter(p => p.active).length;

  const { todayEarnings, billedProjectsCount } = useMemo(() => {
    const todaySessions = sessions.filter(s => isToday(new Date(s.start)));
    let earnings = 0;
    const billedIds = new Set<string>();

    for (const session of todaySessions) {
      const project = projects.find(p => p.id === session.projectId);
      const rate = Number(project?.hourlyRate ?? 0);
      if (rate > 0) {
        earnings += (session.durationSec / 3600) * rate;
        billedIds.add(session.projectId);
      }
    }

    return { todayEarnings: earnings, billedProjectsCount: billedIds.size };
  }, [sessions, projects]);

  const stats = [
    {
      title: 'Horas Hoje',
      value: formatDuration(todayHours),
      icon: Clock,
      color: 'text-primary',
    },
    {
      title: 'Horas na Semana',
      value: formatDuration(weekHours),
      icon: Calendar,
      color: 'text-accent-blue',
    },
    {
      title: 'Projetos Ativos',
      value: activeProjects.toString(),
      icon: Target,
      color: 'text-brand-secondary',
    },
    {
      title: 'Taxa de Conclusão',
      value: `${completionRate}%`,
      subtitle: `${todayTasks.filter(t => t.status === 'done').length}/${todayTasks.length} tarefas`,
      icon: CheckCircle2,
      color: 'text-accent-orange',
    },
    {
      title: 'Valor Acumulado Hoje',
      value: formatBRL(todayEarnings),
      subtitle: billedProjectsCount > 0
        ? `${billedProjectsCount} projeto${billedProjectsCount > 1 ? 's' : ''} com valor/hora`
        : 'Nenhum projeto com valor/hora',
      icon: BadgeDollarSign,
      color: 'text-success',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className="p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-muted">{stat.title}</p>
              <p className="text-2xl font-bold text-ink mt-1 truncate">{stat.value}</p>
              {stat.subtitle && (
                <p className="text-xs text-ink-muted/80 mt-1">{stat.subtitle}</p>
              )}
            </div>
            <stat.icon className={`h-5 w-5 shrink-0 mt-0.5 ${stat.color}`} />
          </div>
        </Card>
      ))}
    </div>
  );
}