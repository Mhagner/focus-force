'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/useAppStore';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Task } from '@/types';
import { Plus, Filter } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getTodayTasks } from '@/lib/utils';

export default function TasksPage() {
  const { tasks, projects } = useAppStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [showOnlyToday, setShowOnlyToday] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const filteredTasks = tasks.filter(task => {
    if (selectedProjectId !== 'all' && task.projectId !== selectedProjectId) {
      return false;
    }
    if (showOnlyToday) {
      return getTodayTasks([task]).length > 0;
    }
    return true;
  });

  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const doingTasks = filteredTasks.filter(t => t.status === 'doing');
  const doneTasks = filteredTasks.filter(t => t.status === 'done');

  const handleEdit = (task: Task) => {
    setEditingTask(task);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Tarefas</h1>
          <p className="text-gray-400">
            Organize suas tarefas em um kanban simples
          </p>
        </div>
        
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-48 bg-gray-900/50 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects.filter(p => p.active).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: project.color }} 
                    />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="today-only" 
            checked={showOnlyToday}
            onCheckedChange={setShowOnlyToday}
          />
          <Label htmlFor="today-only" className="text-gray-300">
            Somente de hoje
          </Label>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
            Todo ({todoTasks.length})
          </h2>
          <div className="space-y-4">
            {todoTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={handleEdit} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            Fazendo ({doingTasks.length})
          </h2>
          <div className="space-y-4">
            {doingTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={handleEdit} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            Feito ({doneTasks.length})
          </h2>
          <div className="space-y-4">
            {doneTasks.map((task) => (
              <TaskCard key={task.id} task={task} onEdit={handleEdit} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}