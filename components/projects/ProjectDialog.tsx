'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Project } from '@/types';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}

const defaultColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6366F1'
];

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const { addProject, updateProject } = useAppStore();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [color, setColor] = useState(defaultColors[0]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [syncWithClockfy, setSyncWithClockfy] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setClient(project.client || '');
      setColor(project.color);
      setHourlyRate(project.hourlyRate?.toString() || '');
      setSyncWithClockfy(project.syncWithClockfy);
    } else {
      setName('');
      setClient('');
      setColor(defaultColors[0]);
      setHourlyRate('');
      setSyncWithClockfy(false);
    }
  }, [project, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const projectData = {
      name: name.trim(),
      client: client.trim() || undefined,
      color,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      active: true,
      syncWithClockfy,
    };

    if (project) {
      await updateProject(project.id, projectData);
      toast({ title: 'Projeto atualizado' });
    } else {
      await addProject(projectData);
      toast({ title: 'Projeto criado' });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">
            {project ? 'Editar Projeto' : 'Novo Projeto'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label htmlFor="name" className="text-gray-300">Nome do Projeto *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do projeto"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="client" className="text-gray-300">Cliente</Label>
            <Input
              id="client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Nome do cliente"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <Label className="text-gray-300 mb-3 block">Cor</Label>
            <div className="grid grid-cols-5 gap-2">
              {defaultColors.map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => setColor(colorOption)}
                  className={`w-10 h-10 rounded-lg border-2 ${
                    color === colorOption ? 'border-white' : 'border-gray-600'
                  }`}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="hourlyRate" className="text-gray-300">Taxa por Hora (R$)</Label>
            <Input
              id="hourlyRate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="150.00"
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3">
            <div>
              <Label htmlFor="sync-clockfy" className="text-gray-200">Sincronizar com Clockfy</Label>
              <p className="text-xs text-gray-400 mt-1">
                Ative para criar o projeto também no Clockfy e registrar sessões automaticamente.
              </p>
            </div>
            <Switch
              id="sync-clockfy"
              checked={syncWithClockfy}
              onCheckedChange={setSyncWithClockfy}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {project ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}