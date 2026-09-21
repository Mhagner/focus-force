'use client';

import { Card } from '@/components/ui/card';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ProjectBadge } from '@/components/ui/project-badge';
import { formatDuration, formatFriendlyDate, getTaskDueSignals, getTaskHighestDueLevel, getTaskTrackedSeconds, isTaskTimeOverrun } from '@/lib/utils';
import { Play, Calendar, Clock, MoreVertical, ExternalLink, MessageSquare, CheckCircle2, AlertCircle, Zap, Check, TimerReset } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { useAppStore } from '@/stores/useAppStore';
import { FocusDialog } from '@/components/focus/FocusDialog';
import { TaskOverrunCommentDialog } from '@/components/tasks/TaskOverrunCommentDialog';
import { useTaskCompletionGuard } from '@/hooks/use-task-completion-guard';

export function TaskCard({ task, onEdit, disableCardClick, priorityScore, isTopFive }: any) {
  const { projects, deleteTask, sessions } = useAppStore();
  const [isFocusDialogOpen, setIsFocusDialogOpen] = useState(false);
  const router = useRouter();
  const { pendingTask, pendingTaskTrackedSeconds, requestStatusChange, confirmPendingCompletion, cancelPendingCompletion } = useTaskCompletionGuard();

  const project = useMemo(() => projects.find(p => p.id === task.projectId), [projects, task.projectId]);
  if (!project) return null;

  const highestDueLevel = getTaskHighestDueLevel(getTaskDueSignals(task, project));
  const trackedSeconds = getTaskTrackedSeconds(task.id, sessions);
  const isTimeOverrun = isTaskTimeOverrun(task.id, sessions);

  // Estilização de borda e fundo para urgência
  const statusStyles = {
    overdue: "border-l-4 border-l-danger bg-danger/[0.06] shadow-sm",
    today: "border-l-4 border-l-accent-orange bg-accent-orange/[0.06]",
    upcoming: "border-l-4 border-l-accent-blue bg-accent-blue/[0.04]",
    default: "border-l-4 border-l-transparent"
  };

  const currentStyle = statusStyles[highestDueLevel as keyof typeof statusStyles] || statusStyles.default;

  return (
    <Card
      className={clsx(
        'group relative flex flex-col gap-3 overflow-hidden p-4 transition-all hover:border-primary/30',
        currentStyle,
        isTopFive && "ring-1 ring-primary/30",
        isTimeOverrun && "ring-1 ring-accent-orange/40"
      )}
      onClick={() => !disableCardClick && router.push(`/tasks/${task.id}`)}
    >
      {/* 1. Header: Badges e Menu */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {isTopFive && (
            <span className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-black text-primary-foreground uppercase tracking-tight shadow-sm">
              <Zap className="h-3 w-3 fill-current" /> Priority Focus
            </span>
          )}

          {highestDueLevel === 'overdue' && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-danger animate-pulse">
              <AlertCircle className="h-3 w-3" /> Atrasado
            </span>
          )}

          {highestDueLevel === 'today' && (
            <span className="text-[10px] font-bold uppercase text-accent-orange bg-accent-orange/[0.14] px-1.5 py-0.5 rounded">
              Hoje
            </span>
          )}

          {isTimeOverrun && (
            <span
              className="flex items-center gap-1 text-[10px] font-bold uppercase text-accent-orange bg-accent-orange/[0.14] px-1.5 py-0.5 rounded"
              title={`${formatDuration(trackedSeconds)} acumuladas — acima de 2h`}
            >
              <TimerReset className="h-3 w-3" /> +2h
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {priorityScore && (
            <span className="font-mono text-xs font-bold text-primary/70">{priorityScore}pts</span>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-ink-muted hover:text-ink transition-colors">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 2. Título e Descrição */}
      <div className="space-y-1">
        <h4 className={clsx(
          "line-clamp-1 text-base font-bold transition-colors leading-tight",
          highestDueLevel === 'overdue' ? "text-danger" : "text-ink group-hover:text-primary"
        )}>
          {task.title}
        </h4>
        {task.description && (
          <p
            className="line-clamp-1 text-xs text-ink-muted hover:text-ink hover:underline cursor-pointer"
            title={`Ir para o projeto ${project.name}`}
            onClick={(e) => { e.stopPropagation(); router.push(`/projects/${project.id}`); }}
          >
            {task.description}
          </p>
        )}
      </div>

      {/* 3. Metadados */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs border-y border-border py-2.5">
        <div onClick={(e) => e.stopPropagation()}>
          <ProjectBadge name={project.name} color={project.color} size="sm" href={`/projects/${project.id}`} />
        </div>

        <div className={clsx("flex items-center gap-1.5", highestDueLevel === 'overdue' ? "text-danger font-bold" : "text-ink-muted")}>
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatFriendlyDate(task.estimatedDeliveryDate)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-ink-muted">
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
            className="h-9 gap-2 px-3 text-xs"
            onClick={(e) => { e.stopPropagation(); router.push(`/tasks/${task.id}`); }}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="font-semibold">{task.comments?.length || 0}</span>
          </Button>

          {task.salesforceOppUrl && (
            <a href={task.salesforceOppUrl} target="_blank" className="p-2.5 rounded-md bg-accent-blue/[0.1] text-accent-blue hover:bg-accent-blue/[0.18] transition-colors">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Start Maior e com Destaque */}
          <Button
            size="icon"
            className="h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-sm hover:opacity-90 hover:scale-105 transition-all"
            onClick={(e) => { e.stopPropagation(); setIsFocusDialogOpen(true); }}
          >
            <Play className="h-4 w-4 fill-current ml-0.5" />
          </Button>

          {/* Botão de Concluir */}
          <Button
            size="sm"
            className={clsx(
              "h-9 px-4 text-xs font-bold transition-all",
              task.status === 'done'
                ? "bg-success/[0.14] text-success border border-success/30"
                : "bg-success text-white hover:opacity-90 shadow-sm"
            )}
            onClick={(e) => { e.stopPropagation(); requestStatusChange(task, 'done'); }}
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

      <FocusDialog
        open={isFocusDialogOpen}
        onOpenChange={setIsFocusDialogOpen}
        initialProjectId={project.id}
        initialTaskId={task.id}
      />

      {pendingTask && (
        <TaskOverrunCommentDialog
          open={Boolean(pendingTask)}
          onOpenChange={(open) => !open && cancelPendingCompletion()}
          taskId={pendingTask.id}
          taskTitle={pendingTask.title}
          trackedSeconds={pendingTaskTrackedSeconds}
          onConfirmed={confirmPendingCompletion}
        />
      )}
    </Card>
  );
}