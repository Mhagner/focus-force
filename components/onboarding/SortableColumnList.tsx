'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle2, GripVertical, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MAX_COLUMN_TITLE, MAX_COLUMNS } from '@/lib/workspace/defaults';
import { cn } from '@/lib/utils';

export interface ColumnItem {
  /** Chave local estável (só para a lista; não vai para o servidor). */
  key: string;
  title: string;
  isDone: boolean;
}

let keyCounter = 0;
export const newColumnKey = () => `col-${Date.now().toString(36)}-${keyCounter++}`;

function Row({
  item,
  canRemove,
  onRename,
  onRemove,
}: {
  item: ColumnItem;
  canRemove: boolean;
  onRename: (title: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.key });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-2',
        isDragging && 'z-10 shadow-lg ring-2 ring-primary/40',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-ink-muted hover:text-ink active:cursor-grabbing"
        aria-label={`Arrastar a coluna ${item.title || 'sem nome'}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <Input
        value={item.title}
        maxLength={MAX_COLUMN_TITLE}
        onChange={(event) => onRename(event.target.value)}
        aria-label="Nome da coluna"
        className="h-9 flex-1"
      />

      {item.isDone ? (
        <span
          className="flex shrink-0 items-center gap-1 rounded-full bg-success/[0.14] px-2 py-1 text-xs font-medium text-success"
          title="Itens que chegam nesta coluna são marcados como concluídos. Ela não pode ser excluída."
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Conclusão
        </span>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-ink-muted hover:text-danger"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remover a coluna ${item.title || 'sem nome'}`}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </li>
  );
}

/**
 * Edita as colunas do quadro: renomear, adicionar, remover e arrastar para qualquer posição.
 * A coluna de conclusão pode ser renomeada e movida, mas nunca removida.
 */
export function SortableColumnList({ items, onChange }: { items: ColumnItem[]; onChange: (items: ColumnItem[]) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.key === active.id);
    const to = items.findIndex((item) => item.key === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(items, from, to));
  };

  const addColumn = () => {
    if (items.length >= MAX_COLUMNS) return;
    const doneIndex = items.findIndex((item) => item.isDone);
    const at = doneIndex >= 0 ? doneIndex : items.length;
    const next = [...items];
    next.splice(at, 0, { key: newColumnKey(), title: '', isDone: false });
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.key)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((item) => (
              <Row
                key={item.key}
                item={item}
                canRemove={items.length > 2}
                onRename={(title) => onChange(items.map((other) => (other.key === item.key ? { ...other, title } : other)))}
                onRemove={() => onChange(items.filter((other) => other.key !== item.key))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="outline" size="sm" onClick={addColumn} disabled={items.length >= MAX_COLUMNS}>
        <Plus className="mr-2 h-4 w-4" />
        Adicionar coluna
      </Button>
    </div>
  );
}
