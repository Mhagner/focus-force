'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/useAppStore';
import { formatDateTime, formatDuration, formatFriendlyDate, getProjectHoursToday } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  MessageSquare,
  Play,
  FolderKanban,
} from 'lucide-react';

const STATUS_LABELS: Record<'todo' | 'doing' | 'done', string> = {
  todo: 'Todo',
  doing: 'Fazendo',
  done: 'Feito',
};

type Params = { projectId?: string | string[] };

function resolveParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function ProjectDetailPage() {
  const params = useParams<Params>();
  const router = useRouter();
  const projectId = resolveParam(params?.projectId);

  const { projects, tasks, sessions } = useAppStore();
  const project = projects.find((current) => current.id === projectId);

  const projectTasks = useMemo(
    () => tasks.filter((task) => task.projectId === projectId),
    [tasks, projectId],
  );

  const updates = useMemo(() => {
    return projectTasks
      .flatMap((task) =>
        (task.comments ?? []).map((comment) => ({
          id: `${task.id}-${comment.id}`,
          taskId: task.id,
          taskTitle: task.title,
          createdAt: comment.createdAt,
          message: comment.message,
        })),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [projectTasks]);

  if (!project) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => router.push('/projects')} className="text-gray-300 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para projetos
        </Button>
        <Card className="p-6 bg-gray-900/60 border border-gray-800 text-gray-300">
          <p>Projeto não encontrado.</p>
        </Card>
      </div>
    );
  }

  const todaySeconds = getProjectHoursToday(sessions, project.id);
  const weekSeconds = sessions
    .filter((session) => session.projectId === project.id)
    .reduce((total, session) => total + session.durationSec, 0);
  const pendingTasks = projectTasks.filter((task) => task.status !== 'done').length;
  const commentCount = updates.length;
  const estimatedDelivery = project.estimatedDeliveryDate
    ? formatFriendlyDate(project.estimatedDeliveryDate)
    : 'Não informada';
  const isClockfyLinked = Boolean(project.clockfyProjectId);
  const clockfyStatus = project.syncWithClockfy
    ? isClockfyLinked
      ? 'Clockfy conectado'
      : 'Clockfy pendente'
    : 'Clockfy desativado';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/projects')} className="text-gray-300 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para projetos
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push(`/tasks?focusId=${project.id}`)}
          >
            <FolderKanban className="mr-2 h-4 w-4" />
            Ver tarefas
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => router.push('/focus')}>
            <Play className="mr-2 h-4 w-4" />
            Iniciar foco
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-gray-900/60 border border-gray-800 space-y-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-3xl font-semibold text-white">{project.name}</h1>
            <Badge
              variant={clockfyStatus === 'Clockfy conectado' ? 'secondary' : 'outline'}
              className={
                clockfyStatus === 'Clockfy conectado'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : clockfyStatus === 'Clockfy pendente'
                    ? 'border-yellow-500/60 text-yellow-300'
                    : 'border-gray-600 text-gray-300'
              }
            >
              {clockfyStatus}
            </Badge>
          </div>
          {project.client && <p className="text-gray-300">Cliente: {project.client}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Horas hoje</p>
            <p className="text-xl font-semibold text-white">{formatDuration(todaySeconds)}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Horas na semana</p>
            <p className="text-xl font-semibold text-white">{formatDuration(weekSeconds)}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Tarefas pendentes</p>
            <p className="text-xl font-semibold text-white">{pendingTasks}</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Atualizações registradas</p>
            <p className="text-xl font-semibold text-white">{commentCount}</p>
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
              <p className="text-xs uppercase tracking-wide text-gray-500">Taxa/hora</p>
              <p className="text-sm text-white">{project.hourlyRate ? `R$ ${project.hourlyRate}` : 'Não informada'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/40 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/70">
              <ExternalLink className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Oportunidade Salesforce</p>
              {project.salesforceOppUrl ? (
                <a
                  href={project.salesforceOppUrl}
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
              {project.sharepointRepoUrl ? (
                <a
                  href={project.sharepointRepoUrl}
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

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6 bg-gray-900/60 border border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Linha do tempo de atualizações</h2>
            <span className="text-sm text-gray-400">
              <MessageSquare className="mr-1 inline h-4 w-4" />
              {commentCount} {commentCount === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="space-y-3">
            {updates.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma atualização registrada ainda.</p>
            ) : (
              updates.map((update) => (
                <div key={update.id} className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
                  <p className="text-xs text-gray-500">{formatDateTime(update.createdAt)}</p>
                  <p className="text-sm text-gray-300">{update.taskTitle}</p>
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">{update.message}</p>
                  <Button
                    variant="link"
                    className="mt-1 px-0 text-xs text-blue-400 hover:text-blue-300"
                    onClick={() => router.push(`/tasks/${update.taskId}`)}
                  >
                    Ver tarefa
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6 bg-gray-900/60 border border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Tarefas do projeto</h2>
            <span className="text-sm text-gray-400">{projectTasks.length} tarefas</span>
          </div>

          <div className="space-y-3">
            {projectTasks.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma tarefa associada ainda.</p>
            ) : (
              projectTasks.map((task) => {
                const commentTotal = task.comments?.length ?? 0;
                const statusLabel =
                  STATUS_LABELS[(task.status ?? 'todo') as keyof typeof STATUS_LABELS] ?? 'Desconhecido';
                return (
                  <div
                    key={task.id}
                    className="rounded-lg border border-gray-800 bg-gray-900/40 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{task.title}</p>
                        <p className="text-xs text-gray-500">{statusLabel}</p>
                      </div>
                      <Badge variant="outline" className="border-gray-700 text-gray-300">
                        {commentTotal} {commentTotal === 1 ? 'comentário' : 'comentários'}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="mt-2 text-xs text-gray-400 line-clamp-3">{task.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => router.push(`/tasks/${task.id}`)}
                      >
                        Ver detalhes
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
