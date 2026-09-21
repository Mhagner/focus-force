'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useAppStore } from '@/stores/useAppStore';
import { formatDuration, exportToCsv, getTotalWorkSecondsForDate } from '@/lib/utils';
import { exportSessionsReportToPdf, DailyHoursPoint } from '@/lib/report-pdf';
import { ProjectBadge } from '@/components/ui/project-badge';
import { format, startOfDay, endOfDay, addDays, differenceInCalendarDays, startOfWeek } from 'date-fns';
import { Download, Filter, FileDown, Trash2, Loader2, RefreshCcw, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ManualSessionDialog } from '@/components/sessions/ManualSessionDialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ptBR } from 'date-fns/locale';

export default function ReportsPage() {
  const { sessions, projects, tasks, deleteSession, dailyPlans, syncSessionWithClockfy } = useAppStore();
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [manualOpen, setManualOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [syncingSessionId, setSyncingSessionId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [draftRange, setDraftRange] = useState<{ from: Date | undefined; to?: Date } | undefined>(undefined);
  const { toast } = useToast();
  const activeProjects = useMemo(() => projects.filter(project => project.active), [projects]);
  const allowedProjectIds = useMemo(
    () => new Set(activeProjects.map(project => project.id)),
    [activeProjects]
  );

  const weeklyPlanning = useMemo(() => {
    const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(startOfCurrentWeek, index);
      const dateISO = format(date, 'yyyy-MM-dd');
      const plan = dailyPlans.find(p => p.dateISO === dateISO);
      const plannedMinutes = plan?.blocks.reduce((sum, block) => sum + block.targetMinutes, 0) ?? 0;
      const workedSeconds = getTotalWorkSecondsForDate(sessions, date);
      const efficiency = plannedMinutes > 0
        ? Math.round((workedSeconds / 60) / plannedMinutes * 100)
        : null;

      const dayName = format(date, 'EEEE', { locale: ptBR });
      const formattedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

      return {
        date,
        formattedDayName,
        plannedMinutes,
        workedSeconds,
        efficiency,
      };
    });
  }, [dailyPlans, sessions]);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteSession(id);
      toast({ title: 'Sessão excluída' });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao excluir sessão',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };

  const handleSyncSession = async (id: string) => {
    setSyncingSessionId(id);
    try {
      await syncSessionWithClockfy(id);
      toast({ title: 'Sessão sincronizada com o Clockfy' });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao sincronizar sessão',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setSyncingSessionId(null);
    }
  };

  const pickerStart = new Date(`${startDate}T00:00:00`);
  const pickerEnd = new Date(`${endDate}T00:00:00`);

  const rangeDays = differenceInCalendarDays(pickerEnd, pickerStart) + 1;

  const shiftRange = (direction: 1 | -1) => {
    const shift = direction * rangeDays;
    setStartDate(format(addDays(pickerStart, shift), 'yyyy-MM-dd'));
    setEndDate(format(addDays(pickerEnd, shift), 'yyyy-MM-dd'));
  };

  const handleCalendarOpenChange = (open: boolean) => {
    if (open) {
      setDraftRange({ from: pickerStart, to: pickerEnd });
    }
    setIsCalendarOpen(open);
  };

  const handleApplyDateRange = () => {
    if (!draftRange?.from) return;
    setStartDate(format(draftRange.from, 'yyyy-MM-dd'));
    setEndDate(format(draftRange.to ?? draftRange.from, 'yyyy-MM-dd'));
    setIsCalendarOpen(false);
  };

  const dateRangeLabel =
    startDate === endDate
      ? format(pickerStart, 'dd/MM/yyyy')
      : `${format(pickerStart, 'dd/MM/yyyy')} – ${format(pickerEnd, 'dd/MM/yyyy')}`;

  const normalizedStartDate = startOfDay(new Date(`${startDate}T00:00:00`));
  const normalizedEndDate = endOfDay(new Date(`${endDate}T00:00:00`));

  // Filter sessions by date range and project
  const filteredSessions = sessions.filter(session => {
    const sessionDate = new Date(session.start);
    const inDateRange = sessionDate >= normalizedStartDate && sessionDate <= normalizedEndDate;
    const matchesSelectedProject = selectedProjectId === 'all' || session.projectId === selectedProjectId;
    const belongsToActiveProject = allowedProjectIds.has(session.projectId);

    return inDateRange && matchesSelectedProject && belongsToActiveProject;
  });

  // Calculate metrics
  const totalSeconds = filteredSessions.reduce((sum, session) => sum + session.durationSec, 0);
  const totalHours = totalSeconds / 3600;
  const totalDays = Math.max(1, differenceInCalendarDays(normalizedEndDate, normalizedStartDate) + 1);
  const avgHoursPerDay = totalSeconds / totalDays;

  // Top projects
  const projectHours = activeProjects.map(project => ({
    project,
    totalSeconds: filteredSessions
      .filter(s => s.projectId === project.id)
      .reduce((sum, session) => sum + session.durationSec, 0),
  })).filter(p => p.totalSeconds > 0)
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 3);

  // Completed tasks
  const completedTasks = tasks.filter(
    task => task.status === 'done' && allowedProjectIds.has(task.projectId)
  ).length;

  // Prepare chart data
  const dailyData: DailyHoursPoint[] = [];
  for (let current = new Date(normalizedStartDate); current <= normalizedEndDate; current = addDays(current, 1)) {
    const currentDay = new Date(current);
    const dayStart = startOfDay(currentDay);
    const dayEnd = endOfDay(currentDay);

    const dayHours = filteredSessions
      .filter(session => {
        const sessionDate = new Date(session.start);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      })
      .reduce((sum, session) => sum + session.durationSec, 0) / 3600;

    dailyData.push({
      date: format(currentDay, 'dd/MM'),
      hours: Number(dayHours.toFixed(1)),
    });
  }

  const pieData = activeProjects
    .map(project => ({
      name: project.name,
      value: filteredSessions
        .filter(s => s.projectId === project.id)
        .reduce((sum, session) => sum + session.durationSec, 0) / 3600,
      color: project.color,
    }))
    .filter(p => p.value > 0);

  // Export functions
  const handleExportSessions = () => {
    const exportData = filteredSessions.map(session => {
      const project = projects.find(p => p.id === session.projectId);
      const task = session.taskId ? tasks.find(t => t.id === session.taskId) : null;

      return {
        'Data': format(new Date(session.start), 'dd/MM/yyyy'),
        'Início': format(new Date(session.start), 'HH:mm'),
        'Fim': session.end ? format(new Date(session.end), 'HH:mm') : 'Em andamento',
        'Projeto': project?.name || 'N/A',
        'Tarefa': task?.title || 'Sem tarefa',
        'Duração': formatDuration(session.durationSec),
        'Tipo': session.type === 'pomodoro' ? 'Pomodoro' : 'Manual',
        'Ciclos': session.pomodoroCycles || 0,
        'Notas': session.notes || '',
      };
    });

    exportToCsv(exportData, `focusforge-sessoes-${startDate}-${endDate}.csv`);
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportSessionsReportToPdf({
        sessions: filteredSessions,
        projects: activeProjects,
        tasks,
        startDate: format(pickerStart, 'dd/MM/yyyy'),
        endDate: format(pickerEnd, 'dd/MM/yyyy'),
        dailyData,
        filename: `focusforge-sessoes-${startDate}-${endDate}.pdf`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao exportar PDF',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <>
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink mb-2">Relatórios</h1>
          <p className="text-ink-muted">
            Análise detalhada da sua produtividade
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setManualOpen(true)}>
            Adicionar Sessão
          </Button>
          <Button onClick={handleExportSessions} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={handleExportPdf} variant="outline" disabled={isExportingPdf}>
            {isExportingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-ink-muted" />
          <h2 className="text-lg font-semibold text-ink">Filtros</h2>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Período
            </label>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => shiftRange(-1)}
                aria-label="Período anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover open={isCalendarOpen} onOpenChange={handleCalendarOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="min-w-[220px] justify-start gap-2 font-normal"
                  >
                    <CalendarDays className="h-4 w-4 text-ink-muted" />
                    {dateRangeLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={draftRange}
                    onSelect={setDraftRange}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                  <div className="flex items-center justify-between gap-2 border-t border-border p-3">
                    <span className="text-xs text-ink-muted">
                      {draftRange?.from
                        ? draftRange.to
                          ? `${format(draftRange.from, 'dd/MM/yyyy')} – ${format(draftRange.to, 'dd/MM/yyyy')}`
                          : format(draftRange.from, 'dd/MM/yyyy')
                        : 'Selecione o período'}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCalendarOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleApplyDateRange}
                        disabled={!draftRange?.from}
                      >
                        Filtrar
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="icon"
                onClick={() => shiftRange(1)}
                aria-label="Próximo período"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Projeto
            </label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="min-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {activeProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-ink">
              {formatDuration(totalSeconds)}
            </p>
            <p className="text-sm text-ink-muted">Horas Totais</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-ink">
              {formatDuration(Math.round(avgHoursPerDay))}
            </p>
            <p className="text-sm text-ink-muted">Média por Dia</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-ink">{projectHours.length}</p>
            <p className="text-sm text-ink-muted">Projetos Ativos</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-ink">{completedTasks}</p>
            <p className="text-sm text-ink-muted">Tarefas Concluídas</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-ink mb-4">Horas por Dia</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--ink-muted))" />
                <YAxis stroke="hsl(var(--ink-muted))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--surface))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--ink))',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-ink mb-4">Distribuição por Projeto</h3>
          <div className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value.toFixed(1)}h`, 'Horas']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-ink-muted">
                Nenhum dado encontrado
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Resumo do Planejamento da Semana</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted">
                <th className="p-2">Dia</th>
                <th className="p-2">Planejado</th>
                <th className="p-2">Trabalhado</th>
                <th className="p-2">Eficiência</th>
              </tr>
            </thead>
            <tbody>
              {weeklyPlanning.map(day => (
                <tr key={day.date.toISOString()} className="border-t border-border">
                  <td className="p-2">
                    <div className="flex flex-col">
                      <span className="text-ink font-medium">{day.formattedDayName}</span>
                      <span className="text-xs text-ink-muted">{format(day.date, 'dd/MM')}</span>
                    </div>
                  </td>
                  <td className="p-2 text-ink">{formatDuration(day.plannedMinutes * 60)}</td>
                  <td className="p-2 text-ink">{formatDuration(day.workedSeconds)}</td>
                  <td className="p-2 text-ink">
                    {day.efficiency !== null ? `${day.efficiency}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Top Projects */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Top 3 Projetos</h2>

        {projectHours.length > 0 ? (
          <div className="space-y-3">
            {projectHours.map((item, index) => (
              <div key={item.project.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold text-ink-muted w-6">
                    #{index + 1}
                  </div>
                  <ProjectBadge
                    name={item.project.name}
                    color={item.project.color}
                  />
                </div>
                <div className="text-right">
                  <p className="text-ink font-medium">
                    {formatDuration(item.totalSeconds)}
                  </p>
                  {item.project.hourlyRate && (
                    <p className="text-sm text-success">
                      R$ {(((item.totalSeconds / 3600) * Number(item.project.hourlyRate)).toFixed(2))}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-ink-muted">
            Nenhuma sessão encontrada no período selecionado
          </div>
        )}
      </Card>

      {/* Session Details */}
      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Sessões</h2>
        {filteredSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-muted">
                  <th className="p-2">Data</th>
                  <th className="p-2">Início</th>
                  <th className="p-2">Fim</th>
                  <th className="p-2">Projeto</th>
                  <th className="p-2">Tarefa</th>
                  <th className="p-2">Duração</th>
                  <th className="p-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(session => {
                  const project = projects.find(p => p.id === session.projectId);
                  const task = session.taskId ? tasks.find(t => t.id === session.taskId) : null;
                  const isTargetSession = pendingDeleteId === session.id;
                  const canSyncWithClockfy = Boolean(
                    project?.syncWithClockfy &&
                    project?.clockfyProjectId &&
                    session.end &&
                    !session.clockfyTimeEntryId
                  );
                  const isSyncing = syncingSessionId === session.id;

                  return (
                    <tr key={session.id} className="border-t border-border">
                      <td className="p-2 text-ink">{format(new Date(session.start), 'dd/MM/yyyy')}</td>
                      <td className="p-2 text-ink">{format(new Date(session.start), 'HH:mm')}</td>
                      <td className="p-2 text-ink">{session.end ? format(new Date(session.end), 'HH:mm') : '-'}</td>
                      <td className="p-2 text-ink">{project?.name || 'N/A'}</td>
                      <td className="p-2 text-ink">{task?.title || 'Sem tarefa'}</td>
                      <td className="p-2 text-ink">{formatDuration(session.durationSec)}</td>
                      <td className="p-2">
                        <div className="flex items-center justify-end gap-2">
                          {canSyncWithClockfy ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncSession(session.id)}
                              disabled={isSyncing}
                            >
                              {isSyncing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCcw className="mr-2 h-4 w-4" />
                              )}
                              Sincronizar
                            </Button>
                          ) : null}

                          <AlertDialog
                            open={isTargetSession}
                            onOpenChange={(open) => setPendingDeleteId(open ? session.id : null)}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-ink-muted hover:text-danger"
                                aria-label="Excluir sessão"
                                onClick={() => setPendingDeleteId(session.id)}
                              >
                                {isDeleting && isTargetSession ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir sessão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover esta sessão? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-danger hover:opacity-90"
                                  onClick={() => handleDelete(session.id)}
                                  disabled={isDeleting}
                                >
                                  {isDeleting && isTargetSession ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : null}
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-ink-muted">
            Nenhuma sessão encontrada no período selecionado
          </div>
        )}
      </Card>
    </div>
    <ManualSessionDialog open={manualOpen} onOpenChange={setManualOpen} />
    </>
  );
}