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
    <Card className="p-6 bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full flex-shrink-0" 
            style={{ backgroundColor: project.color }} 
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">{project.name}</h3>
              {isArchived && (
                <Badge variant="outline" className="text-xs text-amber-300 border-amber-400/60 bg-amber-500/10">
                  Arquivado
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {project.client && (
                <p className="text-sm text-gray-400">{project.client}</p>
              )}
              <Badge
                variant={clockfyStatus === 'linked' ? 'secondary' : 'outline'}
                className={
                  clockfyStatus === 'linked'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : clockfyStatus === 'pending'
                      ? 'border-yellow-500/60 text-yellow-300'
                      : 'border-gray-600 text-gray-300'
                }
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
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-gray-800 border-gray-700">
            <DropdownMenuItem onClick={() => onEdit(project)} className="cursor-pointer">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleToggleArchive}
              className={`cursor-pointer ${isArchived ? 'text-emerald-300' : 'text-red-400'}`}
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
          <span className="text-sm text-gray-400">Hoje</span>
          <span className="text-white font-medium">
            {formatDuration(todayHours)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Esta semana</span>
          <span className="text-white font-medium">
            {formatDuration(weekHours)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Tarefas pendentes</span>
          <span className="text-white font-medium">{pendingTasks}</span>
        </div>

        {project.hourlyRate && (
          <div className="flex justify-between items-center pt-2 border-t border-gray-700">
            <span className="text-sm text-gray-400">Taxa/hora</span>
            <span className="text-green-400 font-medium">R$ {project.hourlyRate}</span>
          </div>
        )}
      </div>

      {(project.salesforceOppUrl || project.sharepointRepoUrl || estimatedDelivery) && (
        <div className="mt-4 space-y-2 rounded-lg border border-gray-800 bg-gray-900/40 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Metadados</p>
          {project.salesforceOppUrl && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-400">Salesforce</span>
              <a
                href={project.salesforceOppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Abrir oportunidade
              </a>
            </div>
          )}
          {project.sharepointRepoUrl && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-400">SharePoint</span>
              <a
                href={project.sharepointRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Abrir repositório
              </a>
            </div>
          )}
          {estimatedDelivery && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-400">Entrega prevista</span>
              <span className="text-white font-medium">{estimatedDelivery}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          onClick={() => router.push('/focus')}
          disabled={isArchived}
        >
          <Play className="h-4 w-4 mr-2" />
          Iniciar Foco
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white"
          onClick={() => router.push(`/projects/${project.id}`)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {commentCount} {commentCount === 1 ? 'atualização' : 'atualizações'}
        </Button>
      </div>
    </Card>
  );
}
