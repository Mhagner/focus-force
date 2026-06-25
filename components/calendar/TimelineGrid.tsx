import { useMemo, useRef } from 'react';
import { format, isToday, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { FocusSession, Task, Project } from '@/types';
import { formatDuration } from '@/lib/utils';
import { buildSessionTimes } from '@/lib/calendar/timeline';
import { TimelineBlock, TimelineBlockData } from './TimelineBlock';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const DEFAULT_ROW_HEIGHT_PX = 40;

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

interface TimelineGridProps {
  days: Date[];
  sessions: FocusSession[];
  tasks: Task[];
  projects: Project[];
  onSessionChange: (id: string, updates: Partial<FocusSession>) => void;
  onDuplicate: (session: FocusSession) => void;
  onBlockClick?: (session: FocusSession) => void;
  showWeekdayHeader?: boolean;
  rowHeightPx?: number;
}

export function TimelineGrid({
  days,
  sessions,
  tasks,
  projects,
  onSessionChange,
  onDuplicate,
  onBlockClick,
  showWeekdayHeader = false,
  rowHeightPx = DEFAULT_ROW_HEIGHT_PX,
}: TimelineGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const containerHeightPx = HOURS.length * rowHeightPx;
  const now = new Date();
  const currentTimeTop = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * containerHeightPx;

  const sessionsByColumn = useMemo(() => {
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      return sessions.filter(s => {
        const start = new Date(s.start);
        return start >= dayStart && start <= dayEnd;
      });
    });
  }, [days, sessions]);

  const blocksByColumn = useMemo(() => {
    return sessionsByColumn.map((daySessions, columnIndex) => {
      const day = days[columnIndex];
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const totalMinutes = 24 * 60;

      return daySessions.map((session): TimelineBlockData => {
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

        const project = projects.find(p => p.id === session.projectId);
        const task = session.taskId ? tasks.find(t => t.id === session.taskId) : undefined;
        const color = project?.color ?? '#3b82f6';
        const top = (startM / totalMinutes) * containerHeightPx;
        const height = Math.min(((endM - startM) / totalMinutes) * containerHeightPx, containerHeightPx - top);

        return {
          id: session.id,
          startMinutes: startM,
          endMinutes: endM,
          top,
          height,
          timeRange: `${format(startDate, 'HH:mm')} – ${format(computedEnd, 'HH:mm')}`,
          durationLabel: formatDuration(session.durationSec),
          taskTitle: task?.title ?? 'Sessão sem tarefa',
          projectName: project?.name ?? '',
          bg: withAlpha(color, 0.18),
          border: withAlpha(color, 0.55),
          isCompact: height < 32,
          isOngoing: !session.end,
          columnIndex,
        };
      });
    });
  }, [sessionsByColumn, days, projects, tasks, containerHeightPx]);

  const handleCommit = (sessionId: string, columnIndex: number, startMinutes: number, endMinutes: number) => {
    const targetDay = days[columnIndex] ?? days[0];
    const { start, end, durationSec } = buildSessionTimes(targetDay, startMinutes, endMinutes);
    onSessionChange(sessionId, { start, end, durationSec });
  };

  const handleDuplicate = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    onDuplicate(session);
  };

  const handleBlockClick = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) onBlockClick?.(session);
  };

  return (
    <div className="grid grid-cols-[40px_1fr] gap-2">
      {/* Hour labels */}
      <div className="relative flex flex-col select-none" style={{ height: `${containerHeightPx}px` }}>
        {showWeekdayHeader && <div className="h-10" />}
        {HOURS.map(h => (
          <div key={h} className="flex flex-1 items-start justify-end pr-1.5 pt-0.5">
            <span className="text-[10px] leading-none text-gray-600">{String(h).padStart(2, '0')}h</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col">
        {showWeekdayHeader && (
          <div className="mb-2 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map(day => (
              <div key={day.toISOString()} className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-gray-500">
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div className={clsx('text-sm font-bold', isToday(day) ? 'text-blue-400' : 'text-white')}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          ref={gridRef}
          className="relative grid overflow-hidden rounded-lg border border-gray-800 bg-gray-950/50"
          style={{ height: `${containerHeightPx}px`, gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {/* Hour lines */}
          <div className="pointer-events-none absolute inset-0 flex flex-col">
            {HOURS.map(h => (
              <div key={h} className="flex-1 border-t border-gray-800/40" />
            ))}
          </div>

          {/* Column dividers + content */}
          {days.map((day, columnIndex) => (
            <div
              key={day.toISOString()}
              className={clsx(
                'relative',
                columnIndex > 0 && 'border-l border-gray-800/40',
              )}
            >
              {isToday(day) && (
                <div className="pointer-events-none absolute left-0 right-0 z-10" style={{ top: `${currentTimeTop}px` }}>
                  <div className="border-t-2 border-red-500/70" />
                  <span className="absolute -top-2.5 left-1 rounded bg-red-600 px-1 py-0.5 text-[8px] leading-none text-white">
                    {format(now, 'HH:mm')}
                  </span>
                </div>
              )}

              {blocksByColumn[columnIndex].map(block => (
                <TimelineBlock
                  key={block.id}
                  block={block}
                  containerHeightPx={containerHeightPx}
                  gridRef={gridRef}
                  columnCount={days.length}
                  onCommit={handleCommit}
                  onClick={handleBlockClick}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
