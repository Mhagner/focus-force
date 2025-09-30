"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/useAppStore';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Task } from '@/types';
import { Plus, Filter } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getTodayTasks } from '@/lib/utils';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import clsx from 'clsx';

// DnD Kit
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export type ColumnId = 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done';

function DraggableTask({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.7 : 1,
    cursor: 'grab',
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="select-none">
      <TaskCard task={task} onEdit={onEdit} />
    </div>
  );
}

function DroppableColumn({ id, title, colorClass, children }: { id: ColumnId; title: string; colorClass: string; children: React.ReactNode }) {
  const { isOver, setNodeRef, active } = useDroppable({ id });

  return (
    <div className="min-w-0">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <div className={clsx('h-2.5 w-2.5 rounded-full', colorClass)} />
        {title}
      </h2>
      <div
        ref={setNodeRef}
        className={clsx(
          'space-y-3 rounded-lg border border-transparent p-2 transition',
          isOver
            ? 'border-blue-600/40 bg-blue-600/5'
            : active
              ? 'border-gray-800 bg-gray-900/30'
              : 'bg-transparent'
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { tasks, projects, updateTask } = useAppStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [showOnlyToday, setShowOnlyToday] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setSearchQuery(params.get('search') ?? '');
    setFocusId(params.get('focusId') ?? null);

    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      setSearchQuery(p.get('search') ?? '');
      setFocusId(p.get('focusId') ?? null);
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const searchTerm = searchQuery.trim().toLowerCase();
  const filteredTasks = tasks.filter(task => {
    if (selectedProjectId !== 'all' && task.projectId !== selectedProjectId) return false;
    if (showOnlyToday) return getTodayTasks([task]).length > 0;
    if (!searchTerm) return true;
    const projectName = (projects.find(p => p.id === task.projectId)?.name ?? '').toLowerCase();
    return (
      task.title.toLowerCase().includes(searchTerm) || (task.description ?? '').toLowerCase().includes(searchTerm) || projectName.includes(searchTerm)
    );
  });

  const sortedFilteredTasks = useMemo(() => [...filteredTasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [filteredTasks]);

  let visibleTasks = sortedFilteredTasks;
  if (focusId) visibleTasks = sortedFilteredTasks.filter(t => t.id === focusId);

  const todoTasks = sortedFilteredTasks.filter(t => t.status === 'todo');
  const callTasks = sortedFilteredTasks.filter(t => (t.status as any) === 'call_agendada');
  const readyTasks = sortedFilteredTasks.filter(t => (t.status as any) === 'pronta_elaboracao');
  const doingTasks = sortedFilteredTasks.filter(t => t.status === 'doing');
  const doneTasks = sortedFilteredTasks.filter(t => t.status === 'done');

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const target = String(over.id) as ColumnId;

    if (['todo', 'call_agendada', 'pronta_elaboracao', 'doing', 'done'].includes(target)) {
      const moved = tasks.find(t => t.id === taskId);
      if (moved && (moved.status as any) !== target) {
        updateTask(taskId, { status: target as any });
      }
    }
  };

  return (
    <>
      <div className="mx-auto max-w-9xl p-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-bold text-white">Tarefas</h1>
            <p className="text-sm text-gray-400">Organize suas tarefas em um kanban simples</p>
          </div>

          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              setEditingTask(undefined);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-48 border-gray-700 bg-gray-900/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-gray-700 bg-gray-800">
                <SelectItem value="all">Todos os projetos</SelectItem>
                {projects
                  .filter(p => p.active)
                  .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch id="today-only" checked={showOnlyToday} onCheckedChange={setShowOnlyToday} />
            <Label htmlFor="today-only" className="text-gray-300">Somente de hoje</Label>
          </div>
        </div>

        {/* Kanban Board with DnD (sem scroll, 5 colunas ajustadas à tela) */}
        <DndContext sensors={sensors} onDragEnd={onDragEnd} collisionDetection={rectIntersection}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <DroppableColumn id="todo" title={`Todo (${todoTasks.length})`} colorClass="bg-gray-500">
              {todoTasks.filter(t => visibleTasks.find(v => v.id === t.id)).map(task => (
                <DraggableTask key={task.id} task={task} onEdit={handleEdit} />
              ))}
            </DroppableColumn>

            <DroppableColumn id="call_agendada" title={`Call agendada (${callTasks.length})`} colorClass="bg-amber-500">
              {callTasks.filter(t => visibleTasks.find(v => v.id === t.id)).map(task => (
                <DraggableTask key={task.id} task={task} onEdit={handleEdit} />
              ))}
            </DroppableColumn>

            <DroppableColumn id="pronta_elaboracao" title={`Pronta para elaboração (${readyTasks.length})`} colorClass="bg-purple-500">
              {readyTasks.filter(t => visibleTasks.find(v => v.id === t.id)).map(task => (
                <DraggableTask key={task.id} task={task} onEdit={handleEdit} />
              ))}
            </DroppableColumn>

            <DroppableColumn id="doing" title={`Fazendo (${doingTasks.length})`} colorClass="bg-blue-500">
              {doingTasks.filter(t => visibleTasks.find(v => v.id === t.id)).map(task => (
                <DraggableTask key={task.id} task={task} onEdit={handleEdit} />
              ))}
            </DroppableColumn>

            <DroppableColumn id="done" title={`Feito (${doneTasks.length})`} colorClass="bg-green-500">
              {doneTasks.filter(t => visibleTasks.find(v => v.id === t.id)).map(task => (
                <DraggableTask key={task.id} task={task} onEdit={handleEdit} />
              ))}
            </DroppableColumn>
          </div>
        </DndContext>
      </div>

      <TaskDialog
        open={isDialogOpen}
        onOpenChange={open => {
          setIsDialogOpen(open);
          if (!open) setEditingTask(undefined);
        }}
        task={editingTask}
      />
    </>
  );
}
