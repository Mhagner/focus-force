'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/stores/useAppStore';
import { Slider } from '@/components/ui/slider';
import { Settings, Download, Upload, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { pomodoroSettings, updatePomodoroSettings, exportData, importData, clearAllData } = useAppStore();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState(pomodoroSettings);

  const handleSaveSettings = async () => {
    await updatePomodoroSettings(settings);
    toast({
      title: "Configurações salvas",
      description: "As configurações do Pomodoro foram atualizadas.",
    });
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
          >
            Salvar Configurações
          </Button>
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