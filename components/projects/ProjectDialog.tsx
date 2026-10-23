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
import { useWorkspace } from '@/hooks/use-workspace';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}

const defaultColors = [
  '#035578', '#7302FC', '#0043C0', '#DE7A00', '#AB5E00',
  '#7C7607', '#C00000', '#0F766E', '#9333EA', '#334155',
];

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const { addProject, updateProject, addTask, clockfySettings, pomodoroSettings } = useAppStore();
  const { toast } = useToast();
  const { isStudy, labels } = useWorkspace();
  const defaultTaskTitle = isStudy ? 'Revisão geral' : 'Análise e elaboração do escopo';

  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [color, setColor] = useState(defaultColors[0]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [syncWithClockfy, setSyncWithClockfy] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [salesforceOppUrl, setSalesforceOppUrl] = useState('');
  const [sharepointRepoUrl, setSharepointRepoUrl] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [clockfyWorkspaceId, setClockfyWorkspaceId] = useState('');
  const [createDefaultTask, setCreateDefaultTask] = useState(true);
  const [defaultTaskName, setDefaultTaskName] = useState(defaultTaskTitle);

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
      setCreateDefaultTask(false);
      setDefaultTaskName(defaultTaskTitle);

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
      const defaultRate = pomodoroSettings.defaultHourlyRate;
      setHourlyRate(defaultRate ? defaultRate.toString() : '');
      setSyncWithClockfy(true);
      setSalesforceOppUrl('');
      setSharepointRepoUrl('');
      setEstimatedDeliveryDate('');
      setClockfyWorkspaceId(availableWorkspaces[0]?.id || '');
      setCreateDefaultTask(true);
      setDefaultTaskName(defaultTaskTitle);
    }
  }, [project, open, availableWorkspaces]);

  const handleCreateDefaultTaskToggle = (checked: boolean) => {
    setCreateDefaultTask(checked);
    if (checked && !defaultTaskName.trim()) {
      setDefaultTaskName(defaultTaskTitle);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    // Workspaces de estudo não usam integração com o Clockfy.
    const shouldSync = syncWithClockfy && !isStudy;
    const selectedWorkspaceId = shouldSync
      ? clockfyWorkspaceId || availableWorkspaces[0]?.id || ''
      : null;

    if (shouldSync && !selectedWorkspaceId) {
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
        hourlyRate: !isStudy && hourlyRate ? parseFloat(hourlyRate) : undefined,
        active: isEditing && project ? project.active : true,
        syncWithClockfy: shouldSync,
        clockfyWorkspaceId: shouldSync ? selectedWorkspaceId || undefined : null,
        salesforceOppUrl: !isStudy && trimmedSalesforceUrl ? trimmedSalesforceUrl : null,
        sharepointRepoUrl: !isStudy && trimmedSharepointUrl ? trimmedSharepointUrl : null,
        estimatedDeliveryDate: estimatedDeliveryDate ? estimatedDeliveryDate : null,
      };

      if (project) {
        await updateProject(project.id, projectData);
        toast({ title: `${labels.project} atualizado${isStudy ? 'a' : ''}` });
      } else {
        const createdProject = await addProject(projectData);
        if (createDefaultTask && defaultTaskName.trim()) {
          await addTask({
            projectId: createdProject.id,
            title: defaultTaskName.trim(),
          });
        }
        toast({ title: `${labels.project} criad${isStudy ? 'a' : 'o'}` });
      }

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {project ? `Editar ${labels.project}` : labels.newProject}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label htmlFor="name">{labels.projectName} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isStudy ? 'Ex.: Direito Constitucional' : 'Nome do projeto'}
            />
          </div>

          <div>
            <Label htmlFor="client">{labels.clientField}</Label>
            <Input
              id="client"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder={labels.clientPlaceholder}
            />
          </div>

          <div>
            <Label className="mb-3 block">Cor</Label>
            <div className="grid grid-cols-5 gap-2">
              {defaultColors.map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => setColor(colorOption)}
                  className={`w-10 h-10 rounded-lg border-2 ${color === colorOption ? 'border-ink' : 'border-border'
                    }`}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>

          {!isStudy && (
            <>
              <div>
                <Label htmlFor="hourlyRate">Taxa por Hora (R$)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="150.00"
                />
              </div>

              <div>
                <Label htmlFor="salesforceOppUrl">URL da oportunidade no Salesforce</Label>
                <Input
                  id="salesforceOppUrl"
                  type="url"
                  value={salesforceOppUrl}
                  onChange={(e) => setSalesforceOppUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label htmlFor="sharepointRepoUrl">URL do repositório no SharePoint</Label>
                <Input
                  id="sharepointRepoUrl"
                  type="url"
                  value={sharepointRepoUrl}
                  onChange={(e) => setSharepointRepoUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="estimatedDeliveryDate">{labels.dueDateField}</Label>
            <Input
              id="estimatedDeliveryDate"
              type="date"
              value={estimatedDeliveryDate}
              onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
            />
          </div>

          {!isStudy && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
              <div>
                <Label htmlFor="sync-clockfy">Sincronizar com Clockfy</Label>
                <p className="text-xs text-ink-muted mt-1">
                  Ative para criar o projeto também no Clockfy e registrar sessões automaticamente.
                </p>
              </div>
              <Switch
                id="sync-clockfy"
                checked={syncWithClockfy}
                onCheckedChange={setSyncWithClockfy}
              />
            </div>
          )}

          {!isStudy && syncWithClockfy && (
            <div>
              <Label>Workspace do Clockfy</Label>
              {availableWorkspaces.length > 0 ? (
                <Select
                  value={clockfyWorkspaceId || availableWorkspaces[0]?.id || ''}
                  onValueChange={setClockfyWorkspaceId}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione um workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWorkspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.description || workspace.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-accent-orange mt-2">
                  Cadastre workspaces na página de configurações para habilitar a sincronização.
                </p>
              )}
            </div>
          )}

          {!project && (
            <>
              <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
                <div>
                  <Label htmlFor="create-default-task">
                    Criar {labels.task.toLowerCase()} inicial
                  </Label>
                  <p className="text-xs text-ink-muted mt-1">
                    Gere automaticamente um{isStudy ? '' : 'a'} {labels.task.toLowerCase()} vinculad{isStudy ? 'o' : 'a'} {isStudy ? 'à matéria' : 'ao projeto'}.
                  </p>
                </div>
                <Switch
                  id="create-default-task"
                  checked={createDefaultTask}
                  onCheckedChange={handleCreateDefaultTaskToggle}
                />
              </div>

              {createDefaultTask && (
                <div>
                  <Label htmlFor="defaultTaskName">Nome d{isStudy ? 'o' : 'a'} {labels.task.toLowerCase()}</Label>
                  <Input
                    id="defaultTaskName"
                    value={defaultTaskName}
                    onChange={(e) => setDefaultTaskName(e.target.value)}
                    placeholder={defaultTaskTitle}
                  />
                </div>
              )}
            </>
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
              className="flex-1"
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
