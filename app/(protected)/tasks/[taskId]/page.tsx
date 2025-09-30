'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/stores/useAppStore';
import { useTimerStore } from '@/stores/useTimerStore';
import { ProjectBadge } from '@/components/ui/project-badge';
import { PriorityTag } from '@/components/ui/priority-tag';
import { formatDateTime, formatDuration, formatFriendlyDate } from '@/lib/utils';
import { ArrowLeft, Calendar, Clock, ExternalLink, Play, MessageSquare } from 'lucide-react';

type Params = { taskId?: string | string[] };

function resolveParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function TaskDetailPage() {
  const params = useParams<Params>();
  const router = useRouter();
  const taskId = resolveParam(params?.taskId);

  const { tasks, projects, updateTask, addTaskComment } = useAppStore();
  const { startTimer, switchTask, isRunning } = useTimerStore();

  const task = tasks.find((current) => current.id === taskId);
  const project = task ? projects.find((current) => current.id === task.projectId) : undefined;

  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const sortedComments = useMemo(() => {
    if (!task) return [];
    return [...(task.comments ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [task]);

  const handleStatusChange = (status: 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done') => {
    if (!task) return;
    updateTask(task.id, { status: status as any });
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

  if (!task || !project) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push('/tasks')} className="text-gray-300 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para tarefas
        </Button>
        <Card className="p-6 bg-gray-900/60 border border-gray-800 text-gray-300">
          <p>Tarefa não encontrada.</p>
        </Card>
      </div>
    );
  }

  const todayISO = new Date().toISOString().split('T')[0];
  const isPlannedForToday = task.plannedFor === 'today' || task.plannedFor === todayISO;
  const estimatedDelivery = project.estimatedDeliveryDate
    ? formatFriendlyDate(project.estimatedDeliveryDate)
    : 'Não informada';
  const salesforceLink = project.salesforceOppUrl ?? '';
  const repoLink = project.sharepointRepoUrl ?? '';
  const estimateLabel = task.estimateMin ? formatDuration(task.estimateMin * 60) : 'Não informada';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/tasks')} className="text-gray-300 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para tarefas
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white"
            onClick={handlePlanForToday}
          >
            {isPlannedForToday ? 'Remover de hoje' : 'Planejar para hoje'}
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              if (isRunning) {
                switchTask(project.id, task.id);
              } else {
                startTimer('pomodoro', project.id, task.id);
              }
              router.push('/focus');
            }}
          >
            <Play className="mr-2 h-4 w-4" />
            Iniciar foco
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-gray-900/60 border border-gray-800 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <PriorityTag priority={task.priority || 'media'} />
              <h1 className="text-2xl font-semibold text-white">{task.title}</h1>
            </div>
            <ProjectBadge name={project.name} color={project.color} size="md" />
          </div>

          {task.description && (
            <p className="text-gray-300 leading-relaxed">{task.description}</p>
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
          <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/40 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/70">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Entrega prevista</p>
              <p className="text-sm text-white">{estimatedDelivery}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/40 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/70">
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Estimativa</p>
              <p className="text-sm text-white">{estimateLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/40 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/70">
              <ExternalLink className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Oportunidade Salesforce</p>
              {salesforceLink ? (
                <a
                  href={salesforceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Abrir oportunidade
                </a>
              ) : (
                <p className="text-sm text-gray-500">Não informado</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/40 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/70">
              <ExternalLink className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Repositório</p>
              {repoLink ? (
                <a
                  href={repoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Abrir repositório
                </a>
              ) : (
                <p className="text-sm text-gray-500">Não informado</p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gray-900/60 border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Atualizações</h2>
          <span className="text-sm text-gray-400">
            <MessageSquare className="mr-1 inline h-4 w-4" />
            {sortedComments.length} {sortedComments.length === 1 ? 'comentário' : 'comentários'}
          </span>
        </div>

        <div className="space-y-3">
          {sortedComments.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum comentário registrado ainda.</p>
          ) : (
            sortedComments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg border border-gray-800 bg-gray-900/40 p-3"
              >
                <p className="text-xs text-gray-500">{formatDateTime(comment.createdAt)}</p>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{comment.message}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmitComment} className="space-y-3">
          <Textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder="Adicione uma atualização com data, hora e detalhes..."
            className="min-h-[120px] bg-gray-900/70 border-gray-800 text-white"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={commentText.trim().length === 0 || isSubmittingComment}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmittingComment ? 'Salvando...' : 'Adicionar comentário'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
