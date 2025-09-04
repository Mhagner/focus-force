'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { Project } from '@/types';
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