'use client';

import { useState, useEffect } from 'react';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAppStore } from '@/stores/useAppStore';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { ProjectListItem } from '@/components/projects/ProjectListItem';
import { Project } from '@/types';
import { formatFriendlyDate } from '@/lib/utils';
import { LayoutGrid, List, Plus } from 'lucide-react';

export default function ProjectsPage() {
  const { projects, tasks } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setSearchQuery(params.get('search') ?? '');
    setFocusId(params.get('focusId') ?? null);
  }, []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const searchTerm = searchQuery.trim().toLowerCase();
  let activeProjects = projects.filter(p => p.active && (!searchTerm || (
    p.name.toLowerCase().includes(searchTerm) || (p.client ?? '').toLowerCase().includes(searchTerm)
  )));

  if (focusId) {
    activeProjects = activeProjects.filter(p => p.id === focusId);
  }

  const parseToDate = (value: unknown): Date | null => {
    if (!value) return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'number') {
      const dateFromNumber = new Date(value);
      return Number.isNaN(dateFromNumber.getTime()) ? null : dateFromNumber;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;

      const normalized = trimmed.toLowerCase();
      if (normalized === 'today' || normalized === 'hoje') {
        return new Date();
      }

      const dateFromString = new Date(trimmed);
      return Number.isNaN(dateFromString.getTime()) ? null : dateFromString;
    }

    return null;
  };

  const formatDateLabel = (date: Date): string => {
    if (isToday(date)) {
      return 'Hoje';
    }

    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  };

  const getNextTaskDate = (projectId: string): Date | null => {
    const projectTasks = tasks.filter(task => task.projectId === projectId && task.plannedFor);

    const normalizedDates = projectTasks
      .map(task => parseToDate(task.plannedFor))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime());

    return normalizedDates[0] ?? null;
  };

  const getProjectPlannedDateLabel = (project: Project): string => {
    // Prefer the typed field when available
    if ((project as any).estimatedDeliveryDate) {
      const parsed = parseToDate((project as any).estimatedDeliveryDate);
      if (parsed) return formatDateLabel(parsed);
    }

    // Fallback to common metadata keys that might exist on imported projects
    const meta = project as unknown as Record<string, unknown>;
    const candidateKeys = [
      'estimatedDeliveryDate',
      'expectedDate',
      'expectedAt',
      'expectedDelivery',
      'dueDate',
      'forecastDate',
      'deliveryDate',
      'plannedDelivery',
    ];

    for (const key of candidateKeys) {
      const parsed = parseToDate(meta[key]);
      if (parsed) {
        return formatDateLabel(parsed);
      }
    }

    const nextTaskDate = getNextTaskDate(project.id);
    if (nextTaskDate) {
      return formatDateLabel(nextTaskDate);
    }

    return '—';
  };

  const getProjectNewUrlsLabel = (project: Project): string => {
    // Prefer explicit project fields for Salesforce and SharePoint
    const urls: string[] = [];
    if (project.salesforceOppUrl) urls.push(String(project.salesforceOppUrl));
    if (project.sharepointRepoUrl) urls.push(String(project.sharepointRepoUrl));
    if (urls.length) return urls.join(' • ');

    // Try typed/known metadata properties next
    const meta = project as unknown as Record<string, unknown>;
    const candidateKeys = ['newUrls', 'new_urls', 'newUrlsCount', 'urlsNovas', 'novasUrls', 'new_urls_count'];

    for (const key of candidateKeys) {
      const value = meta[key];
      if (Array.isArray(value)) {
        return value.length.toString();
      }
      if (typeof value === 'number') {
        return value.toString();
      }
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return '—';
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleNewProject = () => {
    setEditingProject(undefined);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingProject(undefined);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Projetos</h1>
          <p className="text-gray-400">
            Gerencie seus projetos e acompanhe o progresso
          </p>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => {
              if (value === 'list' || value === 'grid') {
                setViewMode(value);
              }
            }}
            className="self-start rounded-lg border border-gray-800 bg-gray-900/60 p-1 text-gray-300"
            aria-label="Alternar visualização"
          >
            <ToggleGroupItem
              value="list"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm data-[state=on]:bg-blue-600 data-[state=on]:text-white"
              aria-label="Visualização em lista"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="grid"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm data-[state=on]:bg-blue-600 data-[state=on]:text-white"
              aria-label="Visualização em cards"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Cards</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            onClick={handleNewProject}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
        </div>
      </div>

      {activeProjects.length > 0 ? (
        viewMode === 'list' ? (
          <div className="space-y-3">
            <div className="hidden md:grid md:grid-cols-[1.6fr_1fr_1fr_1fr_auto] px-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span>Projeto</span>
              <span>Cliente</span>
              <span>Novas URLs</span>
              <span>Data prevista</span>
              <span className="text-right">Ações</span>
            </div>

            {activeProjects.map(project => (
              <ProjectListItem
                key={project.id}
                project={project}
                onEdit={handleEdit}
                newUrlsLabel={getProjectNewUrlsLabel(project)}
                plannedDateLabel={getProjectPlannedDateLabel(project)}
                salesforceUrl={project.salesforceOppUrl ?? null}
                sharepointUrl={project.sharepointRepoUrl ?? null}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Nenhum projeto ativo encontrado</p>
          <Button onClick={handleNewProject}>
            Criar Primeiro Projeto
          </Button>
        </div>
      )}

      <ProjectDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        project={editingProject}
      />
    </div>
  );
}