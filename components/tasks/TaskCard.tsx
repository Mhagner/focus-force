'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Task } from '@/types';
import { useAppStore } from '@/stores/useAppStore';
import { ProjectBadge } from '@/components/ui/project-badge';
import { PriorityTag } from '@/components/ui/priority-tag';
import { formatDuration } from '@/lib/utils';
import { Play, Calendar, Clock, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const { projects, updateTask, deleteTask } = useAppStore();
  
  const project = projects.find(p => p.id === task.projectId);
  if (!project) return null;

  const handleStatusChange = (newStatus: 'todo' | 'doing' | 'done') => {
    updateTask(task.id, { status: newStatus });
  };

  const handlePlanForToday = () => {
    const newPlannedFor = task.plannedFor === 'today' ? undefined : 'today';
    updateTask(task.id, { plannedFor: newPlannedFor });
  };

  const isPlannedForToday = task.plannedFor === 'today' || 
    task.plannedFor === new Date().toISOString().split('T')[0];

  return (
    <Card className="p-4 bg-gray-900/50 border-gray-800 hover:bg-gray-900/70 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <PriorityTag priority={task.priority} />
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
              onClick={() => deleteTask(task.id)} 
              className="cursor-pointer text-red-400"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h4 className="font-medium text-white mb-2">{task.title}</h4>
      
      {task.description && (
        <p className="text-sm text-gray-400 mb-3">{task.description}</p>
      )}

      <div className="flex items-center justify-between mb-3">
        <ProjectBadge name={project.name} color={project.color} size="sm" />
        {task.estimateMin && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            {formatDuration(task.estimateMin * 60)}
          </div>
        )}
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

        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
          <Play className="h-4 w-4 mr-1" />
          Foco
        </Button>
      </div>
    </Card>
  );
}