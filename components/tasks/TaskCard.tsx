'use client';

import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Task } from '@/types';
import { useAppStore } from '@/stores/useAppStore';
import { ProjectBadge } from '@/components/ui/project-badge';
import { PriorityTag } from '@/components/ui/priority-tag';
import { formatDuration, formatFriendlyDate } from '@/lib/utils';
import { Play, Calendar, Clock, MoreVertical, ExternalLink } from 'lucide-react';
import { useTimerStore } from '@/stores/useTimerStore';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const { projects, updateTask, deleteTask } = useAppStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const { startTimer, switchTask, isRunning } = useTimerStore();
  const router = useRouter();

  const project = projects.find(p => p.id === task.projectId);
  if (!project) return null;

  const handleStatusChange = (newStatus: 'todo' | 'doing' | 'done') => {
    updateTask(task.id, { status: newStatus });
  };

  const todayISO = new Date().toISOString().split('T')[0];
  const isPlannedForToday = task.plannedFor === 'today' || task.plannedFor === todayISO;

  const handlePlanForToday = () => {
    const newPlannedFor = isPlannedForToday ? null : 'today';
    updateTask(task.id, { plannedFor: newPlannedFor });
  };

  const estimatedDeliveryDate = project.estimatedDeliveryDate
    ? formatFriendlyDate(project.estimatedDeliveryDate)
    : '';

  const salesforceLink = project.salesforceOppUrl ?? '';
  const repoLink = project.sharepointRepoUrl ?? '';

  const hasEstimatedDelivery = Boolean(estimatedDeliveryDate);
  const hasSalesforceLink = Boolean(salesforceLink);
  const hasRepoLink = Boolean(repoLink);

  return (
    <Card className="p-4 bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <PriorityTag priority={task.priority || 'media'} />
          {isPlannedForToday && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950/50 text-blue-400 text-xs">
              <Calendar className="h-3 w-3" />
              Hoje
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border-gray-700">
            <DropdownMenuItem onClick={() => onEdit(task)} className="cursor-pointer">
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handlePlanForToday} className="cursor-pointer">
              {isPlannedForToday ? 'Remover de hoje' : 'Planejar para hoje'}
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
              className="cursor-pointer text-red-400"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h4 className="font-medium text-white mb-2">{task.title}</h4>

      {task.description && (
        <p className="text-sm text-gray-400 mb-3">{task.description}</p>
      )}

      <div className="flex items-center justify-between mb-3">
        <ProjectBadge
          name={project.name}
          color={project.color}
          size="sm"
          href={`/projects?focusId=${project.id}&editProjectId=${project.id}`}
        />
        {task.estimateMin && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            {formatDuration(task.estimateMin * 60)}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-gray-800 bg-gray-900/40 p-3 text-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800/70">
            <Calendar className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-gray-500">Entrega prevista</span>
            <span className={hasEstimatedDelivery ? 'text-white font-medium' : 'text-gray-500'}>
              {hasEstimatedDelivery ? estimatedDeliveryDate : 'Não informada'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800/70">
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-gray-500">Oportunidade Salesforce</span>
            {hasSalesforceLink ? (
              <a
                href={salesforceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                Abrir oportunidade
              </a>
            ) : (
              <span className="text-gray-500">Não informado</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800/70">
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-gray-500">Repositório do projeto</span>
            {hasRepoLink ? (
              <a
                href={repoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                Abrir repositório
              </a>
            ) : (
              <span className="text-gray-500">Não informado</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['todo', 'doing', 'done'] as const).map((status) => (
            <Button
              key={status}
              variant={task.status === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusChange(status)}
              className="text-xs capitalize"
            >
              {status === 'todo' ? 'Todo' : status === 'doing' ? 'Fazendo' : 'Feito'}
            </Button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-blue-400 hover:text-blue-300"
          onClick={() => {
            if (!project) return;
            if (isRunning) {
              switchTask(project.id, task.id);
            } else {
              startTimer('pomodoro', project.id, task.id);
            }
            router.push('/focus');
          }}
        >
          <Play className="h-4 w-4 mr-1" />
          Foco
        </Button>
      </div>
    </Card>
  );
}