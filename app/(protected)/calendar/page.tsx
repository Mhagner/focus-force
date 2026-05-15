'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';
import {
  format, addDays, addWeeks, addMonths,
  isSameDay, isSameMonth, isToday,
  startOfDay, endOfDay,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDuration } from '@/lib/utils';
import { ChevronLeft, ChevronRight, LayoutGrid, CalendarDays, Clock } from 'lucide-react';

enum ViewType { Month = 'month', Week = 'week', Day = 'day' }

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length >= 6) {
      const base = hex.slice(0, 6);
      const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
      return `#${base}${alphaHex}`;
    }
  }
  return `rgba(59,130,246,${alpha})`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export default function CalendarPage() {
  const { sessions, tasks, projects } = useAppStore();
  const [view, setView] = useState<ViewType>(ViewType.Month);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view !== ViewType.Day || !timelineRef.current) return;
    const targetHour = isToday(selectedDate) ? new Date().getHours() : 8;
    const container = timelineRef.current;
    container.scrollTop = Math.max(0, (targetHour / 24) * container.scrollHeight - 120);
  }, [view, selectedDate]);

  const navigate = (dir: 1 | -1) =>
    setSelectedDate(prev =>
      view === ViewType.Month ? addMonths(prev, dir)
        : view === ViewType.Week ? addWeeks(prev, dir)
          : addDays(prev, dir)
    );

  const periodLabel = useMemo(() => {
    if (view === ViewType.Month)
      return format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });
    if (view === ViewType.Week) {
      const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const we = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return isSameMonth(ws, we)
        ? `${format(ws, 'd')} – ${format(we, "d 'de' MMMM", { locale: ptBR })}`
        : `${format(ws, 'd MMM', { locale: ptBR })} – ${format(we, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }, [view, selectedDate]);

  // Index sessions by date for O(1) lookup
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const key = format(new Date(s.start), 'yyyy-MM-dd');
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [sessions]);

  const getSessionsForDay = (date: Date) =>
    sessionsByDate.get(format(date, 'yyyy-MM-dd')) ?? [];

  // ─── Day view data ────────────────────────────────────────
  const sessionsForDate = useMemo(() =>
    (sessionsByDate.get(format(selectedDate, 'yyyy-MM-dd')) ?? [])
      .slice()
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [sessionsByDate, selectedDate],
  );

  const totalSecondsForDate = useMemo(
    () => sessionsForDate.reduce((t, s) => t + s.durationSec, 0),
    [sessionsForDate],
  );

  const timelineSessions = useMemo(() => {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);
    const totalMinutes = 24 * 60;

    return sessionsForDate.map(session => {
      const startDate = new Date(session.start);
      const computedEnd = session.end
        ? new Date(session.end)
        : new Date(startDate.getTime() + session.durationSec * 1000);
      const clampedStart = startDate < dayStart ? dayStart : startDate;
      const clampedEnd = computedEnd > dayEnd ? dayEnd : computedEnd;
      let startM = clampedStart.getHours() * 60 + clampedStart.getMinutes();
      let endM = clampedEnd.getHours() * 60 + clampedEnd.getMinutes();
      startM = Math.max(0, Math.min(startM, totalMinutes - 1));
      endM = Math.max(startM + 5, Math.min(endM, totalMinutes));
      const top = (startM / totalMinutes) * 100;
      const height = Math.min(((endM - startM) / totalMinutes) * 100, 100 - top);
      const project = projects.find(p => p.id === session.projectId);
      const task = session.taskId ? tasks.find(t => t.id === session.taskId) : undefined;
      const color = project?.color ?? '#3b82f6';
      return {
        id: session.id,
        top, height,
        timeRange: `${format(startDate, 'HH:mm')} – ${format(computedEnd, 'HH:mm')}`,
        durationLabel: formatDuration(session.durationSec),
        taskTitle: task?.title ?? 'Sessão sem tarefa',
        projectName: project?.name ?? '',
        color,
        bg: withAlpha(color, 0.18),
        border: withAlpha(color, 0.55),
        isCompact: height < 5,
      };
    });
  }, [sessionsForDate, selectedDate, tasks, projects]);

  const taskSummaries = useMemo(() => {
    const map = new Map<string, {
      key: string; title: string; projectName: string; color?: string; totalSeconds: number;
    }>();
    for (const session of sessionsForDate) {
      const task = session.taskId ? tasks.find(t => t.id === session.taskId) : undefined;
      const project = projects.find(p => p.id === session.projectId);
      const key = session.taskId ?? `project-${session.projectId}`;
      const existing = map.get(key);
      if (existing) existing.totalSeconds += session.durationSec;
      else map.set(key, {
        key,
        title: task?.title ?? 'Sessão sem tarefa',
        projectName: project?.name ?? '',
        color: project?.color,
        totalSeconds: session.durationSec,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [sessionsForDate, tasks, projects]);

  // ─── Month grid ───────────────────────────────────────────
  const monthDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 }),
  }), [selectedDate]);

  // ─── Week grid ────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [selectedDate]);

  const now = new Date();
  const currentTimePct = (now.getHours() * 60 + now.getMinutes()) / (24 * 60) * 100;

  const selectDay = (day: Date) => {
    setSelectedDate(day);
    setView(ViewType.Day);
  };

  // ─── View tab definitions ─────────────────────────────────
  const viewTabs = [
    { value: ViewType.Month, label: 'Mês', icon: LayoutGrid },
    { value: ViewType.Week, label: 'Semana', icon: CalendarDays },
    { value: ViewType.Day, label: 'Dia', icon: Clock },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-6">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View toggle */}
        <div className="flex gap-0.5 rounded-lg border border-gray-800 bg-gray-900/60 p-1">
          {viewTabs.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={clsx(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                view === value ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Prev / Next / Today */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-gray-700 bg-gray-900/60 px-3 text-sm text-gray-300 hover:text-white"
            onClick={() => setSelectedDate(new Date())}
          >
            Hoje
          </Button>
        </div>

        <h2 className="text-lg font-semibold capitalize text-white">{periodLabel}</h2>
      </div>

      {/* ── Month view ─────────────────────────────────────── */}
      {view === ViewType.Month && (
        <Card className="border-gray-800 bg-gray-900/50 p-4">
          {/* Weekday labels */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {WEEK_LABELS.map(d => (
              <div key={d} className="py-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-gray-800/60">
            {monthDays.map(day => {
              const daySessions = getSessionsForDay(day);
              const totalSec = daySessions.reduce((s, sess) => s + sess.durationSec, 0);
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, selectedDate);
              const isCurrentDay = isToday(day);
              const colors = Array.from(new Set(
                daySessions
                  .map(s => projects.find(p => p.id === s.projectId)?.color)
                  .filter((c): c is string => Boolean(c)),
              )).slice(0, 4);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => selectDay(day)}
                  className={clsx(
                    'flex min-h-[80px] flex-col bg-gray-950/40 p-2 text-left transition-colors hover:bg-gray-800/40 focus:outline-none focus:ring-inset focus:ring-1 focus:ring-blue-500',
                    isSelected && 'ring-inset ring-2 ring-blue-500',
                    isCurrentDay && !isSelected && 'bg-blue-900/20',
                    !isCurrentMonth && 'opacity-25',
                  )}
                >
                  <span className={clsx(
                    'self-start rounded-full px-1.5 py-0.5 text-xs font-bold leading-none',
                    isCurrentDay ? 'bg-blue-600 text-white' : 'text-gray-400',
                  )}>
                    {format(day, 'd')}
                  </span>

                  {colors.length > 0 && (
                    <div className="mt-auto w-full pt-2 space-y-1">
                      <div className="flex gap-0.5">
                        {colors.map((color, i) => (
                          <span key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-500">{formatDuration(totalSec)}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Week view ──────────────────────────────────────── */}
      {view === ViewType.Week && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[600px] grid-cols-7 gap-2">
            {weekDays.map(day => {
              const daySessions = getSessionsForDay(day)
                .slice()
                .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
              const totalSec = daySessions.reduce((s, sess) => s + sess.durationSec, 0);
              const isCurrentDay = isToday(day);
              const isSelected = isSameDay(day, selectedDate);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => selectDay(day)}
                  className={clsx(
                    'flex flex-col rounded-xl border p-3 text-left transition focus:outline-none focus:ring-1 focus:ring-blue-500',
                    isCurrentDay
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : isSelected
                        ? 'border-gray-600 bg-gray-800/50'
                        : 'border-gray-800 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/70',
                  )}
                >
                  {/* Day header */}
                  <div className="mb-3 flex items-start justify-between gap-1">
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-gray-500">
                        {format(day, 'EEE', { locale: ptBR })}
                      </div>
                      <div className={clsx(
                        'text-xl font-bold leading-tight',
                        isCurrentDay ? 'text-blue-400' : 'text-white',
                      )}>
                        {format(day, 'd')}
                      </div>
                    </div>
                    {totalSec > 0 && (
                      <span className="rounded-full bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400">
                        {formatDuration(totalSec)}
                      </span>
                    )}
                  </div>

                  {/* Sessions */}
                  {daySessions.length === 0 ? (
                    <div className="py-3 text-[11px] text-gray-600">Sem sessões</div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {daySessions.slice(0, 3).map(session => {
                        const project = projects.find(p => p.id === session.projectId);
                        const task = session.taskId ? tasks.find(t => t.id === session.taskId) : undefined;
                        const color = project?.color ?? '#3b82f6';
                        return (
                          <div
                            key={session.id}
                            className="flex items-start gap-1.5 rounded-md px-2 py-1.5"
                            style={{ backgroundColor: withAlpha(color, 0.15) }}
                          >
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                            <div className="min-w-0">
                              <div className="truncate text-[11px] font-medium leading-tight text-white">
                                {task?.title ?? 'Sessão'}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {format(new Date(session.start), 'HH:mm')} · {formatDuration(session.durationSec)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {daySessions.length > 3 && (
                        <div className="pl-1 text-[10px] text-gray-500">+{daySessions.length - 3} mais</div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Day view ───────────────────────────────────────── */}
      {view === ViewType.Day && (
        <div className="flex flex-col gap-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Tempo total', value: totalSecondsForDate > 0 ? formatDuration(totalSecondsForDate) : '—' },
              { label: 'Sessões', value: sessionsForDate.length > 0 ? String(sessionsForDate.length) : '—' },
              { label: 'Tarefas', value: taskSummaries.length > 0 ? String(taskSummaries.length) : '—' },
            ].map(({ label, value }) => (
              <Card key={label} className="border-gray-800 bg-gray-900/50 px-4 py-3 text-center">
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="mt-0.5 text-xs text-gray-500">{label}</div>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            {/* Timeline */}
            <Card className="border-gray-800 bg-gray-900/50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Linha do tempo</h3>

              {sessionsForDate.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-800 py-16 text-center text-sm text-gray-500">
                  Nenhuma sessão registrada para este dia
                </div>
              ) : (
                <div ref={timelineRef} className="overflow-y-auto" style={{ maxHeight: '64vh' }}>
                  <div className="grid grid-cols-[40px_1fr] gap-2">
                    {/* Hour labels */}
                    <div className="relative flex h-[960px] flex-col select-none">
                      {HOURS.map(h => (
                        <div key={h} className="flex flex-1 items-start justify-end pr-1.5 pt-0.5">
                          <span className="text-[10px] leading-none text-gray-600">{String(h).padStart(2, '0')}h</span>
                        </div>
                      ))}
                    </div>

                    {/* Grid + blocks */}
                    <div className="relative h-[960px] overflow-hidden rounded-lg border border-gray-800 bg-gray-950/50">
                      {/* Hour lines */}
                      <div className="pointer-events-none absolute inset-0 flex flex-col">
                        {HOURS.map(h => (
                          <div key={h} className="flex-1 border-t border-gray-800/40" />
                        ))}
                      </div>

                      {/* Current time indicator */}
                      {isToday(selectedDate) && (
                        <div
                          className="pointer-events-none absolute left-0 right-0 z-10"
                          style={{ top: `${currentTimePct}%` }}
                        >
                          <div className="border-t-2 border-red-500/70" />
                          <span className="absolute -top-2.5 left-2 rounded bg-red-600 px-1.5 py-0.5 text-[9px] leading-none text-white">
                            {format(now, 'HH:mm')}
                          </span>
                        </div>
                      )}

                      {/* Session blocks */}
                      {timelineSessions.map(session => (
                        <div
                          key={session.id}
                          className="absolute left-1.5 right-1.5 rounded-md border px-2 py-1 shadow-md"
                          style={{
                            top: `${session.top}%`,
                            height: `${session.height}%`,
                            minHeight: '22px',
                            backgroundColor: session.bg,
                            borderColor: session.border,
                          }}
                        >
                          {!session.isCompact && (
                            <div className="flex items-center justify-between text-[10px] text-gray-300">
                              <span>{session.timeRange}</span>
                              <span>{session.durationLabel}</span>
                            </div>
                          )}
                          <div className="truncate text-xs font-semibold text-white">{session.taskTitle}</div>
                          {!session.isCompact && session.projectName && (
                            <div className="text-[10px] text-gray-400">{session.projectName}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Task summary */}
            <Card className="border-gray-800 bg-gray-900/50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Tarefas trabalhadas</h3>
              {taskSummaries.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">—</div>
              ) : (
                <div className="space-y-2">
                  {taskSummaries.map(summary => (
                    <div
                      key={summary.key}
                      className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2.5"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: summary.color ?? '#3b82f6' }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-white">{summary.title}</div>
                        {summary.projectName && (
                          <div className="text-xs text-gray-500">{summary.projectName}</div>
                        )}
                      </div>
                      <div className="shrink-0 text-sm tabular-nums text-gray-300">
                        {formatDuration(summary.totalSeconds)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
