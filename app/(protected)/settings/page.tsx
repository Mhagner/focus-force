'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/stores/useAppStore';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Settings, Download, Upload, Trash2, PlugZap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const {
    pomodoroSettings,
    updatePomodoroSettings,
    exportData,
    importData,
    clearAllData,
    clockfySettings,
    updateClockfySettings,
    projects,
  } = useAppStore();
  const { toast } = useToast();
  const activeProjects = useMemo(() => projects.filter(project => project.active), [projects]);

  const [settings, setSettings] = useState(pomodoroSettings);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [clockfyForm, setClockfyForm] = useState({
    apiKey: clockfySettings.apiKey,
    workspaces: clockfySettings.workspaces ?? [],
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingClockfy, setIsSavingClockfy] = useState(false);

  useEffect(() => {
    setClockfyForm({
      apiKey: clockfySettings.apiKey,
      workspaces: clockfySettings.workspaces ?? [],
    });
  }, [clockfySettings]);

  useEffect(() => {
    setSettings((current) => ({
      ...current,
      defaultChecklist: pomodoroSettings.defaultChecklist ?? [],
    }));
  }, [pomodoroSettings]);

  const handleWorkspaceChange = (index: number, field: 'id' | 'description', value: string) => {
    setClockfyForm((prev) => {
      const updated = [...(prev.workspaces ?? [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, workspaces: updated };
    });
  };

  const handleAddWorkspace = () => {
    setClockfyForm((prev) => ({
      ...prev,
      workspaces: [...(prev.workspaces ?? []), { id: '', description: '' }],
    }));
  };

  const handleRemoveWorkspace = (index: number) => {
    setClockfyForm((prev) => ({
      ...prev,
      workspaces: (prev.workspaces ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updatePomodoroSettings({
        ...settings,
        defaultChecklist: settings.defaultChecklist ?? [],
      });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações do Pomodoro foram atualizadas.',
      });
    } catch (error) {
      toast({
        title: 'Não foi possível salvar',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddChecklistItem = () => {
    const trimmed = newChecklistItem.trim();
    if (!trimmed) return;
    setSettings((current) => ({
      ...current,
      defaultChecklist: [...(current.defaultChecklist ?? []), trimmed],
    }));
    setNewChecklistItem('');
  };

  const handleRemoveChecklistItem = (index: number) => {
    setSettings((current) => ({
      ...current,
      defaultChecklist: (current.defaultChecklist ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleSaveClockfy = async () => {
    setIsSavingClockfy(true);
    try {
      await updateClockfySettings(clockfyForm);
      toast({
        title: 'Integração Clockfy atualizada',
        description: 'As credenciais foram salvas.',
      });
    } catch (error) {
      toast({
        title: 'Não foi possível salvar',
        description: 'Verifique as credenciais informadas.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingClockfy(false);
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `focusforge-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Backup realizado",
      description: "Seus dados foram exportados com sucesso.",
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importData(content);

      if (success) {
        toast({
          title: "Dados importados",
          description: "O backup foi restaurado com sucesso.",
        });
      } else {
        toast({
          title: "Erro na importação",
          description: "Arquivo inválido ou corrompido.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = '';
  };

  const handleClearData = () => {
    if (confirm('Tem certeza que deseja apagar todos os dados? Esta ação não pode ser desfeita.')) {
      clearAllData();
      toast({
        title: "Dados limpos",
        description: "Todos os dados foram removidos.",
      });
    }
  };

  const clockfyConfigured = Boolean(
    clockfySettings.apiKey && ((clockfySettings.workspaces?.length ?? 0) > 0 || clockfySettings.workspaceId)
  );
  const lastClockfyUpdate = clockfySettings.updatedAt
    ? new Date(clockfySettings.updatedAt).toLocaleString()
    : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Configurações</h1>
        <p className="text-gray-400">
          Personalize sua experiência de foco
        </p>
      </div>

      <div className="space-y-6">
        {/* Pomodoro Settings */}
        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Configurações do Pomodoro</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-gray-300 mb-3 block">
                Tempo de Trabalho: {settings.workMin} minutos
              </Label>
              <Slider
                value={[settings.workMin]}
                onValueChange={([value]) => setSettings({ ...settings, workMin: value })}
                max={90}
                min={15}
                step={5}
                className="mb-4"
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-3 block">
                Pausa Curta: {settings.shortBreakMin} minutos
              </Label>
              <Slider
                value={[settings.shortBreakMin]}
                onValueChange={([value]) => setSettings({ ...settings, shortBreakMin: value })}
                max={30}
                min={5}
                step={1}
                className="mb-4"
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-3 block">
                Pausa Longa: {settings.longBreakMin} minutos
              </Label>
              <Slider
                value={[settings.longBreakMin]}
                onValueChange={([value]) => setSettings({ ...settings, longBreakMin: value })}
                max={60}
                min={15}
                step={5}
                className="mb-4"
              />
            </div>

            <div>
              <Label className="text-gray-300 mb-3 block">
                Ciclos até pausa longa: {settings.cyclesToLongBreak}
              </Label>
              <Slider
                value={[settings.cyclesToLongBreak]}
                onValueChange={([value]) => setSettings({ ...settings, cyclesToLongBreak: value })}
                max={6}
                min={2}
                step={1}
                className="mb-4"
              />
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-start" className="text-gray-300">
                Iniciar próxima fase automaticamente
              </Label>
              <Switch
                id="auto-start"
                checked={settings.autoStartNext}
                onCheckedChange={(checked) => setSettings({ ...settings, autoStartNext: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sound-on" className="text-gray-300">
                Notificações sonoras
              </Label>
              <Switch
                id="sound-on"
                checked={settings.soundOn}
                onCheckedChange={(checked) => setSettings({ ...settings, soundOn: checked })}
              />
            </div>
          </div>

          <Button
            onClick={handleSaveSettings}
            className="mt-6 bg-blue-600 hover:bg-blue-700"
            disabled={isSavingSettings}
          >
            {isSavingSettings ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Configurações'
            )}
          </Button>
        </Card>

        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="h-5 w-5 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Checklist padrão das tarefas</h2>
              <p className="text-xs text-gray-400 mt-1">
                Itens adicionados aqui serão incluídos automaticamente em novas tarefas.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end">
              <div className="flex-1">
                <Label htmlFor="new-checklist-item" className="text-gray-300">Novo item</Label>
                <Input
                  id="new-checklist-item"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="Ex: Revisar requisitos"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddChecklistItem}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!newChecklistItem.trim()}
              >
                Adicionar
              </Button>
            </div>

            {(settings.defaultChecklist?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400">Nenhum item padrão definido.</p>
            ) : (
              <div className="space-y-2">
                {settings.defaultChecklist?.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-900/60 px-3 py-2"
                  >
                    <span className="text-sm text-gray-200">{item}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChecklistItem(index)}
                      className="text-gray-400 hover:text-white"
                    >
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            onClick={handleSaveSettings}
            className="mt-6 bg-blue-600 hover:bg-blue-700"
            disabled={isSavingSettings}
          >
            {isSavingSettings ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar checklist'
            )}
          </Button>
        </Card>

        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <div className="flex items-center gap-2 mb-6">
            <PlugZap className="h-5 w-5 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Integração com Clockfy</h2>
              <p className="text-xs text-gray-400 mt-1">
                Conecte-se ao Clockfy para sincronizar projetos e sessões automaticamente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="clockfy-api" className="text-gray-300">API Key</Label>
              <Input
                id="clockfy-api"
                type="password"
                value={clockfyForm.apiKey}
                onChange={(e) => setClockfyForm({ ...clockfyForm, apiKey: e.target.value })}
                placeholder="ckey_xxxxx"
                className="bg-gray-800 border-gray-700 text-white"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Workspaces</Label>
                <Button variant="outline" size="sm" onClick={handleAddWorkspace} className="border-gray-700 text-gray-200">
                  Adicionar
                </Button>
              </div>

              {(clockfyForm.workspaces?.length ?? 0) === 0 && (
                <p className="text-sm text-gray-400">Cadastre ao menos um workspace para sincronizar.</p>
              )}

              <div className="space-y-3">
                {clockfyForm.workspaces?.map((workspace, index) => (
                  <div key={index} className="rounded-md border border-gray-800 p-3 bg-gray-900/60 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label className="text-gray-400 text-xs">Workspace ID</Label>
                        <Input
                          value={workspace.id ?? ''}
                          onChange={(e) => handleWorkspaceChange(index, 'id', e.target.value)}
                          placeholder="workspace_id"
                          className="bg-gray-800 border-gray-700 text-white"
                          autoComplete="off"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-start text-gray-400 hover:text-white"
                        onClick={() => handleRemoveWorkspace(index)}
                        disabled={(clockfyForm.workspaces?.length ?? 0) <= 1}
                        title="Remover workspace"
                      >
                        Remover
                      </Button>
                    </div>
                    <div>
                      <Label className="text-gray-400 text-xs">Descrição</Label>
                      <Input
                        value={workspace.description ?? ''}
                        onChange={(e) => handleWorkspaceChange(index, 'description', e.target.value)}
                        placeholder="Ex: Equipe Produto"
                        className="bg-gray-800 border-gray-700 text-white"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {lastClockfyUpdate && (
            <p className="text-xs text-gray-500 mt-2">
              Última atualização: {lastClockfyUpdate}
            </p>
          )}

          <Button
            onClick={handleSaveClockfy}
            className="mt-6 bg-blue-600 hover:bg-blue-700"
            disabled={isSavingClockfy}
          >
            {isSavingClockfy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar credenciais'
            )}
          </Button>

          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              {clockfyConfigured ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-400" />
              )}
              <h3 className="text-sm font-semibold text-white">Status de sincronização de projetos</h3>
            </div>

            {!clockfyConfigured && (
              <p className="text-sm text-yellow-300/80 mb-4">
                Informe a API Key e cadastre pelo menos um workspace para ativar a sincronização com o Clockfy.
              </p>
            )}

            <div className="space-y-2">
              {activeProjects.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Nenhum projeto cadastrado ainda.
                </p>
              ) : (
                activeProjects.map((project) => {
                  const clockfyStatus = project.syncWithClockfy
                    ? project.clockfyProjectId
                      ? 'synced'
                      : 'pending'
                    : 'disabled';

                  return (
                    <>
                      {clockfyStatus === 'synced' && (
                        <div
                          key={project.id}
                          className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">{project.name}</p>
                            {project.client && (
                              <p className="text-xs text-gray-400">{project.client}</p>
                            )}
                          </div>
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                            Sincronizado
                          </Badge>
                        </div>
                      )}
                    </>
                  );
                })
              )}
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-6">Gestão de Dados</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-white mb-2">Backup & Restore</h3>
              <p className="text-sm text-gray-400 mb-4">
                Exporte seus dados para fazer backup ou importe um arquivo anterior.
              </p>

              <div className="flex gap-3">
                <Button onClick={handleExport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Dados
                </Button>

                <div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                    id="import-file"
                  />
                  <Button asChild variant="outline">
                    <label htmlFor="import-file" className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Dados
                    </label>
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-700">
              <h3 className="font-medium text-red-400 mb-2">Zona de Perigo</h3>
              <p className="text-sm text-gray-400 mb-4">
                Esta ação irá apagar permanentemente todos os seus dados.
              </p>

              <Button
                onClick={handleClearData}
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Todos os Dados
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
