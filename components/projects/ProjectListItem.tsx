'use client';

import { Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Edit, Link2, MessageSquare, Archive, ArchiveRestore } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProjectListItemProps {
  project: Project;
  onEdit: (project: Project) => void;
  onToggleActive: (project: Project) => void;
  newUrlsLabel: string;
  plannedDateLabel: string;
  salesforceUrl?: string | null;
  sharepointUrl?: string | null;
  commentCount: number;
}

export function ProjectListItem({
  project,
  onEdit,
  onToggleActive,
  newUrlsLabel,
  plannedDateLabel,
  salesforceUrl,
  sharepointUrl,
  commentCount,
}: ProjectListItemProps) {
  const router = useRouter();
  const isClockfyLinked = Boolean(project.clockfyProjectId);
  const clockfyStatus = project.syncWithClockfy
    ? isClockfyLinked
      ? 'linked'
      : 'pending'
    : 'disabled';

  const isArchived = !project.active;

  const badgeVariant =
    clockfyStatus === 'linked' ? 'success' : clockfyStatus === 'pending' ? 'accent-orange' : 'secondary';

  const badgeLabel =
    clockfyStatus === 'linked'
      ? 'Clockfy conectado'
      : clockfyStatus === 'pending'
        ? 'Clockfy pendente'
        : 'Clockfy desativado';

  const newUrlsIsEmpty = newUrlsLabel === '—' || newUrlsLabel === '0';
  const dateIsEmpty = plannedDateLabel === '—';

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-secondary/40 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto] md:items-center">
      <div className="flex items-start gap-3">
        <div
          className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-ink">{project.name}</p>
            {isArchived && (
              <Badge variant="accent-orange" className="text-[10px]">
                Arquivado
              </Badge>
            )}
          </div>
          <Badge variant={badgeVariant} className="mt-2 h-5 px-2 text-xs">
            {badgeLabel}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/projects/${project.id}`)}
            className="mt-3"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {commentCount} {commentCount === 1 ? 'atualização' : 'atualizações'}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span className="md:hidden text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Cliente
        </span>
        <span className={project.client ? 'text-ink' : 'text-ink-muted'}>
          {project.client || '—'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span className="md:hidden text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Novas URLs
        </span>
        <Link2 className="h-4 w-4 text-ink-muted" />
        <div className="flex flex-col">
          {salesforceUrl ? (
            <a
              href={salesforceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink font-medium hover:underline"
            >
              Acessar oportunidade
            </a>
          ) : null}

          {sharepointUrl ? (
            <a
              href={sharepointUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink font-medium hover:underline"
            >
              Acessar repositório
            </a>
          ) : null}

          {!salesforceUrl && !sharepointUrl && (
            <span className={newUrlsIsEmpty ? 'text-ink-muted' : 'text-ink font-medium'}>
              {newUrlsLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span className="md:hidden text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Data prevista
        </span>
        <Calendar className="h-4 w-4 text-ink-muted" />
        <span className={dateIsEmpty ? 'text-ink-muted' : 'text-ink font-medium'}>
          {plannedDateLabel}
        </span>
      </div>

      <div className="flex justify-start md:justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(project)}
        >
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleActive(project)}
          className={isArchived ? 'text-success' : 'text-danger'}
        >
          {isArchived ? (
            <ArchiveRestore className="mr-2 h-4 w-4" />
          ) : (
            <Archive className="mr-2 h-4 w-4" />
          )}
          {isArchived ? 'Desarquivar' : 'Arquivar'}
        </Button>
      </div>
    </div>
  );
}
