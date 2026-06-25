import { useCallback, useRef } from 'react';
import { clampToDay, minutesFromOffset, snapToQuarterHour, topFromMinutes } from '@/lib/calendar/timeline';

export type TimelineDragMode = 'move' | 'resize-start' | 'resize-end';

interface DragState {
  mode: TimelineDragMode;
  pointerId: number;
  sessionId: string;
  startTopPx: number;
  startHeightPx: number;
  startClientY: number;
  startClientX: number;
  startMinutes: number;
  endMinutes: number;
  originColumnIndex: number;
  containerHeightPx: number;
  blockEl: HTMLElement;
  moved: boolean;
}

interface UseTimelineDragOptions {
  gridRef: React.RefObject<HTMLDivElement>;
  columnCount: number;
  onCommit: (
    sessionId: string,
    columnIndex: number,
    startMinutes: number,
    endMinutes: number,
  ) => void;
}

const CLICK_THRESHOLD_PX = 4;

export function useTimelineDrag({ gridRef, columnCount, onCommit }: UseTimelineDragOptions) {
  const dragRef = useRef<DragState | null>(null);

  const resolveColumnIndex = useCallback((clientX: number): number => {
    const grid = gridRef.current;
    if (!grid || columnCount <= 1) return 0;
    const rect = grid.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(columnCount - 1, Math.floor(ratio * columnCount)));
  }, [gridRef, columnCount]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    const deltaY = e.clientY - drag.startClientY;
    const deltaX = e.clientX - drag.startClientX;
    if (!drag.moved && Math.hypot(deltaX, deltaY) > CLICK_THRESHOLD_PX) {
      drag.moved = true;
    }
    if (!drag.moved) return;

    if (drag.mode === 'move') {
      const deltaMinutes = minutesFromOffset(deltaY, drag.containerHeightPx);
      const durationMinutes = drag.endMinutes - drag.startMinutes;
      let newStart = clampToDay(drag.startMinutes + deltaMinutes);
      newStart = Math.min(newStart, 1440 - durationMinutes);
      const snappedStart = snapToQuarterHour(newStart);
      const top = topFromMinutes(snappedStart, drag.containerHeightPx);
      drag.blockEl.style.top = `${top}px`;
    } else if (drag.mode === 'resize-end') {
      const deltaMinutes = minutesFromOffset(deltaY, drag.containerHeightPx);
      const newEnd = clampToDay(drag.endMinutes + deltaMinutes);
      const snappedEnd = Math.max(drag.startMinutes + 15, snapToQuarterHour(newEnd));
      const height = topFromMinutes(snappedEnd, drag.containerHeightPx) - topFromMinutes(drag.startMinutes, drag.containerHeightPx);
      drag.blockEl.style.height = `${height}px`;
    } else if (drag.mode === 'resize-start') {
      const deltaMinutes = minutesFromOffset(deltaY, drag.containerHeightPx);
      const newStart = clampToDay(drag.startMinutes + deltaMinutes);
      const snappedStart = Math.min(drag.endMinutes - 15, snapToQuarterHour(newStart));
      const top = topFromMinutes(snappedStart, drag.containerHeightPx);
      const height = topFromMinutes(drag.endMinutes, drag.containerHeightPx) - top;
      drag.blockEl.style.top = `${top}px`;
      drag.blockEl.style.height = `${height}px`;
    }
  }, []);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    drag.blockEl.releasePointerCapture(drag.pointerId);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    drag.blockEl.style.cursor = '';

    if (!drag.moved) return;

    const deltaY = e.clientY - drag.startClientY;
    const durationMinutes = drag.endMinutes - drag.startMinutes;

    if (drag.mode === 'move') {
      const deltaMinutes = minutesFromOffset(deltaY, drag.containerHeightPx);
      let newStart = clampToDay(drag.startMinutes + deltaMinutes);
      newStart = Math.min(newStart, 1440 - durationMinutes);
      const snappedStart = snapToQuarterHour(newStart);
      const snappedEnd = snappedStart + durationMinutes;
      const columnIndex = resolveColumnIndex(e.clientX);
      onCommit(drag.sessionId, columnIndex, snappedStart, snappedEnd);
    } else if (drag.mode === 'resize-end') {
      const deltaMinutes = minutesFromOffset(deltaY, drag.containerHeightPx);
      const newEnd = clampToDay(drag.endMinutes + deltaMinutes);
      const snappedEnd = Math.max(drag.startMinutes + 15, snapToQuarterHour(newEnd));
      onCommit(drag.sessionId, drag.originColumnIndex, drag.startMinutes, snappedEnd);
    } else if (drag.mode === 'resize-start') {
      const deltaMinutes = minutesFromOffset(deltaY, drag.containerHeightPx);
      const newStart = clampToDay(drag.startMinutes + deltaMinutes);
      const snappedStart = Math.min(drag.endMinutes - 15, snapToQuarterHour(newStart));
      onCommit(drag.sessionId, drag.originColumnIndex, snappedStart, drag.endMinutes);
    }
  }, [handlePointerMove, onCommit, resolveColumnIndex]);

  const startDrag = useCallback((
    e: React.PointerEvent<HTMLElement>,
    mode: TimelineDragMode,
    params: {
      sessionId: string;
      startMinutes: number;
      endMinutes: number;
      columnIndex: number;
      containerHeightPx: number;
      blockEl: HTMLElement;
    },
  ) => {
    e.stopPropagation();
    const blockEl = params.blockEl;
    blockEl.setPointerCapture(e.pointerId);
    blockEl.style.cursor = mode === 'move' ? 'grabbing' : 'ns-resize';

    dragRef.current = {
      mode,
      pointerId: e.pointerId,
      sessionId: params.sessionId,
      startTopPx: topFromMinutes(params.startMinutes, params.containerHeightPx),
      startHeightPx: topFromMinutes(params.endMinutes - params.startMinutes, params.containerHeightPx),
      startClientY: e.clientY,
      startClientX: e.clientX,
      startMinutes: params.startMinutes,
      endMinutes: params.endMinutes,
      originColumnIndex: params.columnIndex,
      containerHeightPx: params.containerHeightPx,
      blockEl,
      moved: false,
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  return { startDrag };
}
