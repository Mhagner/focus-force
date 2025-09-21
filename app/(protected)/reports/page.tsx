'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/stores/useAppStore';
import { formatDuration, exportToCsv, exportToPdf } from '@/lib/utils';
import { ProjectBadge } from '@/components/ui/project-badge';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Filter, BarChart, FileDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ManualSessionDialog } from '@/components/sessions/ManualSessionDialog';

export default function ReportsPage() {
  const { sessions, projects, tasks } = useAppStore();
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [manualOpen, setManualOpen] = useState(false);

  // Filter sessions by date range and project
  const filteredSessions = sessions.filter(session => {
    const sessionDate = new Date(session.start);
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    const inDateRange = sessionDate >= start && sessionDate <= end;
    const matchesProject = selectedProjectId === 'all' || session.projectId === selectedProjectId;

    return inDateRange && matchesProject;
  });

  // Calculate metrics
  const totalSeconds = filteredSessions.reduce((sum, session) => sum + session.durationSec, 0);
  const totalHours = totalSeconds / 3600;
  const totalDays = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (24 * 60 * 60 * 1000)));
  const avgHoursPerDay = totalSeconds / totalDays;

  // Top projects
  const projectHours = projects.map(project => ({
    project,
    totalSeconds: filteredSessions
      .filter(s => s.projectId === project.id)
      .reduce((sum, session) => sum + session.durationSec, 0),
  })).filter(p => p.totalSeconds > 0)
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 3);

  // Completed tasks
  const completedTasks = tasks.filter(task => task.status === 'done').length;

  // Prepare chart data
  const dailyData = [];
  for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
    const dayStart = startOfDay(d);
    const dayEnd = endOfDay(d);

    const dayHours = filteredSessions
      .filter(session => {
        const sessionDate = new Date(session.start);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      })
      .reduce((sum, session) => sum + session.durationSec, 0) / 3600;

    dailyData.push({
      date: format(d, 'dd/MM'),
      hours: Number(dayHours.toFixed(1)),
    });
  }

  const pieData = projects
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

  const handleExportPdf = () => {
    const exportData = filteredSessions.map(session => {
      const project = projects.find(p => p.id === session.projectId);

      return {
        'Data': format(new Date(session.start), 'dd/MM/yyyy'),
        'Início': format(new Date(session.start), 'HH:mm'),
        'Fim': session.end ? format(new Date(session.end), 'HH:mm') : 'Em andamento',
        'Projeto': project?.name || 'N/A',
        'Duração': formatDuration(session.durationSec),
      };
    });

    exportToPdf(exportData, `focusforge-sessoes-${startDate}-${endDate}.pdf`);
  };

  return (
    <>
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Relatórios</h1>
          <p className="text-gray-400">
            Análise detalhada da sua produtividade
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setManualOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            Adicionar Sessão
          </Button>
          <Button onClick={handleExportSessions} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={handleExportPdf} variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6 bg-gray-900/50 border-gray-800 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Data Início
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Data Fim
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Projeto
            </label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="bg-gray-800 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">Todos os projetos</SelectItem>
                {projects.filter(p => p.active).map((project) => (
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
        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {formatDuration(totalSeconds)}
            </p>
            <p className="text-sm text-gray-400">Horas Totais</p>
          </div>
        </Card>

        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">
              {formatDuration(Math.round(avgHoursPerDay))}
            </p>
            <p className="text-sm text-gray-400">Média por Dia</p>
          </div>
        </Card>

        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{projectHours.length}</p>
            <p className="text-sm text-gray-400">Projetos Ativos</p>
          </div>
        </Card>

        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <div className="text-center">
            <p className="text-3xl font-bold text-white">{completedTasks}</p>
            <p className="text-sm text-gray-400">Tarefas Concluídas</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Horas por Dia</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hours"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-gray-900/50 border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Distribuição por Projeto</h3>
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
              <div className="flex items-center justify-center h-full text-gray-500">
                Nenhum dado encontrado
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Top Projects */}
      <Card className="p-6 bg-gray-900/50 border-gray-800">
        <h2 className="text-lg font-semibold text-white mb-4">Top 3 Projetos</h2>

        {projectHours.length > 0 ? (
          <div className="space-y-3">
            {projectHours.map((item, index) => (
              <div key={item.project.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold text-gray-400 w-6">
                    #{index + 1}
                  </div>
                  <ProjectBadge
                    name={item.project.name}
                    color={item.project.color}
                  />
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">
                    {formatDuration(item.totalSeconds)}
                  </p>
                  {item.project.hourlyRate && (
                    <p className="text-sm text-green-400">
                      R$ {(((item.totalSeconds / 3600) * Number(item.project.hourlyRate)).toFixed(2))}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Nenhuma sessão encontrada no período selecionado
          </div>
        )}
      </Card>

      {/* Session Details */}
      <Card className="p-6 bg-gray-900/50 border-gray-800 mt-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sessões</h2>
        {filteredSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="p-2">Data</th>
                  <th className="p-2">Início</th>
                  <th className="p-2">Fim</th>
                  <th className="p-2">Projeto</th>
                  <th className="p-2">Tarefa</th>
                  <th className="p-2">Duração</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(session => {
                  const project = projects.find(p => p.id === session.projectId);
                  const task = session.taskId ? tasks.find(t => t.id === session.taskId) : null;

                  return (
                    <tr key={session.id} className="border-t border-gray-800">
                      <td className="p-2">{format(new Date(session.start), 'dd/MM/yyyy')}</td>
                      <td className="p-2">{format(new Date(session.start), 'HH:mm')}</td>
                      <td className="p-2">{session.end ? format(new Date(session.end), 'HH:mm') : '-'}</td>
                      <td className="p-2">{project?.name || 'N/A'}</td>
                      <td className="p-2">{task?.title || 'Sem tarefa'}</td>
                      <td className="p-2">{formatDuration(session.durationSec)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Nenhuma sessão encontrada no período selecionado
          </div>
        )}
      </Card>
    </div>
    <ManualSessionDialog open={manualOpen} onOpenChange={setManualOpen} />
    </>
  );
}