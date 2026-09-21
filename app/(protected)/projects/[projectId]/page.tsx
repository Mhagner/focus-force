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
        <Button variant="ghost" onClick={() => router.push('/projects')} className="text-ink-muted hover:text-ink">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para projetos
        </Button>
        <Card className="p-6 text-ink-muted">
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
  const clockfyBadgeVariant =
    clockfyStatus === 'Clockfy conectado' ? 'success' : clockfyStatus === 'Clockfy pendente' ? 'accent-orange' : 'secondary';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/projects')} className="text-ink-muted hover:text-ink">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para projetos
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => router.push(`/tasks?focusId=${project.id}`)}
          >
            <FolderKanban className="mr-2 h-4 w-4" />
            Ver tarefas
          </Button>
          <Button variant="outline" className="text-success border-success/40 hover:bg-success/[0.1]" onClick={() => router.push('/focus')}>
            <Play className="mr-2 h-4 w-4" />
            Iniciar foco
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-3xl font-semibold text-ink">{project.name}</h1>
            <Badge variant={clockfyBadgeVariant}>
              {clockfyStatus}
            </Badge>
          </div>
          {project.client && <p className="text-ink-muted">Cliente: {project.client}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-ink-muted">Horas hoje</p>
            <p className="text-xl font-semibold text-ink">{formatDuration(todaySeconds)}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-ink-muted">Horas na semana</p>
            <p className="text-xl font-semibold text-ink">{formatDuration(weekSeconds)}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-ink-muted">Tarefas pendentes</p>
            <p className="text-xl font-semibold text-ink">{pendingTasks}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs uppercase tracking-wide text-ink-muted">Atualizações registradas</p>
            <p className="text-xl font-semibold text-ink">{commentCount}</p>
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
              <p className="text-xs uppercase tracking-wide text-ink-muted">Taxa/hora</p>
              <p className="text-sm text-ink">{project.hourlyRate ? `R$ ${project.hourlyRate}` : 'Não informada'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <ExternalLink className="h-5 w-5 text-ink-muted" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">Oportunidade Salesforce</p>
              {project.salesforceOppUrl ? (
                <a
                  href={project.salesforceOppUrl}
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
              {project.sharepointRepoUrl ? (
                <a
                  href={project.sharepointRepoUrl}
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
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Linha do tempo de atualizações</h2>
            <span className="text-sm text-ink-muted">
              <MessageSquare className="mr-1 inline h-4 w-4" />
              {commentCount} {commentCount === 1 ? 'registro' : 'registros'}
            </span>
          </div>

          <div className="space-y-3">
            {updates.length === 0 ? (
              <p className="text-sm text-ink-muted">Nenhuma atualização registrada ainda.</p>
            ) : (
              updates.map((update) => (
                <div key={update.id} className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-ink-muted">{formatDateTime(update.createdAt)}</p>
                  <p className="text-sm text-ink-muted">{update.taskTitle}</p>
                  <p className="text-sm text-ink whitespace-pre-wrap">{update.message}</p>
                  <Button
                    variant="link"
                    className="mt-1 px-0 text-xs"
                    onClick={() => router.push(`/tasks/${update.taskId}`)}
                  >
                    Ver tarefa
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Tarefas do projeto</h2>
            <span className="text-sm text-ink-muted">{projectTasks.length} tarefas</span>
          </div>

          <div className="space-y-3">
            {projectTasks.length === 0 ? (
              <p className="text-sm text-ink-muted">Nenhuma tarefa associada ainda.</p>
            ) : (
              projectTasks.map((task) => {
                const commentTotal = task.comments?.length ?? 0;
                const statusLabel =
                  STATUS_LABELS[(task.status ?? 'todo') as keyof typeof STATUS_LABELS] ?? 'Desconhecido';
                return (
                  <div
                    key={task.id}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-ink">{task.title}</p>
                        <p className="text-xs text-ink-muted">{statusLabel}</p>
                      </div>
                      <Badge variant="outline">
                        {commentTotal} {commentTotal === 1 ? 'comentário' : 'comentários'}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="mt-2 text-xs text-ink-muted line-clamp-3">{task.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
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
