'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types';
import { useAppStore } from '@/stores/useAppStore';
import { formatDuration, formatFriendlyDate, getProjectHoursToday } from '@/lib/utils';
import { MoreVertical, Edit, Archive, ArchiveRestore, Play, MessageSquare } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
}

export function ProjectCard({ project, onEdit }: ProjectCardProps) {
  const { sessions, tasks, updateProject } = useAppStore();
  const router = useRouter();

  const isArchived = !project.active;

  const todayHours = getProjectHoursToday(sessions, project.id);
  const weekHours = sessions
    .filter(s => s.projectId === project.id)
    .reduce((total, session) => total + session.durationSec, 0);

  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const pendingTasks = projectTasks.filter(t => t.status !== 'done').length;
  const commentCount = projectTasks.reduce(
    (total, task) => total + (task.comments?.length ?? 0),
    0,
  );

  const estimatedDelivery = project.estimatedDeliveryDate
    ? formatFriendlyDate(project.estimatedDeliveryDate)
    : null;

  const isClockfyLinked = Boolean(project.clockfyProjectId);
  const clockfyStatus = project.syncWithClockfy
    ? isClockfyLinked
      ? 'linked'
      : 'pending'
    : 'disabled';

  const handleToggleArchive = () => {
    updateProject(project.id, { active: !project.active });
  };

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-ink">{project.name}</h3>
              {isArchived && (
                <Badge variant="accent-orange">
                  Arquivado
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {project.client && (
                <p className="text-sm text-ink-muted">{project.client}</p>
              )}
              <Badge
                variant={clockfyStatus === 'linked' ? 'success' : clockfyStatus === 'pending' ? 'accent-orange' : 'secondary'}
              >
                {clockfyStatus === 'linked'
                  ? 'Clockfy conectado'
                  : clockfyStatus === 'pending'
                    ? 'Clockfy pendente'
                    : 'Clockfy desativado'}
              </Badge>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-ink-muted hover:text-ink">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onEdit(project)} className="cursor-pointer">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleToggleArchive}
              className={`cursor-pointer ${isArchived ? 'text-success' : 'text-danger'}`}
            >
              {isArchived ? (
                <ArchiveRestore className="h-4 w-4 mr-2" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              {isArchived ? 'Desarquivar' : 'Arquivar'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-muted">Hoje</span>
          <span className="text-ink font-medium">
            {formatDuration(todayHours)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-muted">Esta semana</span>
          <span className="text-ink font-medium">
            {formatDuration(weekHours)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-ink-muted">Tarefas pendentes</span>
          <span className="text-ink font-medium">{pendingTasks}</span>
        </div>

        {project.hourlyRate && (
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="text-sm text-ink-muted">Taxa/hora</span>
            <span className="text-success font-medium">R$ {project.hourlyRate}</span>
          </div>
        )}
      </div>

      {(project.salesforceOppUrl || project.sharepointRepoUrl || estimatedDelivery) && (
        <div className="mt-4 space-y-2 rounded-lg border border-border bg-background p-4">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Metadados</p>
          {project.salesforceOppUrl && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink-muted">Salesforce</span>
              <a
                href={project.salesforceOppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:opacity-80 underline"
              >
                Abrir oportunidade
              </a>
            </div>
          )}
          {project.sharepointRepoUrl && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink-muted">SharePoint</span>
              <a
                href={project.sharepointRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:opacity-80 underline"
              >
                Abrir repositório
              </a>
            </div>
          )}
          {estimatedDelivery && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-ink-muted">Entrega prevista</span>
              <span className="text-ink font-medium">{estimatedDelivery}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          onClick={() => router.push('/focus')}
          disabled={isArchived}
        >
          <Play className="h-4 w-4 mr-2" />
          Iniciar Foco
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push(`/projects/${project.id}`)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {commentCount} {commentCount === 1 ? 'atualização' : 'atualizações'}
        </Button>
      </div>
    </Card>
  );
}
