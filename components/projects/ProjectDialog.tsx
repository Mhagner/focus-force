'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const { addProject, updateProject, clockfySettings } = useAppStore();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [color, setColor] = useState(defaultColors[0]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [syncWithClockfy, setSyncWithClockfy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [salesforceOppUrl, setSalesforceOppUrl] = useState('');
  const [sharepointRepoUrl, setSharepointRepoUrl] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [clockfyWorkspaceId, setClockfyWorkspaceId] = useState('');

  const availableWorkspaces = clockfySettings.workspaces ?? [];

  useEffect(() => {
    if (syncWithClockfy && !clockfyWorkspaceId && availableWorkspaces.length > 0) {
      setClockfyWorkspaceId(availableWorkspaces[0].id);
    }
  }, [syncWithClockfy, clockfyWorkspaceId, availableWorkspaces]);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setClient(project.client || '');
      setColor(project.color);
      setHourlyRate(project.hourlyRate?.toString() || '');
      setSyncWithClockfy(project.syncWithClockfy);
      setSalesforceOppUrl(project.salesforceOppUrl || '');
      setSharepointRepoUrl(project.sharepointRepoUrl || '');
      setClockfyWorkspaceId(project.clockfyWorkspaceId || availableWorkspaces[0]?.id || '');

      if (project.estimatedDeliveryDate) {
        const dateValue =
          project.estimatedDeliveryDate instanceof Date
            ? project.estimatedDeliveryDate
            : new Date(project.estimatedDeliveryDate);
        if (!Number.isNaN(dateValue.getTime())) {
          setEstimatedDeliveryDate(format(dateValue, 'yyyy-MM-dd'));
        } else {
          setEstimatedDeliveryDate('');
        }
      } else {
        setEstimatedDeliveryDate('');
      }
    } else {
      setName('');
      setClient('');
      setColor(defaultColors[0]);
      setHourlyRate('');
      setSyncWithClockfy(false);
      setSalesforceOppUrl('');
      setSharepointRepoUrl('');
      setEstimatedDeliveryDate('');
      setClockfyWorkspaceId(availableWorkspaces[0]?.id || '');
    }
  }, [project, open, availableWorkspaces]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const selectedWorkspaceId = syncWithClockfy
      ? clockfyWorkspaceId || availableWorkspaces[0]?.id || ''
      : null;

    if (syncWithClockfy && !selectedWorkspaceId) {
      toast({ title: 'Selecione um workspace para sincronizar.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedSalesforceUrl = salesforceOppUrl.trim();
      const trimmedSharepointUrl = sharepointRepoUrl.trim();

      const isEditing = Boolean(project);

      const projectData = {
        name: name.trim(),
        client: client.trim() || undefined,
        color,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        active: isEditing && project ? project.active : true,
        syncWithClockfy,
        clockfyWorkspaceId: syncWithClockfy ? selectedWorkspaceId || undefined : null,
        salesforceOppUrl: trimmedSalesforceUrl ? trimmedSalesforceUrl : null,
        sharepointRepoUrl: trimmedSharepointUrl ? trimmedSharepointUrl : null,
        estimatedDeliveryDate: estimatedDeliveryDate ? estimatedDeliveryDate : null,
      };

      if (project) {
        await updateProject(project.id, projectData);
        toast({ title: 'Projeto atualizado' });
      } else {
        await addProject(projectData);
        toast({ title: 'Projeto criado' });
      }

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 max-h-[85vh] overflow-y-auto sm:max-h-[80vh]">
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
                  className={`w-10 h-10 rounded-lg border-2 ${color === colorOption ? 'border-white' : 'border-gray-600'
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

          <div>
            <Label htmlFor="salesforceOppUrl" className="text-gray-300">URL da oportunidade no Salesforce</Label>
            <Input
              id="salesforceOppUrl"
              type="url"
              value={salesforceOppUrl}
              onChange={(e) => setSalesforceOppUrl(e.target.value)}
              placeholder="https://..."
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="sharepointRepoUrl" className="text-gray-300">URL do repositório no SharePoint</Label>
            <Input
              id="sharepointRepoUrl"
              type="url"
              value={sharepointRepoUrl}
              onChange={(e) => setSharepointRepoUrl(e.target.value)}
              placeholder="https://..."
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="estimatedDeliveryDate" className="text-gray-300">Data prevista de entrega</Label>
            <Input
              id="estimatedDeliveryDate"
              type="date"
              value={estimatedDeliveryDate}
              onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
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

          {syncWithClockfy && (
            <div>
              <Label className="text-gray-300">Workspace do Clockfy</Label>
              {availableWorkspaces.length > 0 ? (
                <Select
                  value={clockfyWorkspaceId || availableWorkspaces[0]?.id || ''}
                  onValueChange={setClockfyWorkspaceId}
                >
                  <SelectTrigger className="mt-2 bg-gray-800 border-gray-700 text-white">
                    <SelectValue placeholder="Selecione um workspace" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 text-white">
                    {availableWorkspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.description || workspace.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-yellow-300/80 mt-2">
                  Cadastre workspaces na página de configurações para habilitar a sincronização.
                </p>
              )}
            </div>
          )}

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
              disabled={!name.trim() || isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {project ? 'Atualizando...' : 'Criando...'}
                </>
              ) : (
                project ? 'Atualizar' : 'Criar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}