'use client';

import { Card } from '@/components/ui/card';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Task } from '@/types';
import { useAppStore } from '@/stores/useAppStore';
import { ProjectBadge } from '@/components/ui/project-badge';
import { PriorityTag } from '@/components/ui/priority-tag';
import { formatDuration, formatFriendlyDate, getTaskDueSignals, getTaskHighestDueLevel } from '@/lib/utils';
import { Play, Calendar, Clock, MoreVertical, ExternalLink, MessageSquare, Link as LinkIcon, CheckCircle2, Check, ListChecks, AlertTriangle, CalendarClock, Clock3 } from 'lucide-react';
import { useTimerStore } from '@/stores/useTimerStore';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import clsx from 'clsx';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  disableCardClick?: boolean;
}

/** Compact TaskCard
 * - Menor padding e gaps
 * - Título + chips inline para reduzir quebras
 * - Descrição 1 linha (line-clamp-1)
 * - Metadados em linha (badge do projeto, estimativa, entrega)
 * - Links reduzidos a ícones (com labels visuais mínimos)
 * - Controle de status via Dropdown compacto
 * - Ações reduzidas a ícones (Foco/Comentários)
 */
export function TaskCard({ task, onEdit, disableCardClick }: TaskCardProps) {
  const { projects, updateTask, deleteTask } = useAppStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const { startTimer, switchTask, isRunning } = useTimerStore();
  const router = useRouter();

  const project = useMemo(() => projects.find(p => p.id === task.projectId), [projects, task.projectId]);
  if (!project) return null;

  const dueSignals = getTaskDueSignals(task, project);
  const highestDueLevel = getTaskHighestDueLevel(dueSignals);
  const hasDueAlert = highestDueLevel !== null;

  const handleStatusChange = (
    newStatus: 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done'
  ) => {
    updateTask(task.id, { status: newStatus as any });
  };

  const todayISO = new Date().toISOString().split('T')[0];
  const isPlannedForToday = task.plannedFor === 'today' || task.plannedFor === todayISO;

  const handlePlanForToday = () => {
    const newPlannedFor = isPlannedForToday ? null : 'today';
    updateTask(task.id, { plannedFor: newPlannedFor });
  };

  const estimatedDeliveryDate = task.estimatedDeliveryDate ? formatFriendlyDate(task.estimatedDeliveryDate) : '';
  const hasEstimatedDelivery = Boolean(estimatedDeliveryDate);

  const salesforceLink = task.salesforceOppUrl ?? '';
  const repoLink = task.repoUrl ?? '';
  const hasSalesforceLink = Boolean(salesforceLink);
  const hasRepoLink = Boolean(repoLink);

  const commentCount = task.comments?.length ?? 0;
  const subtasks = task.subtasks ?? [];
  const completedSubtasks = subtasks.filter(subtask => subtask.completed).length;
  const subtaskCompletion = subtasks.length ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const STATUS_LABELS: Record<string, string> = {
    todo: 'Todo',
    call_agendada: 'Call agendada',
    pronta_elaboracao: 'Pronta p/ elaboração',
    doing: 'Fazendo',
    done: 'Feito',
  };

  return (
    <Card
      className={clsx(
        'group relative overflow-hidden rounded-xl border border-gray-800/70 bg-gray-900/60 p-3 transition-all duration-200',
        'hover:border-gray-700 hover:bg-gray-900/70',
        highestDueLevel === 'overdue' && 'border-red-600/70 bg-red-950/20',
        highestDueLevel === 'today' && 'border-amber-500/60 bg-amber-950/20',
        highestDueLevel === 'upcoming' && 'border-blue-600/60 bg-blue-950/20',
      )}
      aria-label={`Tarefa: ${task.title}`}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (disableCardClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push(`/tasks/${task.id}`);
        }
      }}
      onClick={(event) => {
        if (disableCardClick) return;
        const target = event.target as HTMLElement | null;
        if (!target) return;

        // Don't navigate when interacting with buttons/links/menus inside the card.
        if (target.closest('button, a, [role="menuitem"], [role="menu"], input, textarea, select')) {
          return;
        }

        router.push(`/tasks/${task.id}`);
      }}
    >
      {/* Header compacto */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <PriorityTag priority={task.priority || 'media'} />
            {highestDueLevel === 'overdue' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-950/80 px-1.5 py-0.5 text-[10px] text-red-300">
                <AlertTriangle className="h-3 w-3" /> Atrasada
              </span>
            )}
            {highestDueLevel === 'today' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-950/80 px-1.5 py-0.5 text-[10px] text-amber-300">
                <CalendarClock className="h-3 w-3" /> Vence hoje
              </span>
            )}
            {highestDueLevel === 'upcoming' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-950/80 px-1.5 py-0.5 text-[10px] text-blue-300">
                <Clock3 className="h-3 w-3" /> Prazo próximo
              </span>
            )}
            {isPlannedForToday && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-950/50 px-1.5 py-0.5 text-[10px] text-blue-300">
                <Calendar className="h-3 w-3" /> Hoje
              </span>
            )}
            {/* Status pill pequeno */}
            <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-200">
              <ListChecks className="h-3 w-3" /> {STATUS_LABELS[task.status as string] ?? task.status}
            </span>
          </div>

          <h4 className="truncate text-sm font-semibold leading-5 text-white" title={task.title}>
            {task.title}
          </h4>
          {task.description && (
            <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-gray-400" title={task.description}>
              {task.description}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-gray-400 hover:text-white" aria-label="Mais ações">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-gray-700 bg-gray-800/95">
            <DropdownMenuItem onClick={() => onEdit(task)} className="cursor-pointer text-sm">
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePlanForToday} className="cursor-pointer text-sm">
              {isPlannedForToday ? 'Remover de hoje' : 'Planejar para hoje'}
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-sm" onClick={() => router.push(`/tasks/${task.id}`)}>
              Abrir detalhes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                if (isDeleting) return;
                setIsDeleting(true);
                try {
                  await deleteTask(task.id);
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="cursor-pointer text-red-400 focus:text-red-300"
            >
              {isDeleting ? 'Excluindo…' : 'Excluir'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {hasDueAlert && (
        <div className="mb-2 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-gray-200">
          {dueSignals.slice(0, 2).map((signal) => (
            <p key={`${signal.source}-${signal.subtaskId ?? signal.subtaskTitle ?? signal.date.toISOString()}`} className="truncate">
              {signal.level === 'overdue' ? 'Atrasada' : signal.level === 'today' ? 'Vence hoje' : 'Próxima'} · {signal.source === 'task' ? 'Entrega da tarefa' : signal.source === 'project' ? 'Entrega do projeto' : `Checklist: ${signal.subtaskTitle}`}
            </p>
          ))}
        </div>
      )}

      {/* Metadados em linha */}
      <div className="mb-2 flex items-center gap-2 text-[11px] text-gray-400">
        <ProjectBadge
          name={project.name}
          color={project.color}
          size="sm"
          href={`/projects?focusId=${project.id}&editProjectId=${project.id}`}
        />
      </div>
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {hasEstimatedDelivery ? (
            <span className="text-gray-200">{estimatedDeliveryDate}</span>
          ) : (
            <em className="text-gray-500">sem entrega</em>
          )}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {task.estimateMin ? formatDuration(task.estimateMin * 60) : <em className="text-gray-500">s/ estim.</em>}
        </span>
      </div>
      {/* Links compactos (ícones) */}
      <div className="mb-2 flex items-center gap-1.5">
        {hasSalesforceLink ? (
          <a
            href={salesforceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex gap-2 h-7 items-center justify-center rounded-md border border-blue-900/40 bg-blue-950/30 px-2 text-[11px] text-blue-300 hover:border-blue-800 hover:bg-blue-900/30"
            aria-label="Abrir oportunidade no Salesforce"
          >
            <span>OPP</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="inline-flex h-7 items-center justify-center rounded-md border border-gray-800 bg-gray-900/40 px-2 text-[11px] text-gray-500" title="Salesforce não informado">
            <LinkIcon className="h-3.5 w-3.5" />
          </span>
        )}

        {hasRepoLink ? (
          <a
            href={repoLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex gap-2 h-7 items-center justify-center rounded-md border border-emerald-900/40 bg-emerald-950/30 px-2 text-[11px] text-emerald-300 hover:border-emerald-800 hover:bg-emerald-900/30"
            aria-label="Abrir repositório do projeto"
          >
            <span>Repo</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="inline-flex h-7 items-center justify-center rounded-md border border-gray-800 bg-gray-900/40 px-2 text-[11px] text-gray-500" title="Repositório não informado">
            <LinkIcon className="h-3.5 w-3.5" />
          </span>
        )}

        {/* Status via Dropdown compacto */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 border-gray-700 px-2 text-[11px] text-gray-200 hover:bg-gray-800">
              Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-gray-700 bg-gray-800/95">
            {(['todo', 'call_agendada', 'pronta_elaboracao', 'doing', 'done'] as const).map(s => (
              <DropdownMenuItem key={s} onClick={() => handleStatusChange(s as any)} className="text-sm">
                {STATUS_LABELS[s]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {subtasks.length > 0 && (
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-gray-300">
            <span className="inline-flex items-center gap-1">
              <ListChecks className="h-3.5 w-3.5" /> Checklist
            </span>
            <span className="font-semibold text-white">{subtaskCompletion}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
            <span
              className="block h-full rounded-full bg-blue-500"
              style={{ width: `${subtaskCompletion}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400">{completedSubtasks}/{subtasks.length} subtarefas completas</p>
        </div>
      )}

      {/* Ações compactas + progresso */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-blue-400 hover:text-blue-300"
            onClick={() => {
              if (!project) return;
              if (isRunning) {
                switchTask(project.id, task.id);
              } else {
                startTimer('pomodoro', project.id, task.id);
              }
              router.push('/focus');
            }}
            aria-label="Iniciar foco"
          >
            <Play className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 border-gray-700 px-2 text-[11px] text-gray-200 hover:bg-gray-800 hover:text-white"
            onClick={() => router.push(`/tasks/${task.id}`)}
            aria-label="Abrir detalhes e comentários"
          >
            <MessageSquare className="mr-1 h-3.5 w-3.5" /> {commentCount}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {task.status !== 'done' ? (
            <Button
              variant="default"
              size="sm"
              className="h-7 bg-emerald-600 px-2 text-[11px] text-white hover:bg-emerald-500"
              onClick={() => handleStatusChange('done')}
              aria-label="Concluir tarefa"
            >
              <Check className="mr-1 h-3.5 w-3.5" /> Concluir
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Concluída
            </span>
          )}
        </div>
      </div>

      {/* Barra de progresso fina */}
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
        <span
          className={clsx('block h-full rounded-full',
            task.status === 'done'
              ? 'bg-emerald-500'
              : task.status === 'doing'
                ? 'bg-blue-500'
                : task.status === 'call_agendada'
                  ? 'bg-amber-400'
                  : task.status === 'pronta_elaboracao'
                    ? 'bg-purple-400'
                    : 'bg-gray-600'
          )}
          style={{
            width:
              task.status === 'done' ? '100%' :
                task.status === 'doing' ? '60%' :
                  task.status === 'pronta_elaboracao' ? '40%' :
                    task.status === 'call_agendada' ? '30%' : '15%',
          }}
        />
      </div>
    </Card>
  );
}
