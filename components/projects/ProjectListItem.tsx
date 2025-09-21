'use client';

import { Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Edit, Link2 } from 'lucide-react';

interface ProjectListItemProps {
  project: Project;
  onEdit: (project: Project) => void;
  newUrlsLabel: string;
  plannedDateLabel: string;
  salesforceUrl?: string | null;
  sharepointUrl?: string | null;
}

export function ProjectListItem({
  project,
  onEdit,
  newUrlsLabel,
  plannedDateLabel,
  salesforceUrl,
  sharepointUrl,
}: ProjectListItemProps) {
  const isClockfyLinked = Boolean(project.clockfyProjectId);
  const clockfyStatus = project.syncWithClockfy
    ? isClockfyLinked
      ? 'linked'
      : 'pending'
    : 'disabled';

  const badgeClassName =
    clockfyStatus === 'linked'
      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
      : clockfyStatus === 'pending'
        ? 'border-yellow-500/60 text-yellow-300'
        : 'border-gray-600 text-gray-300';

  const badgeLabel =
    clockfyStatus === 'linked'
      ? 'Clockfy conectado'
      : clockfyStatus === 'pending'
        ? 'Clockfy pendente'
        : 'Clockfy desativado';

  const newUrlsIsEmpty = newUrlsLabel === '—' || newUrlsLabel === '0';
  const dateIsEmpty = plannedDateLabel === '—';

  return (
    <div className="grid gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-4 transition-colors hover:bg-gray-900 md:grid-cols-[1.6fr_1fr_1fr_1fr_auto] md:items-center">
      <div className="flex items-start gap-3">
        <div
          className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <div>
          <p className="font-medium text-white">{project.name}</p>
          <Badge
            variant={clockfyStatus === 'linked' ? 'secondary' : 'outline'}
            className={`mt-2 h-5 px-2 text-xs ${badgeClassName}`}
          >
            {badgeLabel}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span className="md:hidden text-xs font-semibold uppercase tracking-wide text-gray-500">
          Cliente
        </span>
        <span className={project.client ? 'text-white' : 'text-gray-500'}>
          {project.client || '—'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span className="md:hidden text-xs font-semibold uppercase tracking-wide text-gray-500">
          Novas URLs
        </span>
        <Link2 className="h-4 w-4 text-gray-500" />
        <div className="flex flex-col">
          {salesforceUrl ? (
            <a
              href={salesforceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-medium hover:underline"
            >
              Acessar oportunidade
            </a>
          ) : null}

          {sharepointUrl ? (
            <a
              href={sharepointUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white font-medium hover:underline"
            >
              Acessar repositório
            </a>
          ) : null}

          {!salesforceUrl && !sharepointUrl && (
            <span className={newUrlsIsEmpty ? 'text-gray-400' : 'text-white font-medium'}>
              {newUrlsLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-300">
        <span className="md:hidden text-xs font-semibold uppercase tracking-wide text-gray-500">
          Data prevista
        </span>
        <Calendar className="h-4 w-4 text-gray-500" />
        <span className={dateIsEmpty ? 'text-gray-400' : 'text-white font-medium'}>
          {plannedDateLabel}
        </span>
      </div>

      <div className="flex justify-start md:justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(project)}
          className="border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white"
        >
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </div>
    </div>
  );
}
