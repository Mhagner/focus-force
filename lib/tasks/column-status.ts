/**
 * `Task.status` é derivado da coluna do quadro, para que Meu Dia, relatórios, notificações e o Radar
 * continuem funcionando sem conhecer colunas personalizadas:
 *   - coluna de conclusão          → 'done'
 *   - 1ª coluna que não é conclusão → 'todo'
 *   - qualquer outra               → 'doing'
 */

export type DerivedStatus = 'todo' | 'doing' | 'done';

export interface ColumnLite {
  id: string;
  position: number;
  isDone: boolean;
}

function sortedByPosition<T extends ColumnLite>(columns: T[]): T[] {
  return [...columns].sort((a, b) => a.position - b.position);
}

export function firstOpenColumn<T extends ColumnLite>(columns: T[]): T | undefined {
  return sortedByPosition(columns).find((column) => !column.isDone);
}

export function doneColumn<T extends ColumnLite>(columns: T[]): T | undefined {
  return columns.find((column) => column.isDone);
}

export function statusForColumn(column: ColumnLite, columns: ColumnLite[]): DerivedStatus {
  if (column.isDone) return 'done';
  return firstOpenColumn(columns)?.id === column.id ? 'todo' : 'doing';
}

/** Traduz o `status` legado (usado por Meu Dia, TaskCard, guarda de conclusão...) para uma coluna. */
export function columnForLegacyStatus<T extends ColumnLite>(
  status: 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done',
  columns: T[],
): T | undefined {
  if (status === 'done') return doneColumn(columns);
  const ordered = sortedByPosition(columns);
  const open = ordered.filter((column) => !column.isDone);
  if (status === 'todo') return open[0];
  // call_agendada / pronta_elaboracao / doing → primeira coluna intermediária (ou a primeira, se só houver uma)
  return open[1] ?? open[0];
}

export interface TransitionInput {
  completedAt: Date | null;
  plannedFor: string | null;
}

export interface TransitionResult {
  columnId: string;
  status: DerivedStatus;
  completedAt?: Date | null;
  plannedFor?: string | null;
}

/**
 * Dados a gravar ao mover uma tarefa para `target`.
 * Entrar na conclusão carimba `completedAt` e tira a tarefa de "Meu Dia"; sair da conclusão limpa `completedAt`.
 */
export function transitionData(
  task: TransitionInput,
  wasDone: boolean,
  target: ColumnLite,
  columns: ColumnLite[],
): TransitionResult {
  const status = statusForColumn(target, columns);
  const result: TransitionResult = { columnId: target.id, status };

  if (status === 'done') {
    if (!wasDone) {
      result.completedAt = new Date();
      result.plannedFor = null;
    }
  } else if (wasDone || task.completedAt) {
    result.completedAt = null;
  }

  return result;
}
