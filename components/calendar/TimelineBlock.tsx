import { useRef } from 'react';
import { Copy } from 'lucide-react';
import { useTimelineDrag } from './useTimelineDrag';

export interface TimelineBlockData {
  id: string;
  startMinutes: number;
  endMinutes: number;
  top: number; // px
  height: number; // px
  timeRange: string;
  durationLabel: string;
  taskTitle: string;
  projectName: string;
  bg: string;
  border: string;
  isCompact: boolean;
  isOngoing: boolean;
  columnIndex: number;
}

interface TimelineBlockProps {
  block: TimelineBlockData;
  containerHeightPx: number;
  gridRef: React.RefObject<HTMLDivElement>;
  columnCount: number;
  onCommit: (sessionId: string, columnIndex: number, startMinutes: number, endMinutes: number) => void;
  onClick: (sessionId: string) => void;
  onDuplicate: (sessionId: string) => void;
}

export function TimelineBlock({
  block,
  containerHeightPx,
  gridRef,
  columnCount,
  onCommit,
  onClick,
  onDuplicate,
}: TimelineBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const { startDrag } = useTimelineDrag({ gridRef, columnCount, onCommit });

  const interactive = !block.isOngoing;

  return (
    <div
      ref={blockRef}
      className="group absolute left-1.5 right-1.5 select-none rounded-md border px-2 py-1 shadow-md"
      style={{
        top: `${block.top}px`,
        height: `${block.height}px`,
        minHeight: '22px',
        backgroundColor: block.bg,
        borderColor: block.border,
        touchAction: 'none',
        cursor: interactive ? 'grab' : 'default',
      }}
      onPointerDown={(e) => {
        if (!interactive || !blockRef.current) return;
        startDrag(e, 'move', {
          sessionId: block.id,
          startMinutes: block.startMinutes,
          endMinutes: block.endMinutes,
          columnIndex: block.columnIndex,
          containerHeightPx,
          blockEl: blockRef.current,
        });
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(block.id);
      }}
    >
      {interactive && (
        <div
          className="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            if (!blockRef.current) return;
            startDrag(e, 'resize-start', {
              sessionId: block.id,
              startMinutes: block.startMinutes,
              endMinutes: block.endMinutes,
              columnIndex: block.columnIndex,
              containerHeightPx,
              blockEl: blockRef.current,
            });
          }}
        />
      )}

      {!block.isCompact && (
        <div className="flex items-center justify-between text-[10px] text-gray-300">
          <span>{block.timeRange}</span>
          <span>{block.durationLabel}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-xs font-semibold text-white">{block.taskTitle}</span>
        <button
          type="button"
          title="Duplicar sessão"
          className="invisible shrink-0 rounded p-0.5 text-gray-300 hover:bg-white/10 hover:text-white group-hover:visible"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(block.id);
          }}
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
      {!block.isCompact && block.projectName && (
        <div className="truncate text-[10px] text-gray-400">{block.projectName}</div>
      )}

      {interactive && (
        <div
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => {
            if (!blockRef.current) return;
            startDrag(e, 'resize-end', {
              sessionId: block.id,
              startMinutes: block.startMinutes,
              endMinutes: block.endMinutes,
              columnIndex: block.columnIndex,
              containerHeightPx,
              blockEl: blockRef.current,
            });
          }}
        />
      )}
    </div>
  );
}
