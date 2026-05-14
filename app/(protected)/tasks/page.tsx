"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/useAppStore';
import { TaskCard } from '@/components/tasks/TaskCard';
import { Task } from '@/types';
import { Plus, Filter, Columns3, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { calculateTaskPriorityInsight, getTodayTasks } from '@/lib/utils';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import clsx from 'clsx';
import { storage } from '@/lib/storage';

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
import { PriorityRadar } from '@/components/tasks/PriorityRadar';

export type ColumnId = 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done';

type BoardColumn = {
  id: string;
  title: string;
  colorClass: string;
  status?: ColumnId;
  isCustom?: boolean;
};

const BOARD_COLUMNS_KEY = 'focusforge/tasks/custom-columns/v1';
const BOARD_TASK_MAP_KEY = 'focusforge/tasks/custom-column-task-map/v1';

const BASE_COLUMNS: BoardColumn[] = [
  { id: 'status:todo', title: 'Todo', colorClass: 'bg-gray-500', status: 'todo' },
  { id: 'status:call_agendada', title: 'Call agendada', colorClass: 'bg-amber-500', status: 'call_agendada' },
  { id: 'status:pronta_elaboracao', title: 'Pronta para elaboracao', colorClass: 'bg-violet-500', status: 'pronta_elaboracao' },
  { id: 'status:doing', title: 'Fazendo', colorClass: 'bg-sky-500', status: 'doing' },
  { id: 'status:done', title: 'Feito', colorClass: 'bg-emerald-500', status: 'done' },
];

function DraggableTask({ task, onEdit, priorityScore, priorityReasons }: { task: Task; onEdit: (t: Task) => void; priorityScore?: number; priorityReasons?: string[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.7 : 1,
    cursor: 'grab',
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="select-none">
      <TaskCard
        task={task}
        onEdit={onEdit}
        disableCardClick={isDragging}
        priorityScore={priorityScore}
        priorityReasons={priorityReasons}
      />
    </div>
  );
}

function DroppableColumn({
  id,
  title,
  colorClass,
  children,
  onRemove,
}: {
  id: string;
  title: string;
  colorClass: string;
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  const { isOver, setNodeRef, active } = useDroppable({ id });

  return (
    <div className="w-[310px] shrink-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <div className={clsx('h-2.5 w-2.5 rounded-full', colorClass)} />
          {title}
        </h2>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:text-red-300"
            onClick={onRemove}
            aria-label={`Remover coluna ${title}`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={clsx(
          'min-h-[58vh] space-y-3 rounded-xl border border-gray-800/70 bg-gray-950/45 p-3 transition',
          isOver
            ? 'border-blue-500/50 bg-blue-500/10'
            : active
              ? 'border-gray-700 bg-gray-900/60'
              : ''
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { tasks, projects, sessions, updateTask, tasksFilters, setTasksFilters, isDataInitialized } = useAppStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customColumns, setCustomColumns] = useState<Array<{ id: string; title: string }>>([]);
  const [taskCustomColumnMap, setTaskCustomColumnMap] = useState<Record<string, string>>({});
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [isBoardStateHydrated, setIsBoardStateHydrated] = useState(false);

  const showOnlyToday = tasksFilters.showOnlyToday;

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

  useEffect(() => {
    let canceled = false;

    const loadBoardState = async () => {
      try {
        const board = await storage.getTasksBoardSettings();
        if (canceled) return;

        setCustomColumns(Array.isArray(board.columns) ? board.columns : []);
        setTaskCustomColumnMap(board.taskColumnMap && typeof board.taskColumnMap === 'object' ? board.taskColumnMap : {});

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(BOARD_COLUMNS_KEY, JSON.stringify(board.columns ?? []));
          window.localStorage.setItem(BOARD_TASK_MAP_KEY, JSON.stringify(board.taskColumnMap ?? {}));
        }
      } catch {
        if (typeof window !== 'undefined') {
          try {
            const savedColumns = window.localStorage.getItem(BOARD_COLUMNS_KEY);
            if (savedColumns) {
              const parsed = JSON.parse(savedColumns);
              if (Array.isArray(parsed)) {
                setCustomColumns(
                  parsed
                    .filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string')
                    .map((item) => ({ id: item.id, title: item.title })),
                );
              }
            }

            const savedTaskMap = window.localStorage.getItem(BOARD_TASK_MAP_KEY);
            if (savedTaskMap) {
              const parsed = JSON.parse(savedTaskMap);
              if (parsed && typeof parsed === 'object') {
                setTaskCustomColumnMap(parsed as Record<string, string>);
              }
            }
          } catch {
            setCustomColumns([]);
            setTaskCustomColumnMap({});
          }
        }
      } finally {
        if (!canceled) {
          setIsBoardStateHydrated(true);
        }
      }
    };

    void loadBoardState();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isBoardStateHydrated) return;
    window.localStorage.setItem(BOARD_COLUMNS_KEY, JSON.stringify(customColumns));
    window.localStorage.setItem(BOARD_TASK_MAP_KEY, JSON.stringify(taskCustomColumnMap));

    const timeoutId = window.setTimeout(() => {
      void storage.setTasksBoardSettings({
        columns: customColumns,
        taskColumnMap: taskCustomColumnMap,
      });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [customColumns, taskCustomColumnMap, isBoardStateHydrated]);

  useEffect(() => {
    if (!isBoardStateHydrated) return;
    if (!isDataInitialized) return;

    const validColumnIds = new Set(customColumns.map((column) => column.id));
    const validTaskIds = new Set(tasks.map((task) => task.id));

    setTaskCustomColumnMap((previous) => {
      let changed = false;
      const nextMap: Record<string, string> = {};

      for (const [taskId, columnId] of Object.entries(previous)) {
        if (!validTaskIds.has(taskId) || !validColumnIds.has(columnId)) {
          changed = true;
          continue;
        }
        nextMap[taskId] = columnId;
      }

      return changed ? nextMap : previous;
    });
  }, [customColumns, tasks, isBoardStateHydrated, isDataInitialized]);

  const searchTerm = searchQuery.trim().toLowerCase();
  const activeProjectIds = useMemo(() => new Set(projects.filter(project => project.active).map(project => project.id)), [projects]);

  const filteredTasks = tasks.filter(task => {
    if (!activeProjectIds.has(task.projectId)) return false;
    if (selectedProjectId !== 'all' && task.projectId !== selectedProjectId) return false;
    if (showOnlyToday) return getTodayTasks([task]).length > 0;
    if (!searchTerm) return true;
    const projectName = (projects.find(p => p.id === task.projectId)?.name ?? '').toLowerCase();
    return (
      task.title.toLowerCase().includes(searchTerm) || (task.description ?? '').toLowerCase().includes(searchTerm) || projectName.includes(searchTerm)
    );
  });

  const sortedFilteredTasks = useMemo(() => [...filteredTasks].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [filteredTasks]);

  const taskPriorityInsights = useMemo(() => {
    return sortedFilteredTasks
      .map(task => ({
        task,
        insight: calculateTaskPriorityInsight(
          task,
          projects.find(project => project.id === task.projectId),
          sessions,
        ),
      }))
      .sort((a, b) => b.insight.score - a.insight.score);
  }, [sortedFilteredTasks, projects, sessions]);

  const priorityQueue = useMemo(() => taskPriorityInsights.slice(0, 5), [taskPriorityInsights]);

  let visibleTasks = sortedFilteredTasks;
  if (focusId) visibleTasks = sortedFilteredTasks.filter(t => t.id === focusId);

  const boardColumns = useMemo<BoardColumn[]>(() => {
    return [
      ...BASE_COLUMNS,
      ...customColumns.map((column, index) => ({
        id: `custom:${column.id}`,
        title: column.title,
        colorClass: index % 2 === 0 ? 'bg-fuchsia-400' : 'bg-cyan-400',
        isCustom: true,
      })),
    ];
  }, [customColumns]);

  const visibleTasksByStatus = useMemo(() => {
    const statusTasks: Record<ColumnId, Task[]> = {
      todo: [],
      call_agendada: [],
      pronta_elaboracao: [],
      doing: [],
      done: [],
    };

    for (const task of visibleTasks) {
      if (taskCustomColumnMap[task.id]) continue;
      const status = (task.status ?? 'todo') as ColumnId;
      statusTasks[status].push(task);
    }

    return statusTasks;
  }, [visibleTasks, taskCustomColumnMap]);

  const visibleTasksByCustomColumn = useMemo(() => {
    return customColumns.reduce<Record<string, Task[]>>((acc, column) => {
      acc[column.id] = visibleTasks.filter((task) => taskCustomColumnMap[task.id] === column.id);
      return acc;
    }, {});
  }, [customColumns, visibleTasks, taskCustomColumnMap]);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  );

  const priorityByTaskId = useMemo(() => {
    return taskPriorityInsights.reduce<Record<string, { score: number; reasons: string[] }>>((acc, entry) => {
      acc[entry.task.id] = { score: entry.insight.score, reasons: entry.insight.reasons };
      return acc;
    }, {});
  }, [taskPriorityInsights]);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const target = String(over.id);

    if (target.startsWith('status:')) {
      const status = target.replace('status:', '') as ColumnId;
      const moved = tasks.find((task) => task.id === taskId);
      if (!moved) return;

      if ((moved.status ?? 'todo') !== status) {
        updateTask(taskId, { status });
      }

      if (taskCustomColumnMap[taskId]) {
        setTaskCustomColumnMap((previous) => {
          const nextMap = { ...previous };
          delete nextMap[taskId];
          return nextMap;
        });
      }
      return;
    }

    if (target.startsWith('custom:')) {
      const targetColumnId = target.replace('custom:', '');
      if (!customColumns.some((column) => column.id === targetColumnId)) return;

      setTaskCustomColumnMap((previous) => {
        if (previous[taskId] === targetColumnId) return previous;
        return { ...previous, [taskId]: targetColumnId };
      });
    }
  };

  const handleAddCustomColumn = () => {
    const normalizedTitle = newColumnTitle.trim().slice(0, 28);
    if (!normalizedTitle) return;

    const customId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    setCustomColumns((previous) => [...previous, { id: customId, title: normalizedTitle }]);
    setNewColumnTitle('');
  };

  const handleRemoveCustomColumn = (columnId: string) => {
    setCustomColumns((previous) => previous.filter((column) => column.id !== columnId));
    setTaskCustomColumnMap((previous) => {
      const nextMap: Record<string, string> = {};
      for (const [taskId, mappedColumnId] of Object.entries(previous)) {
        if (mappedColumnId !== columnId) {
          nextMap[taskId] = mappedColumnId;
        }
      }
      return nextMap;
    });
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
            <Switch
              id="today-only"
              checked={showOnlyToday}
              onCheckedChange={(value) => setTasksFilters({ showOnlyToday: value })}
            />
            <Label htmlFor="today-only" className="text-gray-300">Somente de hoje</Label>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-gray-800 bg-gray-900/40 p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-bold text-white">Radar de Prioridade</h2>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Top 5 Sugestões</p>
            </div>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
              Auto-Focus
            </span>
          </div>

          <PriorityRadar priorityQueue={priorityQueue} projects={projects} onEdit={handleEdit} />
        </div>

        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gray-500">
          <Columns3 className="h-3.5 w-3.5" />
          Quadro Kanban arrastavel com scroll lateral
        </div>

        <DndContext sensors={sensors} onDragEnd={onDragEnd} collisionDetection={rectIntersection}>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-gray-950 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-gray-950 to-transparent" />

            <div className="overflow-x-auto pb-4">
              <div className="flex w-max items-start gap-4 px-1">
                {boardColumns.map((column) => {
                  const tasksForColumn = column.status
                    ? visibleTasksByStatus[column.status]
                    : visibleTasksByCustomColumn[column.id.replace('custom:', '')] ?? [];

                  return (
                    <DroppableColumn
                      key={column.id}
                      id={column.id}
                      title={`${column.title} (${tasksForColumn.length})`}
                      colorClass={column.colorClass}
                      onRemove={
                        column.isCustom
                          ? () => handleRemoveCustomColumn(column.id.replace('custom:', ''))
                          : undefined
                      }
                    >
                      {tasksForColumn.map((task) => (
                        <DraggableTask
                          key={task.id}
                          task={task}
                          onEdit={handleEdit}
                          priorityScore={priorityByTaskId[task.id]?.score}
                          priorityReasons={priorityByTaskId[task.id]?.reasons}
                        />
                      ))}
                    </DroppableColumn>
                  );
                })}

                <div className="w-[310px] shrink-0 rounded-xl border border-dashed border-gray-700 bg-gray-900/40 p-4">
                  <h3 className="text-sm font-semibold text-white">Adicionar coluna</h3>
                  <p className="mt-1 text-xs text-gray-400">
                    Crie colunas extras para organizar tarefas temporariamente no board.
                  </p>

                  <div className="mt-4 space-y-3">
                    <Input
                      value={newColumnTitle}
                      onChange={(event) => setNewColumnTitle(event.target.value)}
                      placeholder="Ex.: Bloqueadas"
                      maxLength={28}
                      className="border-gray-700 bg-gray-950/60"
                    />
                    <Button
                      type="button"
                      className="w-full bg-cyan-600 text-white hover:bg-cyan-500"
                      onClick={handleAddCustomColumn}
                      disabled={!newColumnTitle.trim()}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Criar coluna
                    </Button>
                  </div>
                </div>
              </div>
            </div>
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
