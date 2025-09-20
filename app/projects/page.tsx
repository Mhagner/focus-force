'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { Project } from '@/types';
import { formatFriendlyDate } from '@/lib/utils';
import { Plus } from 'lucide-react';

export default function ProjectsPage() {
  const { projects } = useAppStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();

  const activeProjects = projects.filter(p => p.active);

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Projetos</h1>
          <p className="text-gray-400">
            Gerencie seus projetos e acompanhe o progresso
          </p>
        </div>
        
        <Button 
          onClick={handleNewProject}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {activeProjects.length > 0 && (
        <div className="mb-8 overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/40">
          <table className="min-w-full divide-y divide-gray-800 text-sm">
            <thead className="bg-gray-900/60">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Projeto</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Salesforce</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">SharePoint</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-300">Entrega prevista</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {activeProjects.map((project) => {
                const formattedDate = project.estimatedDeliveryDate
                  ? formatFriendlyDate(project.estimatedDeliveryDate)
                  : null;

                return (
                  <tr key={`project-list-${project.id}`} className="hover:bg-gray-900/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <div>
                          <p className="font-medium text-white">{project.name}</p>
                          {project.client && (
                            <p className="text-xs text-gray-400">{project.client}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {project.salesforceOppUrl ? (
                        <a
                          href={project.salesforceOppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          Ver oportunidade
                        </a>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {project.sharepointRepoUrl ? (
                        <a
                          href={project.sharepointRepoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          Ver repositório
                        </a>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {formattedDate ? (
                        <span className="text-white">{formattedDate}</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project} 
              onEdit={handleEdit}
            />
          ))}
        </div>
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