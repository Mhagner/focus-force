"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppStore } from '@/stores/useAppStore';
import { TaskCard } from '@/components/tasks/TaskCard';
import { BoardColumn, Task } from '@/types';
import { CheckCircle2, Columns3, Filter, GripVertical, Pencil, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { calculateTaskPriorityInsight, getTodayTasks } from '@/lib/utils';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { TaskOverrunCommentDialog } from '@/components/tasks/TaskOverrunCommentDialog';
import { useTaskCompletionGuard } from '@/hooks/use-task-completion-guard';
import { useWorkspace } from '@/hooks/use-workspace';
import { MAX_COLUMN_TITLE } from '@/lib/workspace/defaults';
import clsx from 'clsx';

// DnD Kit
import {
  DndContext,
  useDraggable,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from '@dnd-kit/core';
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PriorityRadar } from '@/components/tasks/PriorityRadar';

// Colapso das colunas é uma preferência de tela, por workspace (as colunas em si vêm do servidor).
const collapsedKey = (workspaceId: string) => `focusforge/tasks/collapsed-columns/v2:${workspaceId}`;

// Prefixo dos ids no dnd-kit: separa "arrastar coluna" de "soltar tarefa em coluna".
const COLUMN_DND_PREFIX = 'col:';
const COLUMN_COLORS = ['bg-accent-blue', 'bg-accent-orange', 'bg-brand-secondary', 'bg-fuchsia-400', 'bg-cyan-400'];

function columnColor(column: BoardColumn, index: number) {
  return column.isDone ? 'bg-success' : COLUMN_COLORS[index % COLUMN_COLORS.length];
}

function DraggableTask({ task, onEdit, priorityScore, priorityReasons }: { task: Task; onEdit: (t: Task) => void; priorityScore?: number; priorityReasons?: string[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.7 : 1,
    cursor: 'grab',
  } as React.CSSProperties;

  return (
    // onDragStart: links dentro do cartão (ex.: selo do projeto) iniciariam um "arrastar link" nativo do
    // navegador, que rouba o gesto do dnd-kit e ainda dispara a navegação ao soltar.
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onDragStart={(event) => event.preventDefault()} className="select-none">
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

/**
 * Coluna do quadro. É ao mesmo tempo:
 *  - alvo para soltar tarefas (o `useSortable` também registra a coluna como área de soltura), e
 *  - item arrastável pela alça do cabeçalho, para reordenar as colunas.
 */
function BoardColumnView({
  column,
  colorClass,
  count,
  children,
  onRename,
  onRequestDelete,
  isCollapsed,
  onToggleCollapse,
}: {
  column: BoardColumn;
  colorClass: string;
  count: number;
  children: React.ReactNode;
  onRename: (title: string) => void;
  /** Ausente na coluna de conclusão, que não pode ser excluída. */
  onRequestDelete?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver, active } = useSortable({
    id: `${COLUMN_DND_PREFIX}${column.id}`,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(column.title);

  const title = `${column.title} (${count})`;
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 } as React.CSSProperties;
  // Tarefas sendo arrastadas destacam a coluna sob o cursor; arrastar uma coluna não.
  const isTaskDragActive = active ? !String(active.id).startsWith(COLUMN_DND_PREFIX) : false;

  const startEditing = () => {
    setDraft(column.title);
    setIsEditing(true);
  };

  const commitEditing = () => {
    setIsEditing(false);
    const next = draft.trim();
    if (next && next !== column.title) onRename(next);
  };

  if (isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-12 shrink-0 min-h-[58vh] flex flex-col items-center rounded-xl border border-border bg-card p-2 gap-3 cursor-pointer transition hover:border-primary/30"
        onClick={onToggleCollapse}
        title={`Expandir ${title}`}
      >
        <button
          className="text-ink-muted hover:text-ink transition"
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
          aria-label={`Expandir coluna ${title}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div
          className="flex flex-1 flex-col items-center gap-2"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          <div className={clsx('h-2 w-2 rounded-full shrink-0', colorClass)} />
          <span className="text-xs font-semibold text-ink truncate">{title}</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="w-[310px] shrink-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <button
            type="button"
            data-no-pan
            className="cursor-grab touch-none rounded p-0.5 text-ink-muted hover:text-ink active:cursor-grabbing"
            aria-label={`Arrastar a coluna ${column.title}`}
            title="Arrastar para mudar a posição da coluna"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {isEditing ? (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', colorClass)} />
              <Input
                value={draft}
                autoFocus
                maxLength={MAX_COLUMN_TITLE}
                aria-label="Nome da coluna"
                className="h-7 px-2 text-sm"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEditing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEditing();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
            </div>
          ) : (
            <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
              <div className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', colorClass)} />
              <span className="truncate">{title}</span>
              {column.isDone && (
                <span title="Coluna de conclusão: o que chega aqui é marcado como concluído">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-label="Coluna de conclusão" />
                </span>
              )}
            </h2>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isEditing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-ink-muted hover:text-ink"
              onClick={startEditing}
              aria-label={`Renomear coluna ${column.title}`}
              title="Renomear coluna"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-ink-muted hover:text-ink"
            onClick={onToggleCollapse}
            aria-label={`Recolher coluna ${title}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {onRequestDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-ink-muted hover:text-danger"
              onClick={onRequestDelete}
              aria-label={`Excluir coluna ${column.title}`}
              title="Excluir coluna"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div
        className={clsx(
          'min-h-[58vh] space-y-3 rounded-xl border border-border bg-card p-3 transition',
          isTaskDragActive && isOver
            ? 'border-primary/50 bg-primary/[0.06]'
            : isTaskDragActive
              ? 'border-primary/30 bg-secondary/40'
              : ''
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default function TasksPage() {
  // Ref para o container do board
  const boardScrollRef = useRef<HTMLDivElement>(null);
  // Estado para controlar o pan
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; scrollLeft: number } | null>(null);

  // Handlers para click-and-drag pan
  useEffect(() => {
    const board = boardScrollRef.current;
    if (!board) return;

    // A alça de arrastar coluna (data-no-pan) não deve rolar o quadro.
    const isNoPan = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest('[data-no-pan]'));

    const handleMouseDown = (e: MouseEvent) => {
      // Só botão esquerdo
      if (e.button !== 0 || isNoPan(e.target)) return;
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        scrollLeft: board.scrollLeft,
      };
      board.classList.add('cursor-grabbing');
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning || !panStart.current) return;
      const dx = e.clientX - panStart.current.x;
      board.scrollLeft = panStart.current.scrollLeft - dx;
    };
    const handleMouseUp = () => {
      setIsPanning(false);
      panStart.current = null;
      board.classList.remove('cursor-grabbing');
    };

    // Touch events
    let touchStartX = 0;
    let touchScrollLeft = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || isNoPan(e.target)) return;
      setIsPanning(true);
      touchStartX = e.touches[0].clientX;
      touchScrollLeft = board.scrollLeft;
      board.classList.add('cursor-grabbing');
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!isPanning) return;
      const dx = e.touches[0].clientX - touchStartX;
      board.scrollLeft = touchScrollLeft - dx;
    };
    const handleTouchEnd = () => {
      setIsPanning(false);
      board.classList.remove('cursor-grabbing');
    };

    // Mouse listeners
    board.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    // Touch listeners
    board.addEventListener('touchstart', handleTouchStart, { passive: false });
    board.addEventListener('touchmove', handleTouchMove, { passive: false });
    board.addEventListener('touchend', handleTouchEnd);

    return () => {
      board.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      board.removeEventListener('touchstart', handleTouchStart);
      board.removeEventListener('touchmove', handleTouchMove);
      board.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPanning]);

  const { tasks, projects, sessions, columns, activeWorkspaceId, tasksFilters, setTasksFilters, isDataInitialized, addColumn, renameColumn, reorderColumns, deleteColumn } = useAppStore();
  const { labels, isStudy } = useWorkspace();
  const { pendingTask, pendingTaskTrackedSeconds, requestColumnChange, confirmPendingCompletion, cancelPendingCompletion } = useTaskCompletionGuard();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(() => new Set());
  const [columnToDelete, setColumnToDelete] = useState<BoardColumn | null>(null);
  const [moveToColumnId, setMoveToColumnId] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const showOnlyToday = tasksFilters.showOnlyToday;

  // Depois de arrastar um cartão, o navegador ainda dispara um "click" no elemento sob o cursor (o cartão
  // acompanha o mouse). O dnd-kit interrompe a propagação desse clique, mas isso não cancela a ação padrão de
  // links: o selo do projeto faria uma navegação completa. Este listener (registrado antes do do dnd-kit) a cancela.
  const dragActiveRef = useRef(false);
  const lastDragEndRef = useRef(0);
  useEffect(() => {
    const cancelClickAfterDrag = (event: MouseEvent) => {
      if (dragActiveRef.current || Date.now() - lastDragEndRef.current < 250) event.preventDefault();
    };
    document.addEventListener('click', cancelClickAfterDrag, true);
    return () => document.removeEventListener('click', cancelClickAfterDrag, true);
  }, []);

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

  // Colunas recolhidas: lidas por workspace.
  useEffect(() => {
    if (typeof window === 'undefined' || !activeWorkspaceId) return;
    try {
      const saved = window.localStorage.getItem(collapsedKey(activeWorkspaceId));
      const parsed = saved ? JSON.parse(saved) : [];
      setCollapsedColumns(new Set<string>(Array.isArray(parsed) ? (parsed as string[]) : []));
    } catch {
      setCollapsedColumns(new Set());
    }
  }, [activeWorkspaceId]);

  const handleToggleCollapse = (columnId: string) => {
    setCollapsedColumns((previous) => {
      const next = new Set(previous);
      if (next.has(columnId)) next.delete(columnId);
      else next.add(columnId);
      try {
        if (activeWorkspaceId) window.localStorage.setItem(collapsedKey(activeWorkspaceId), JSON.stringify(Array.from(next)));
      } catch {
        // sem storage: o recolhimento só não é lembrado
      }
      return next;
    });
  };

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

  // Radar: itens em andamento (colunas intermediárias => status derivado "doing").
  const taskPriorityInsights = useMemo(() => {
    return sortedFilteredTasks
      .filter(task => task.status === 'doing' || task.status === 'pronta_elaboracao')
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

  const orderedColumns = useMemo(() => [...columns].sort((a, b) => a.position - b.position), [columns]);

  // Tarefas agrupadas pela coluna; sem coluna conhecida cai na primeira coluna aberta (não some do quadro).
  const tasksByColumn = useMemo(() => {
    const fallback = orderedColumns.find((column) => !column.isDone) ?? orderedColumns[0];
    const known = new Set(orderedColumns.map((column) => column.id));
    const groups: Record<string, Task[]> = {};
    for (const column of orderedColumns) groups[column.id] = [];
    for (const task of visibleTasks) {
      const target = task.columnId && known.has(task.columnId) ? task.columnId : fallback?.id;
      if (target) groups[target].push(task);
    }
    return groups;
  }, [orderedColumns, visibleTasks]);

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

  const reportError = (message: string) => (error: unknown) =>
    toast.error(error instanceof Error && error.message ? error.message : message);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Reordenar colunas
    if (activeId.startsWith(COLUMN_DND_PREFIX)) {
      if (!overId.startsWith(COLUMN_DND_PREFIX) || activeId === overId) return;
      const ids = orderedColumns.map((column) => column.id);
      const from = ids.indexOf(activeId.slice(COLUMN_DND_PREFIX.length));
      const to = ids.indexOf(overId.slice(COLUMN_DND_PREFIX.length));
      if (from < 0 || to < 0) return;
      reorderColumns(arrayMove(ids, from, to)).catch(reportError('Não foi possível reordenar as colunas.'));
      return;
    }

    // Mover tarefa para uma coluna
    if (!overId.startsWith(COLUMN_DND_PREFIX)) return;
    const column = orderedColumns.find((candidate) => candidate.id === overId.slice(COLUMN_DND_PREFIX.length));
    const moved = tasks.find((task) => task.id === activeId);
    if (column && moved) requestColumnChange(moved, column);
  };

  const handleAddColumn = () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    addColumn(title.slice(0, MAX_COLUMN_TITLE))
      .then(() => setNewColumnTitle(''))
      .catch(reportError('Não foi possível criar a coluna.'));
  };

  const requestDeleteColumn = (column: BoardColumn) => {
    const others = orderedColumns.filter((candidate) => candidate.id !== column.id);
    // destino padrão: a primeira coluna aberta que sobra
    setMoveToColumnId((others.find((candidate) => !candidate.isDone) ?? others[0])?.id ?? '');
    setColumnToDelete(column);
  };

  const confirmDeleteColumn = async () => {
    if (!columnToDelete) return;
    const itemCount = tasksByColumn[columnToDelete.id]?.length ?? tasks.filter((task) => task.columnId === columnToDelete.id).length;
    setIsDeleting(true);
    try {
      await deleteColumn(columnToDelete.id, itemCount > 0 ? moveToColumnId : undefined);
      setColumnToDelete(null);
    } catch (error) {
      reportError('Não foi possível excluir a coluna.')(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteTargetCount = columnToDelete ? tasks.filter((task) => task.columnId === columnToDelete.id).length : 0;
  const deleteTargetOptions = columnToDelete ? orderedColumns.filter((column) => column.id !== columnToDelete.id) : [];

  return (
    <>
      <div className="p-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-1 font-display text-2xl font-bold text-ink">{labels.tasks}</h1>
            <p className="text-sm text-ink-muted">
              {isStudy ? 'Organize seus tópicos de estudo em um kanban simples' : 'Organize suas tarefas em um kanban simples'}
            </p>
          </div>

          <Button
            onClick={() => {
              setEditingTask(undefined);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> {labels.newTask}
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-ink-muted" />
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tod{isStudy ? 'as as matérias' : 'os os projetos'}</SelectItem>
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
            <Label htmlFor="today-only" className="text-ink-muted">Somente de hoje</Label>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-border bg-card p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm font-bold text-ink">Radar de Prioridade</h2>
              <p className="text-[10px] uppercase tracking-wider text-ink-muted">Top 5 Sugestões</p>
            </div>
            <span className="rounded-full bg-primary/[0.1] px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
              Auto-Focus
            </span>
          </div>

          <PriorityRadar priorityQueue={priorityQueue} projects={projects} onEdit={handleEdit} />
        </div>

        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
          <Columns3 className="h-3.5 w-3.5" />
          Quadro Kanban arrastavel com scroll lateral
        </div>

        {isDataInitialized && orderedColumns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-ink-muted" role="status">
            Não foi possível carregar as colunas deste workspace. Recarregue a página.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={() => {
              dragActiveRef.current = true;
            }}
            onDragCancel={() => {
              dragActiveRef.current = false;
              lastDragEndRef.current = Date.now();
            }}
            onDragEnd={(event) => {
              dragActiveRef.current = false;
              lastDragEndRef.current = Date.now();
              onDragEnd(event);
            }}
          >
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent" />

              {/* Board com scroll e pan */}
              <div
                ref={boardScrollRef}
                className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-background"
                style={{ WebkitOverflowScrolling: 'touch', cursor: isPanning ? 'grabbing' : 'grab' }}
              >
                <div className="flex w-max items-start gap-4 px-1 select-none">
                  <SortableContext
                    items={orderedColumns.map((column) => `${COLUMN_DND_PREFIX}${column.id}`)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {orderedColumns.map((column, index) => {
                      const tasksForColumn = tasksByColumn[column.id] ?? [];

                      return (
                        <BoardColumnView
                          key={column.id}
                          column={column}
                          colorClass={columnColor(column, index)}
                          count={tasksForColumn.length}
                          onRename={(title) => renameColumn(column.id, title).catch(reportError('Não foi possível renomear a coluna.'))}
                          onRequestDelete={column.isDone ? undefined : () => requestDeleteColumn(column)}
                          isCollapsed={collapsedColumns.has(column.id)}
                          onToggleCollapse={() => handleToggleCollapse(column.id)}
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
                        </BoardColumnView>
                      );
                    })}
                  </SortableContext>

                  <div className="w-[310px] shrink-0 rounded-xl border border-dashed border-border bg-card p-4">
                    <h3 className="text-sm font-semibold text-ink">Adicionar coluna</h3>
                    <p className="mt-1 text-xs text-ink-muted">
                      A coluna vale só para este workspace e entra antes da coluna de conclusão. Depois, arraste para onde quiser.
                    </p>

                    <div className="mt-4 space-y-3">
                      <Input
                        value={newColumnTitle}
                        onChange={(event) => setNewColumnTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleAddColumn();
                        }}
                        placeholder={isStudy ? 'Ex.: Simulados' : 'Ex.: Bloqueadas'}
                        maxLength={MAX_COLUMN_TITLE}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={handleAddColumn}
                        disabled={!newColumnTitle.trim()}
                      >
                        <Plus className="mr-2 h-4 w-4" /> Criar coluna
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Barra de rolagem fixa */}
              <div className="sticky left-0 right-0 bottom-0 z-20 h-5 bg-background/80 flex items-end pointer-events-none">
                <div
                  className="w-full h-2 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-background pointer-events-auto"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                  tabIndex={-1}
                  onScroll={e => {
                    // Sincroniza scroll da barra fixa com o board
                    if (boardScrollRef.current) {
                      boardScrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft;
                    }
                  }}
                  ref={el => {
                    // Sincroniza scroll da barra fixa ao board
                    if (el && boardScrollRef.current) {
                      el.scrollLeft = boardScrollRef.current.scrollLeft;
                    }
                  }}
                >
                  <div style={{ width: boardScrollRef.current ? boardScrollRef.current.scrollWidth : '100%' }} />
                </div>
              </div>
            </div>
          </DndContext>
        )}
      </div>

      <TaskDialog
        open={isDialogOpen}
        onOpenChange={open => {
          setIsDialogOpen(open);
          if (!open) setEditingTask(undefined);
        }}
        task={editingTask}
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

      <Dialog open={Boolean(columnToDelete)} onOpenChange={(open) => !open && !isDeleting && setColumnToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir a coluna "{columnToDelete?.title}"?</DialogTitle>
            <DialogDescription>
              {deleteTargetCount > 0
                ? `Há ${deleteTargetCount} ${deleteTargetCount === 1 ? 'item' : 'itens'} nesta coluna. Escolha para onde movê-los.`
                : 'A coluna está vazia e será removida.'}
            </DialogDescription>
          </DialogHeader>

          {deleteTargetCount > 0 && (
            <div className="space-y-2">
              <Label>Mover os itens para</Label>
              <Select value={moveToColumnId} onValueChange={setMoveToColumnId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {deleteTargetOptions.map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.title}
                      {column.isDone ? ' (conclusão)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {deleteTargetOptions.find((column) => column.id === moveToColumnId)?.isDone && (
                <p className="text-xs text-ink-muted">Os itens serão marcados como concluídos.</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setColumnToDelete(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteColumn}
              disabled={isDeleting || (deleteTargetCount > 0 && !moveToColumnId)}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir coluna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
