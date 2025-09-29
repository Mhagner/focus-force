'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { ProjectBadge } from '@/components/ui/project-badge';
import { formatDuration, getProjectHoursToday } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Save, Calendar, Plus, Trash, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PlanPage() {
  const { projects, dailyPlans, sessions, updateDailyPlan, getDailyPlan } = useAppStore();
  const { toast } = useToast();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayPlan = getDailyPlan(today);

  const [blocks, setBlocks] = useState<{ projectId: string; targetMinutes: number }[]>([]);
  const [notes, setNotes] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (todayPlan) {
      setBlocks(todayPlan.blocks);
      setNotes(todayPlan.notes || '');
    } else {
      setBlocks([]);
      setNotes('');
    }
  }, [todayPlan]);

  const totalPlanned = blocks.reduce((sum, block) => sum + block.targetMinutes, 0);
  const totalWorked = blocks.reduce((sum, block) => {
    const hoursWorked = getProjectHoursToday(sessions, block.projectId);
    return sum + (hoursWorked / 60);
  }, 0);

  const handleBlockChange = (projectId: string, minutes: number) => {
    setBlocks(blocks.map(block =>
      block.projectId === projectId
        ? { ...block, targetMinutes: minutes }
        : block
    ));
  };

  const availableProjects = projects.filter(
    p => p.active && !blocks.some(b => b.projectId === p.id)
  );

  const handleAddBlock = () => {
    if (newProjectId) {
      setBlocks([...blocks, { projectId: newProjectId, targetMinutes: 120 }]);
      setNewProjectId('');
    }
  };

  const handleRemoveBlock = (projectId: string) => {
    setBlocks(blocks.filter(b => b.projectId !== projectId));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const planData = {
        id: todayPlan?.id || `plan-${Date.now()}`,
        dateISO: today,
        blocks: blocks.filter(block => block.targetMinutes > 0),
        notes: notes.trim() || undefined,
      };

      await updateDailyPlan(planData);
      toast({ title: 'Plano salvo' });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao salvar plano',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Planejamento Diário</h1>
          <p className="text-gray-400">
            {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        
        <Button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Plano
            </>
          )}
        </Button>
      </div>

      {/* Progress Overview */}
      <Card className="p-6 bg-gray-900/50 border-gray-800 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">Progresso do Dia</h2>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Tempo trabalhado vs planejado</span>
            <span className="text-white">
              {formatDuration(Math.round(totalWorked * 60))} / {formatDuration(totalPlanned * 60)}
            </span>
          </div>
          <Progress 
            value={totalPlanned > 0 ? (totalWorked / totalPlanned) * 100 : 0} 
            className="h-3"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total planejado: </span>
            <span className="text-white font-medium">{formatDuration(totalPlanned * 60)}</span>
          </div>
          <div>
            <span className="text-gray-400">Eficiência: </span>
            <span className="text-white font-medium">
              {totalPlanned > 0 ? Math.round((totalWorked / totalPlanned) * 100) : 0}%
            </span>
          </div>
        </div>
      </Card>

      {/* Time Blocks */}
      <Card className="p-6 bg-gray-900/50 border-gray-800 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Blocos de Tempo</h2>

        <div className="flex items-center gap-2 mb-6">
          <Select value={newProjectId} onValueChange={setNewProjectId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecionar projeto" />
            </SelectTrigger>
            <SelectContent>
              {availableProjects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddBlock} disabled={!newProjectId} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-6">
          {blocks.map((block) => {
            const project = projects.find(p => p.id === block.projectId);
            if (!project || !project.active) return null;

            const workedMinutes = getProjectHoursToday(sessions, block.projectId) / 60;
            const progress = block.targetMinutes > 0 ? (workedMinutes / block.targetMinutes) * 100 : 0;

            return (
              <div key={block.projectId} className="space-y-3">
                <div className="flex items-center justify-between">
                  <ProjectBadge name={project.name} color={project.color} />
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-white font-medium">
                        {formatDuration(block.targetMinutes * 60)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDuration(Math.round(workedMinutes * 60))} trabalhados
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveBlock(block.projectId)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="px-3">
                  <Slider
                    value={[block.targetMinutes]}
                    onValueChange={([value]) => handleBlockChange(block.projectId, value)}
                    max={480} // 8 hours
                    min={0}
                    step={15}
                    className="mb-2"
                  />
                  <Progress value={Math.min(progress, 100)} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Notes */}
      <Card className="p-6 bg-gray-900/50 border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Notas do Dia</h2>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Adicione observações sobre o dia, objetivos ou comentários..."
          className="bg-gray-800 border-gray-700 text-white min-h-24"
        />
      </Card>
    </div>
  );
}