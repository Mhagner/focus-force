'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/stores/useAppStore';
import { ProjectBadge } from '@/components/ui/project-badge';
import { PriorityTag } from '@/components/ui/priority-tag';
import { formatDateTime, formatDuration, formatFriendlyDate, getTaskDueSignals, getTaskHighestDueLevel, getTaskTrackedSeconds, isTaskTimeOverrun } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, ExternalLink, Play, MessageSquare, Edit, Trash2, Loader2, CheckSquare, Square, Plus, Check, X, AlertTriangle, CalendarClock, Clock3, TimerReset } from 'lucide-react';
import { FocusDialog } from '@/components/focus/FocusDialog';
import { TaskOverrunCommentDialog } from '@/components/tasks/TaskOverrunCommentDialog';
import { useTaskCompletionGuard } from '@/hooks/use-task-completion-guard';

type Params = { taskId?: string | string[] };

function resolveParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'yyyy-MM-dd');
}

export default function TaskDetailPage() {
  const params = useParams<Params>();
  const router = useRouter();
  const taskId = resolveParam(params?.taskId);

  const { tasks, projects, sessions, updateTask, addTaskComment, updateTaskComment, deleteTaskComment, addTaskSubtask, updateTaskSubtask, deleteTaskSubtask } = useAppStore();
  const { pendingTask, pendingTaskTrackedSeconds, requestStatusChange, confirmPendingCompletion, cancelPendingCompletion } = useTaskCompletionGuard();

  const task = tasks.find((current) => current.id === taskId);
  const project = task ? projects.find((current) => current.id === task.projectId) : undefined;
  const trackedSeconds = task ? getTaskTrackedSeconds(task.id, sessions) : 0;
  const isTimeOverrun = task ? isTaskTimeOverrun(task.id, sessions) : false;

  const [isFocusDialogOpen, setIsFocusDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [processingSubtaskId, setProcessingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');

  const [estimatedDeliveryDateInput, setEstimatedDeliveryDateInput] = useState('');
  const [salesforceOppUrlInput, setSalesforceOppUrlInput] = useState('');
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    if (!task) return;
    setEstimatedDeliveryDateInput(toDateInputValue(task.estimatedDeliveryDate));
    setSalesforceOppUrlInput(task.salesforceOppUrl ?? '');
    setRepoUrlInput(task.repoUrl ?? '');
  }, [taskId, task]);

  const sortedComments = useMemo(() => {
    if (!task) return [];
    return [...(task.comments ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [task]);

  const subtasks = task?.subtasks ?? [];
  const completedSubtasks = subtasks.filter((subtask) => subtask.completed).length;
  const completionPercent = subtasks.length ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const handleStatusChange = (status: 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done') => {
    if (!task) return;
    requestStatusChange(task, status);
  };

  const handlePlanForToday = () => {
    if (!task) return;
    const todayISO = new Date().toISOString().split('T')[0];
    const isToday = task.plannedFor === 'today' || task.plannedFor === todayISO;
    updateTask(task.id, { plannedFor: isToday ? null : 'today' });
  };

  const handleSubmitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = commentText.trim();
    if (!task || !trimmed || isSubmittingComment) {
      return;
    }

    setIsSubmittingComment(true);
    try {
      await addTaskComment(task.id, trimmed);
      setCommentText('');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleStartEditComment = (commentId: string, message: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(message);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleSaveComment = async (commentId: string, originalMessage: string) => {
    if (!task) return;
    const trimmed = editingCommentText.trim();
    if (!trimmed || savingCommentId) return;

    if (trimmed === originalMessage.trim()) {
      handleCancelEditComment();
      return;
    }

    setSavingCommentId(commentId);
    try {
      await updateTaskComment(task.id, commentId, trimmed);
      handleCancelEditComment();
    } finally {
      setSavingCommentId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task || deletingCommentId) return;
    const confirmed = window.confirm('Tem certeza de que deseja excluir este comentário?');
    if (!confirmed) return;

    setDeletingCommentId(commentId);
    try {
      await deleteTaskComment(task.id, commentId);
      if (editingCommentId === commentId) {
        handleCancelEditComment();
      }
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleAddSubtask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!task || isAddingSubtask || newSubtaskTitle.trim().length === 0) return;

    setIsAddingSubtask(true);
    try {
      await addTaskSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    if (!task || processingSubtaskId) return;
    setProcessingSubtaskId(subtaskId);
    try {
      await updateTaskSubtask(task.id, subtaskId, { completed });
    } finally {
      setProcessingSubtaskId(null);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!task || processingSubtaskId) return;
    const confirmed = window.confirm('Excluir esta subtarefa?');
    if (!confirmed) return;

    setProcessingSubtaskId(subtaskId);
    try {
      await deleteTaskSubtask(task.id, subtaskId);
    } finally {
      setProcessingSubtaskId(null);
    }
  };

  const handleStartEditSubtask = (subtaskId: string, title: string) => {
    setEditingSubtaskId(subtaskId);
    setEditingSubtaskTitle(title);
  };

  const handleCancelEditSubtask = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle('');
  };

  const handleSaveSubtaskTitle = async (subtaskId: string, originalTitle: string) => {
    if (!task || processingSubtaskId) return;
    const trimmed = editingSubtaskTitle.trim();
    if (!trimmed) return;
    if (trimmed === originalTitle.trim()) {
      handleCancelEditSubtask();
      return;
    }

    setProcessingSubtaskId(subtaskId);
    try {
      await updateTaskSubtask(task.id, subtaskId, { title: trimmed });
      handleCancelEditSubtask();
    } finally {
      setProcessingSubtaskId(null);
    }
  };

  const handleUpdateSubtaskCompletedAt = async (subtaskId: string, dateValue: string) => {
    if (!task || processingSubtaskId) return;
    setProcessingSubtaskId(subtaskId);
    try {
      const trimmed = dateValue.trim();
      await updateTaskSubtask(task.id, subtaskId, { completedAt: trimmed.length > 0 ? trimmed : null });
    } finally {
      setProcessingSubtaskId(null);
    }
  };

  const handleUpdateSubtaskEstimatedDeliveryDate = async (subtaskId: string, dateValue: string) => {
    if (!task || processingSubtaskId) return;
    setProcessingSubtaskId(subtaskId);
    try {
      const trimmed = dateValue.trim();
      await updateTaskSubtask(task.id, subtaskId, { estimatedDeliveryDate: trimmed.length > 0 ? trimmed : null });
    } finally {
      setProcessingSubtaskId(null);
    }
  };

  const handleSaveMetadata = async () => {
    if (!task || isSavingMetadata) return;

    setIsSavingMetadata(true);
    try {
      const trimmedSalesforce = salesforceOppUrlInput.trim();
      const trimmedRepo = repoUrlInput.trim();
      const trimmedDate = estimatedDeliveryDateInput.trim();

      await updateTask(task.id, {
        salesforceOppUrl: trimmedSalesforce.length > 0 ? trimmedSalesforce : null,
        repoUrl: trimmedRepo.length > 0 ? trimmedRepo : null,
        estimatedDeliveryDate: trimmedDate.length > 0 ? trimmedDate : null,
      });
    } finally {
      setIsSavingMetadata(false);
    }
  };

  if (!task || !project) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push('/tasks')} className="text-ink-muted hover:text-ink">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para tarefas
        </Button>
        <Card className="p-6 text-ink-muted">
          <p>Tarefa não encontrada.</p>
        </Card>
      </div>
    );
  }

  const todayISO = new Date().toISOString().split('T')[0];
  const isPlannedForToday = task.plannedFor === 'today' || task.plannedFor === todayISO;
  const estimatedDelivery = task.estimatedDeliveryDate
    ? formatFriendlyDate(task.estimatedDeliveryDate)
    : 'Não informada';
  const salesforceLink = task.salesforceOppUrl ?? '';
  const repoLink = task.repoUrl ?? '';
  const estimateLabel = task.estimateMin ? formatDuration(task.estimateMin * 60) : 'Não informada';
  const dueSignals = getTaskDueSignals(task, project);
  const highestDueLevel = getTaskHighestDueLevel(dueSignals);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/tasks')} className="text-ink-muted hover:text-ink">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para tarefas
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePlanForToday}
          >
            {isPlannedForToday ? 'Remover de hoje' : 'Planejar para hoje'}
          </Button>
          <Button
            onClick={() => setIsFocusDialogOpen(true)}
          >
            <Play className="mr-2 h-4 w-4" />
            Iniciar foco
          </Button>
          <FocusDialog
            open={isFocusDialogOpen}
            onOpenChange={setIsFocusDialogOpen}
            initialProjectId={project.id}
            initialTaskId={task.id}
            onStarted={() => router.push('/focus')}
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
        </div>
      </div>

      <Card className="p-6 space-y-6">
        {isTimeOverrun && (
          <div className="flex items-center gap-2 rounded-lg border border-accent-orange/40 bg-accent-orange/[0.1] p-3 text-sm text-accent-orange">
            <TimerReset className="h-4 w-4 shrink-0" />
            <span>
              Esta tarefa acumulou <span className="font-semibold">{formatDuration(trackedSeconds)}</span> de trabalho, acima de 2h.
              Ao concluir, será exigido um comentário explicando o motivo para registro no Clockfy.
            </span>
          </div>
        )}

        {highestDueLevel && (
          <div className="rounded-lg border border-border bg-background p-3 text-sm text-ink">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              {highestDueLevel === 'overdue' && <AlertTriangle className="h-4 w-4 text-danger" />}
              {highestDueLevel === 'today' && <CalendarClock className="h-4 w-4 text-accent-orange" />}
              {highestDueLevel === 'upcoming' && <Clock3 className="h-4 w-4 text-accent-blue" />}
              {highestDueLevel === 'overdue' ? 'Tarefa com atraso de prazo' : highestDueLevel === 'today' ? 'Tarefa com entrega para hoje' : 'Tarefa com entrega próxima'}
            </div>
            <ul className="space-y-1 text-xs text-ink-muted">
              {dueSignals.slice(0, 4).map((signal) => (
                <li key={`${signal.source}-${signal.date.toISOString()}`}>
                  • {signal.source === 'task' ? 'Entrega da tarefa' : 'Entrega do projeto'} ({signal.level === 'overdue' ? 'atrasada' : signal.level === 'today' ? 'vence hoje' : 'próxima do prazo'})
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <PriorityTag priority={task.priority || 'media'} />
              <h1 className="text-2xl font-semibold text-ink">{task.title}</h1>
            </div>
            <ProjectBadge name={project.name} color={project.color} size="md" />
          </div>

          {task.description && (
            <p className="text-ink-muted leading-relaxed">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-3">
            {(['todo', 'call_agendada', 'pronta_elaboracao', 'doing', 'done'] as const).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={task.status === status ? 'default' : 'outline'}
                className="capitalize"
                onClick={() => handleStatusChange(status)}
              >
                {status === 'todo' ? 'Todo' : status === 'call_agendada' ? 'Call' : status === 'pronta_elaboracao' ? 'Pronta' : status === 'doing' ? 'Fazendo' : 'Feito'}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <Calendar className="h-5 w-5 text-ink-muted" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">Entrega prevista</p>
              <p className="text-sm text-ink">{estimatedDelivery}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <Clock className="h-5 w-5 text-ink-muted" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">Estimativa</p>
              <p className="text-sm text-ink">{estimateLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <ExternalLink className="h-5 w-5 text-ink-muted" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">Oportunidade Salesforce</p>
              {salesforceLink ? (
                <a
                  href={salesforceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-blue hover:opacity-80 text-sm"
                >
                  Abrir oportunidade
                </a>
              ) : (
                <p className="text-sm text-ink-muted">Não informado</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <ExternalLink className="h-5 w-5 text-ink-muted" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">Repositório</p>
              {repoLink ? (
                <a
                  href={repoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-blue hover:opacity-80 text-sm"
                >
                  Abrir repositório
                </a>
              ) : (
                <p className="text-sm text-ink-muted">Não informado</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink">Editar metadados</h3>
              <p className="text-xs text-ink-muted">Atualize entrega, Salesforce e repositório desta tarefa.</p>
            </div>
            <Button
              variant="outline"
              onClick={handleSaveMetadata}
              disabled={isSavingMetadata}
            >
              {isSavingMetadata ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm text-ink-muted mb-2">Entrega prevista</label>
              <Input
                type="date"
                value={estimatedDeliveryDateInput}
                onChange={(event) => setEstimatedDeliveryDateInput(event.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-ink-muted mb-2">URL da oportunidade no Salesforce</label>
              <Input
                type="url"
                value={salesforceOppUrlInput}
                onChange={(event) => setSalesforceOppUrlInput(event.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-ink-muted mb-2">URL do repositório</label>
              <Input
                type="url"
                value={repoUrlInput}
                onChange={(event) => setRepoUrlInput(event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Checklist</h2>
            <p className="text-sm text-ink-muted">Acompanhe o andamento das subtarefas desta atividade.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-2xl font-bold text-ink">{completionPercent}%</span>
              <p className="text-xs uppercase tracking-wide text-ink-muted">Concluído</p>
            </div>
            <div className="h-12 w-1 rounded bg-secondary" />
            <div className="w-32 rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {subtasks.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma subtarefa adicionada ainda.</p>
          ) : (
            subtasks.map((subtask) => {
              const isProcessing = processingSubtaskId === subtask.id;
              const isEditing = editingSubtaskId === subtask.id;
              const completedAtValue = toDateInputValue(subtask.completedAt);
              const subtaskEstimatedDeliveryDateValue = toDateInputValue(subtask.estimatedDeliveryDate);
              return (
                <div
                  key={subtask.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <button
                      type="button"
                      className="mt-0.5"
                      onClick={() => handleToggleSubtask(subtask.id, !subtask.completed)}
                      disabled={isProcessing}
                      aria-label={subtask.completed ? 'Marcar como não concluída' : 'Marcar como concluída'}
                    >
                      <div
                        className={
                          'flex h-5 w-5 items-center justify-center rounded border ' +
                          (subtask.completed
                            ? 'border-primary bg-primary/[0.14] text-primary'
                            : 'border-border bg-surface text-ink-muted')
                        }
                      >
                        {subtask.completed ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                      </div>
                    </button>

                    <div className="flex-1">
                      {isEditing ? (
                        <Input
                          value={editingSubtaskTitle}
                          onChange={(event) => setEditingSubtaskTitle(event.target.value)}
                          disabled={isProcessing}
                        />
                      ) : (
                        <p className={subtask.completed ? 'text-sm text-ink-muted line-through' : 'text-sm text-ink'}>
                          {subtask.title}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-ink-muted">Entrega prevista</span>
                        <Input
                          type="date"
                          value={subtaskEstimatedDeliveryDateValue}
                          onChange={(event) => handleUpdateSubtaskEstimatedDeliveryDate(subtask.id, event.target.value)}
                          className="h-8 w-40"
                          disabled={isProcessing}
                        />
                      </div>

                      {subtask.completed && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-ink-muted">Concluída em</span>
                          <Input
                            type="date"
                            value={completedAtValue}
                            onChange={(event) => handleUpdateSubtaskCompletedAt(subtask.id, event.target.value)}
                            className="h-8 w-40"
                            disabled={isProcessing}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-success hover:text-success hover:bg-success/[0.1]"
                          onClick={() => handleSaveSubtaskTitle(subtask.id, subtask.title)}
                          disabled={isProcessing}
                          aria-label="Salvar"
                        >
                          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-ink-muted hover:text-ink hover:bg-secondary"
                          onClick={handleCancelEditSubtask}
                          disabled={isProcessing}
                          aria-label="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-ink-muted hover:text-ink hover:bg-secondary"
                        onClick={() => handleStartEditSubtask(subtask.id, subtask.title)}
                        disabled={isProcessing}
                        aria-label="Editar subtarefa"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/[0.1]"
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      disabled={isProcessing}
                      aria-label="Excluir subtarefa"
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleAddSubtask} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4 md:flex-row md:items-center">
          <Input
            placeholder="Adicionar subtarefa..."
            value={newSubtaskTitle}
            onChange={(event) => setNewSubtaskTitle(event.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={newSubtaskTitle.trim().length === 0 || isAddingSubtask}
          >
            {isAddingSubtask ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adicionando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </>
            )}
          </Button>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Atualizações</h2>
          <span className="text-sm text-ink-muted">
            <MessageSquare className="mr-1 inline h-4 w-4" />
            {sortedComments.length} {sortedComments.length === 1 ? 'comentário' : 'comentários'}
          </span>
        </div>

        <div className="space-y-3">
          {sortedComments.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum comentário registrado ainda.</p>
          ) : (
            sortedComments.map((comment) => {
              const isEditing = editingCommentId === comment.id;
              const isSaving = savingCommentId === comment.id;
              const isDeleting = deletingCommentId === comment.id;

              return (
                <div
                  key={comment.id}
                  className="rounded-lg border border-border bg-background p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-ink-muted">{formatDateTime(comment.createdAt)}</p>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSaveComment(comment.id, comment.message)}
                          disabled={isSaving || editingCommentText.trim().length === 0}
                        >
                          {isSaving ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEditComment}
                          disabled={isSaving}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-ink-muted hover:text-ink hover:bg-secondary"
                          onClick={() => handleStartEditComment(comment.id, comment.message)}
                          disabled={Boolean(savingCommentId) || Boolean(deletingCommentId)}
                          aria-label="Editar comentário"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/[0.1]"
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={isDeleting || Boolean(savingCommentId)}
                          aria-label="Excluir comentário"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={editingCommentText}
                      onChange={(event) => setEditingCommentText(event.target.value)}
                      className="min-h-[100px]"
                      autoFocus
                    />
                  ) : (
                    <p className="text-sm text-ink whitespace-pre-wrap">{comment.message}</p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSubmitComment} className="space-y-3">
          <Textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Adicione uma atualização com data, hora e detalhes..."
            className="min-h-[120px]"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={commentText.trim().length === 0 || isSubmittingComment}
            >
              {isSubmittingComment ? 'Salvando...' : 'Adicionar comentário'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
