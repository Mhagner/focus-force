'use client';

import { Card } from '@/components/ui/card';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ProjectBadge } from '@/components/ui/project-badge';
import { formatFriendlyDate, getTaskDueSignals, getTaskHighestDueLevel } from '@/lib/utils';
import { Play, Calendar, Clock, MoreVertical, ExternalLink, MessageSquare, CheckCircle2, AlertCircle, Zap, Check } from 'lucide-react';
import { useTimerStore } from '@/stores/useTimerStore';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useAppStore } from '@/stores/useAppStore';

export function TaskCard({ task, onEdit, disableCardClick, priorityScore, isTopFive }: any) {
  const { projects, updateTask, deleteTask } = useAppStore();
  const { startTimer } = useTimerStore();
  const router = useRouter();

  const project = useMemo(() => projects.find(p => p.id === task.projectId), [projects, task.projectId]);
  if (!project) return null;

  const highestDueLevel = getTaskHighestDueLevel(getTaskDueSignals(task, project));

  // Estilização de borda e fundo para urgência
  const statusStyles = {
    overdue: "border-l-4 border-l-red-500 bg-red-500/10 shadow-sm",
    today: "border-l-4 border-l-amber-500 bg-amber-500/10",
    upcoming: "border-l-4 border-l-blue-500 bg-blue-500/5",
    default: "border-l-4 border-l-transparent bg-gray-900/40"
  };

  const currentStyle = statusStyles[highestDueLevel as keyof typeof statusStyles] || statusStyles.default;

  return (
    <Card
      className={clsx(
        'group relative flex flex-col gap-3 overflow-hidden rounded-xl border border-gray-800/70 p-4 transition-all hover:border-gray-600',
        currentStyle,
        isTopFive && "ring-1 ring-blue-500/30"
      )}
      onClick={() => !disableCardClick && router.push(`/tasks/${task.id}`)}
    >
      {/* 1. Header: Badges e Menu */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {isTopFive && (
            <span className="flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-black text-white uppercase tracking-tight shadow-lg shadow-blue-900/20">
              <Zap className="h-3 w-3 fill-current" /> Priority Focus
            </span>
          )}

          {highestDueLevel === 'overdue' && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-red-500 animate-pulse">
              <AlertCircle className="h-3 w-3" /> Atrasado
            </span>
          )}

          {highestDueLevel === 'today' && (
            <span className="text-[10px] font-bold uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Hoje
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {priorityScore && (
            <span className="font-mono text-xs font-bold text-blue-400/70">{priorityScore}pts</span>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-white transition-colors">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2. Título e Descrição */}
      <div className="space-y-1">
        <h4 className={clsx(
          "line-clamp-1 text-base font-bold transition-colors leading-tight",
          highestDueLevel === 'overdue' ? "text-red-200" : "text-white group-hover:text-blue-400"
        )}>
          {task.title}
        </h4>
        {task.description && (
          <p className="line-clamp-1 text-xs text-gray-500">{task.description}</p>
        )}
      </div>

      {/* 3. Metadados */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs border-y border-gray-800/40 py-2.5">
        <ProjectBadge name={project.name} color={project.color} size="sm" />

        <div className={clsx("flex items-center gap-1.5", highestDueLevel === 'overdue' ? "text-red-400 font-bold" : "text-gray-400")}>
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatFriendlyDate(task.estimatedDeliveryDate)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{task.estimateMin || '--'} min</span>
        </div>
      </div>

      {/* 4. Footer: Ações Principais (Botões Maiores) */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {/* Botão de Mensagens Maior */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 border-gray-800 bg-gray-800/20 px-3 text-xs text-gray-400 hover:bg-gray-800 hover:text-white"
            onClick={(e) => { e.stopPropagation(); router.push(`/tasks/${task.id}`); }}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="font-semibold">{task.comments?.length || 0}</span>
          </Button>

          {task.salesforceOppUrl && (
            <a href={task.salesforceOppUrl} target="_blank" className="p-2.5 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Start Maior e com Destaque */}
          <Button
            size="icon"
            className="h-9 w-9 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 hover:scale-105 transition-all"
            onClick={(e) => { e.stopPropagation(); startTimer('pomodoro', project.id, task.id); }}
          >
            <Play className="h-4 w-4 fill-current ml-0.5" />
          </Button>

          {/* Botão de Concluir Verde */}
          <Button
            size="sm"
            className={clsx(
              "h-9 px-4 text-xs font-bold transition-all",
              task.status === 'done'
                ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20"
            )}
            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { status: 'done' }); }}
          >
            {task.status === 'done' ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Feito
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 stroke-[3]" /> Concluir
              </div>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}