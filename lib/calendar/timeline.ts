const MINUTES_PER_DAY = 24 * 60;
const SNAP_MINUTES = 15;
const MIN_DURATION_MINUTES = 15;

export function snapToQuarterHour(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export function clampToDay(minutes: number): number {
  return Math.max(0, Math.min(minutes, MINUTES_PER_DAY));
}

export function minutesFromOffset(offsetPx: number, containerHeightPx: number): number {
  if (containerHeightPx <= 0) return 0;
  return (offsetPx / containerHeightPx) * MINUTES_PER_DAY;
}

export function topFromMinutes(minutes: number, containerHeightPx: number): number {
  return (minutes / MINUTES_PER_DAY) * containerHeightPx;
}

export function buildSessionTimes(
  day: Date,
  startMinutes: number,
  endMinutes: number,
): { start: string; end: string; durationSec: number } {
  const safeStart = clampToDay(startMinutes);
  const safeEnd = clampToDay(Math.max(endMinutes, safeStart + MIN_DURATION_MINUTES));

  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  start.setMinutes(safeStart);

  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  end.setMinutes(safeEnd);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    durationSec: (safeEnd - safeStart) * 60,
  };
}
