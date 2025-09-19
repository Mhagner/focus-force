'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Project } from '@/types';
import { useAppStore } from '@/stores/useAppStore';
import { formatDuration, getProjectHoursToday, getWeekHours } from '@/lib/utils';
import { MoreVertical, Edit, Archive, Play } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
}

export function ProjectCard({ project, onEdit }: ProjectCardProps) {
  const { sessions, tasks, updateProject } = useAppStore();

  const todayHours = getProjectHoursToday(sessions, project.id);
  const weekHours = sessions
    .filter(s => s.projectId === project.id)
    .reduce((total, session) => total + session.durationSec, 0);

  const pendingTasks = tasks.filter(t =>
    t.projectId === project.id && t.status !== 'done'
  ).length;

  const isClockfyLinked = Boolean(project.clockfyProjectId);
  const clockfyStatus = project.syncWithClockfy
    ? isClockfyLinked
      ? 'linked'
      : 'pending'
    : 'disabled';

  const handleArchive = () => {
    updateProject(project.id, { active: false });
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
            <h3 className="font-semibold text-white">{project.name}</h3>
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
            <DropdownMenuItem onClick={handleArchive} className="cursor-pointer text-red-400">
              <Archive className="h-4 w-4 mr-2" />
              Arquivar
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

      <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
        <Play className="h-4 w-4 mr-2" />
        Iniciar Foco
      </Button>
    </Card>
  );
}