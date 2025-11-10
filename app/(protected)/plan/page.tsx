'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { ProjectBadge } from '@/components/ui/project-badge';
import { formatDuration, getProjectHoursForDate } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Save, Calendar as CalendarIcon, Plus, Trash, Loader2, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { addDays, format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PlanPage() {
  const { projects, dailyPlans, sessions, updateDailyPlan } = useAppStore();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const selectedDateISO = useMemo(
    () => format(selectedDate, 'yyyy-MM-dd'),
    [selectedDate]
  );
  const selectedPlan = useMemo(
    () => dailyPlans.find(plan => plan.dateISO === selectedDateISO),
    [dailyPlans, selectedDateISO]
  );

  const previousPlan = useMemo(() => {
    const previousDateISO = format(addDays(selectedDate, -1), 'yyyy-MM-dd');
    return dailyPlans.find(plan => plan.dateISO === previousDateISO);
  }, [dailyPlans, selectedDate]);

  const [blocks, setBlocks] = useState<{ projectId: string; targetMinutes: number }[]>([]);
  const [notes, setNotes] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedPlan) {
      setBlocks(selectedPlan.blocks);
      setNotes(selectedPlan.notes || '');
    } else {
      setBlocks([]);
      setNotes('');
    }
  }, [selectedPlan, selectedDateISO]);

  const totalPlanned = blocks.reduce((sum, block) => sum + block.targetMinutes, 0);
  const totalWorkedMinutes = blocks.reduce((sum, block) => {
    const workedSeconds = getProjectHoursForDate(sessions, block.projectId, selectedDate);
    return sum + workedSeconds / 60;
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
        id: selectedPlan?.id || `plan-${Date.now()}`,
        dateISO: selectedDateISO,
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

  const handleCopyPreviousDay = () => {
    if (!previousPlan) {
      toast({
        title: 'Nenhum plano anterior encontrado',
        description: 'Crie um planejamento para o dia anterior para habilitar a cópia automática.',
      });
      return;
    }

    setBlocks(previousPlan.blocks.map(block => ({ ...block })));
    setNotes(previousPlan.notes ?? '');
    toast({ title: 'Planejamento copiado do dia anterior' });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Planejamento Diário</h1>
          <p className="text-gray-400">
            {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white"
            onClick={() => setSelectedDate(prev => addDays(prev, -1))}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="bg-gray-900/60 border-gray-700 text-white flex items-center gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-gray-900 border border-gray-800" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:text-white"
            onClick={() => setSelectedDate(prev => addDays(prev, 1))}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            className="text-gray-300 hover:text-white"
            onClick={() => setSelectedDate(new Date())}
            disabled={isToday(selectedDate)}
          >
            Hoje
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="bg-gray-900/60 border-gray-700 text-white hover:text-white"
            onClick={handleCopyPreviousDay}
            disabled={isSaving}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar dia anterior
          </Button>

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
      </div>

      {/* Progress Overview */}
      <Card className="p-6 bg-gray-900/50 border-gray-800 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">Progresso do Dia</h2>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Tempo trabalhado vs planejado</span>
            <span className="text-white">
              {formatDuration(Math.round(totalWorkedMinutes * 60))} / {formatDuration(totalPlanned * 60)}
            </span>
          </div>
          <Progress
            value={totalPlanned > 0 ? (totalWorkedMinutes / totalPlanned) * 100 : 0}
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
              {totalPlanned > 0 ? Math.round((totalWorkedMinutes / totalPlanned) * 100) : 0}%
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

            const workedMinutes = getProjectHoursForDate(sessions, block.projectId, selectedDate) / 60;
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