'use client';

import { useMemo, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';
import {
  format, addDays, addWeeks, addMonths,
  isSameDay, isSameMonth, isToday,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatDuration } from '@/lib/utils';
import { ChevronLeft, ChevronRight, LayoutGrid, CalendarDays, Clock, ZoomIn, ZoomOut } from 'lucide-react';
import { TimelineGrid } from '@/components/calendar/TimelineGrid';
import { SessionDetailDialog } from '@/components/calendar/SessionDetailDialog';
import { FocusSession } from '@/types';

enum ViewType { Month = 'month', Week = 'week', Day = 'day' }

const WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const ZOOM_LEVELS_PX = [28, 40, 60, 90];
const DEFAULT_ZOOM_INDEX = 1;

export default function CalendarPage() {
  const { sessions, tasks, projects, addSession, updateSession } = useAppStore();
  const [view, setView] = useState<ViewType>(ViewType.Month);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

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

  const handleSessionChange = (id: string, updates: Partial<FocusSession>) => {
    updateSession(id, updates);
  };

  const handleDuplicateSession = (session: FocusSession) => {
    const sourceEnd = session.end
      ? new Date(session.end)
      : new Date(new Date(session.start).getTime() + session.durationSec * 1000);
    const newStart = new Date(sourceEnd.getTime() + 30 * 60 * 1000);
    const newEnd = new Date(newStart.getTime() + session.durationSec * 1000);

    addSession({
      projectId: session.projectId,
      taskId: session.taskId,
      start: newStart.toISOString(),
      end: newEnd.toISOString(),
      durationSec: session.durationSec,
      type: session.type,
      notes: session.notes,
    });
  };

  const handleBlockClick = (session: FocusSession) => {
    setSelectedSessionId(session.id);
  };

  const selectedSession = selectedSessionId ? sessions.find(s => s.id === selectedSessionId) ?? null : null;
  const selectedSessionProject = selectedSession ? projects.find(p => p.id === selectedSession.projectId) : undefined;
  const selectedSessionTask = selectedSession?.taskId ? tasks.find(t => t.id === selectedSession.taskId) : undefined;

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

        {/* Zoom controls (Week / Day) */}
        {(view === ViewType.Week || view === ViewType.Day) && (
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-gray-800 bg-gray-900/60 p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-white disabled:opacity-30"
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex(i => Math.max(0, i - 1))}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:text-white disabled:opacity-30"
              disabled={zoomIndex === ZOOM_LEVELS_PX.length - 1}
              onClick={() => setZoomIndex(i => Math.min(ZOOM_LEVELS_PX.length - 1, i + 1))}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
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
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-gray-700 bg-gray-900/60 px-3 text-xs text-gray-300 hover:text-white"
              onClick={() => selectDay(selectedDate)}
            >
              Ver dia selecionado
            </Button>
          </div>
          <Card className="border-gray-800 bg-gray-900/50 p-4">
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <TimelineGrid
                  days={weekDays}
                  sessions={sessions}
                  tasks={tasks}
                  projects={projects}
                  onSessionChange={handleSessionChange}
                  onDuplicate={handleDuplicateSession}
                  onBlockClick={handleBlockClick}
                  showWeekdayHeader
                  rowHeightPx={ZOOM_LEVELS_PX[zoomIndex]}
                />
              </div>
            </div>
          </Card>
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
                <div className="overflow-y-auto" style={{ maxHeight: '64vh' }}>
                  <TimelineGrid
                    days={[selectedDate]}
                    sessions={sessions}
                    tasks={tasks}
                    projects={projects}
                    onSessionChange={handleSessionChange}
                    onDuplicate={handleDuplicateSession}
                    onBlockClick={handleBlockClick}
                    rowHeightPx={ZOOM_LEVELS_PX[zoomIndex]}
                  />
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

      <SessionDetailDialog
        session={selectedSession}
        project={selectedSessionProject}
        task={selectedSessionTask}
        onOpenChange={(open) => { if (!open) setSelectedSessionId(null); }}
        onSave={handleSessionChange}
        onDuplicate={handleDuplicateSession}
      />
    </div>
  );
}
