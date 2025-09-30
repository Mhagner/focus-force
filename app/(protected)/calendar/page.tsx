'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { DayPicker } from 'react-day-picker';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfWeek, addDays, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDuration } from '@/lib/utils';

enum ViewType {
  Month = 'month',
  Week = 'week',
  Day = 'day'
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }
    if (hex.length === 6 || hex.length === 8) {
      const base = hex.slice(0, 6);
      const alphaHex = Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0');
      return `#${base}${alphaHex}`;
    }
  }
  return `rgba(59, 130, 246, ${alpha})`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarPage() {
  const { sessions, tasks, projects } = useAppStore();
  const [view, setView] = useState<ViewType>(ViewType.Month);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const sessionsForDate = useMemo(
    () =>
      sessions
        .filter((session) => isSameDay(new Date(session.start), selectedDate))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [sessions, selectedDate]
  );

  const totalSecondsForDate = useMemo(
    () => sessionsForDate.reduce((total, session) => total + session.durationSec, 0),
    [sessionsForDate]
  );

  const timelineSessions = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    const totalMinutes = 24 * 60;

    return sessionsForDate.map((session) => {
      const startDate = new Date(session.start);
      const computedEnd = session.end
        ? new Date(session.end)
        : new Date(startDate.getTime() + session.durationSec * 1000);

      const clampedStart = startDate < dayStart ? dayStart : startDate;
      const clampedEnd = computedEnd > dayEnd ? dayEnd : computedEnd;

      let startMinutes = clampedStart.getHours() * 60 + clampedStart.getMinutes();
      let endMinutes = clampedEnd.getHours() * 60 + clampedEnd.getMinutes();

      startMinutes = Math.max(0, Math.min(startMinutes, totalMinutes - 1));
      endMinutes = Math.max(startMinutes + 1, Math.min(endMinutes, totalMinutes));

      let durationMinutes = endMinutes - startMinutes;
      if (durationMinutes <= 0) {
        durationMinutes = Math.max(Math.ceil(session.durationSec / 60), 5);
        endMinutes = Math.min(startMinutes + durationMinutes, totalMinutes);
        durationMinutes = endMinutes - startMinutes;
      }

      const rawHeight = Math.max((durationMinutes / totalMinutes) * 100, 2);
      const top = (startMinutes / totalMinutes) * 100;
      const height = Math.min(rawHeight, Math.max(100 - top, 1));
      const isCompact = height < 6;

      const project = projects.find((p) => p.id === session.projectId);
      const task = session.taskId ? tasks.find((t) => t.id === session.taskId) : undefined;
      const blockColor = project?.color ?? '#3b82f6';

      return {
        id: session.id,
        top,
        height,
        timeRange: `${format(startDate, 'HH:mm')} - ${format(computedEnd, 'HH:mm')}`,
        durationLabel: formatDuration(session.durationSec),
        taskTitle: task?.title ?? 'Sessão sem tarefa',
        projectName: project?.name ?? 'Projeto removido',
        color: blockColor,
        backgroundColor: withAlpha(blockColor, 0.25),
        borderColor: withAlpha(blockColor, 0.5),
        isCompact,
      };
    });
  }, [sessionsForDate, selectedDate, tasks, projects]);

  const taskSummaries = useMemo(() => {
    const map = new Map<
      string,
      { key: string; title: string; projectName: string; color?: string; totalSeconds: number }
    >();

    sessionsForDate.forEach((session) => {
      const task = session.taskId ? tasks.find((t) => t.id === session.taskId) : undefined;
      const project = projects.find((p) => p.id === session.projectId);
      const key = session.taskId ?? `project-${session.projectId}`;
      const title = task?.title ?? 'Sessão sem tarefa';
      const projectName = project?.name ?? 'Projeto removido';
      const color = project?.color;

      const existing = map.get(key);
      if (existing) {
        existing.totalSeconds += session.durationSec;
      } else {
        map.set(key, { key, title, projectName, color, totalSeconds: session.durationSec });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [sessionsForDate, tasks, projects]);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Calendário</h1>
        <Select value={view} onValueChange={v => setView(v as any)}>
          <SelectTrigger className="w-32 bg-gray-900/50 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="month">Mês</SelectItem>
            <SelectItem value="week">Semana</SelectItem>
            <SelectItem value="day">Dia</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {view === ViewType.Month && (
        <Card className="p-4 bg-gray-900/50 border-gray-800">
          <DayPicker
            mode="single"
            locale={ptBR}
            selected={selectedDate}
            onSelect={(day) => {
              if (day !== undefined) {
                setSelectedDate(day);
              }
            }}
            modifiers={{
              hasSessions: sessions.map(s => new Date(s.start)),
            }}
            modifiersClassNames={{
              hasSessions: 'bg-blue-600 text-white rounded-full',
            }}
          />
        </Card>
      )}

      {view === ViewType.Week && (
        <Card className="p-6 bg-gray-900/50 border border-gray-800">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {weekDays.map((day) => {
              const daySessions = sessions
                .filter((session) => isSameDay(new Date(session.start), day))
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
              const totalSeconds = daySessions.reduce((sum, session) => sum + session.durationSec, 0);
              const totalLabel = totalSeconds > 0 ? formatDuration(totalSeconds) : '0m';
              const isSelected = isSameDay(day, selectedDate);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    isSelected
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">{format(day, 'dd/MM')}</div>
                    <span className="text-xs text-gray-400">{totalLabel}</span>
                  </div>
                  <div className="space-y-2">
                    {daySessions.length === 0 ? (
                      <p className="text-xs text-gray-500">Sem registros</p>
                    ) : (
                      daySessions.slice(0, 4).map((session) => {
                        const start = new Date(session.start);
                        const end = session.end
                          ? new Date(session.end)
                          : new Date(start.getTime() + session.durationSec * 1000);
                        const project = projects.find((p) => p.id === session.projectId);
                        const task = session.taskId
                          ? tasks.find((t) => t.id === session.taskId)
                          : undefined;

                        return (
                          <div key={session.id} className="text-xs text-gray-300">
                            <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400">
                              <span>
                                {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                              </span>
                              <span>{formatDuration(session.durationSec)}</span>
                            </div>
                            <div className="mt-1 text-[13px] font-medium text-white">
                              {task?.title ?? 'Sessão sem tarefa'}
                            </div>
                            <div className="text-[10px] uppercase tracking-wide text-gray-500">
                              {project?.name ?? 'Projeto removido'}
                            </div>
                          </div>
                        );
                      })
                    )}
                    {daySessions.length > 4 && (
                      <div className="text-[11px] text-gray-500">
                        +{daySessions.length - 4} atividades
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {view === ViewType.Day && (
        <Card className="space-y-6 bg-gray-900/50 border border-gray-800 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-white">
              {format(selectedDate, 'PPPP', { locale: ptBR })}
            </h2>
            <div className="flex flex-wrap gap-4 text-sm text-gray-300">
              <span>
                <span className="text-gray-400">Tempo total:</span> {totalSecondsForDate > 0 ? formatDuration(totalSecondsForDate) : '0m'}
              </span>
              <span>
                <span className="text-gray-400">Registros:</span> {sessionsForDate.length}
              </span>
              <span>
                <span className="text-gray-400">Tarefas:</span> {taskSummaries.length}
              </span>
            </div>
          </div>

          {sessionsForDate.length > 0 ? (
            <div className="space-y-8">
              <div className="overflow-x-auto">
                <div className="min-w-[320px]">
                  <div className="grid grid-cols-[70px_minmax(0,1fr)] gap-4">
                    <div className="flex h-[960px] flex-col text-xs text-gray-500">
                      {HOURS.map((hour) => (
                        <div key={hour} className="flex-1 flex items-start justify-end pr-2">
                          <span>{hour.toString().padStart(2, '0')}:00</span>
                        </div>
                      ))}
                    </div>
                    <div className="relative h-[960px] overflow-hidden rounded-lg border border-gray-800 bg-gray-900/40">
                      <div className="absolute inset-0 flex flex-col">
                        {HOURS.map((hour) => (
                          <div key={hour} className="flex-1 border-t border-gray-800/60" />
                        ))}
                      </div>
                      {timelineSessions.map((session) => (
                        <div
                          key={session.id}
                          className="absolute left-3 right-3 rounded-md border px-3 py-2 text-xs text-white shadow-lg backdrop-blur"
                          style={{
                            top: `${session.top}%`,
                            height: `${session.height}%`,
                            backgroundColor: session.backgroundColor,
                            borderColor: session.borderColor,
                          }}
                        >
                          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-200">
                            <span>{session.timeRange}</span>
                            <span>{session.durationLabel}</span>
                          </div>
                          <div className={`mt-1 font-medium ${session.isCompact ? 'text-xs' : 'text-sm'} text-white`}
                          >
                            {session.taskTitle}
                          </div>
                          {!session.isCompact && (
                            <div className="text-[11px] uppercase tracking-wide text-gray-300">
                              {session.projectName}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-300">
                  Resumo por tarefa
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {taskSummaries.map((summary) => (
                    <div
                      key={summary.key}
                      className="rounded-lg border border-gray-800 bg-gray-900/40 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: summary.color ?? '#3b82f6' }}
                        />
                        <p className="font-medium text-white">{summary.title}</p>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                        {summary.projectName}
                      </p>
                      <p className="mt-3 text-sm text-gray-300">
                        {formatDuration(summary.totalSeconds)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-800 bg-gray-900/40 p-6 text-center text-gray-500">
              Nenhuma sessão registrada para esta data.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
