import type { Prisma } from '@prisma/client';

import { HttpError } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';
import { columnForLegacyStatus, firstOpenColumn, statusForColumn } from '@/lib/tasks/column-status';

type Tx = Prisma.TransactionClient;

/** Colunas do workspace em ordem. */
export async function loadColumns(workspaceId: string, client: Tx | typeof prisma = prisma) {
  return client.boardColumn.findMany({ where: { workspaceId }, orderBy: { position: 'asc' } });
}

/**
 * Reaplica `Task.status` a partir da posição/tipo de cada coluna. Necessário quando a ordem muda
 * (a "primeira coluna aberta" pode trocar) ou quando uma coluna entra/sai. Não mexe em `completedAt`:
 * quem entra ou sai da conclusão passa por `transitionData`.
 */
export async function recomputeStatuses(tx: Tx, workspaceId: string) {
  const columns = await loadColumns(workspaceId, tx);
  for (const column of columns) {
    const status = statusForColumn(column, columns);
    await tx.task.updateMany({
      where: { columnId: column.id, status: { not: status } },
      data: { status },
    });
  }
}

/** Reescreve `position` como 0..n-1 na ordem atual (usado após exclusões). */
export async function normalizePositions(tx: Tx, workspaceId: string) {
  const columns = await loadColumns(workspaceId, tx);
  for (let index = 0; index < columns.length; index += 1) {
    if (columns[index].position !== index) {
      await tx.boardColumn.update({ where: { id: columns[index].id }, data: { position: index } });
    }
  }
}

/**
 * Decide em qual coluna a tarefa fica: `columnId` explícito (validado contra o workspace), senão o `status`
 * legado traduzido (Meu Dia, TaskCard e o guarda de conclusão ainda enviam status), senão a primeira coluna aberta.
 */
export function resolveTargetColumn<T extends { id: string; position: number; isDone: boolean }>(
  columns: T[],
  columnId?: string | null,
  status?: 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done',
): T {
  if (columnId) {
    const column = columns.find((candidate) => candidate.id === columnId);
    if (!column) throw new HttpError(400, 'Coluna inválida para este workspace.');
    return column;
  }

  const target = (status ? columnForLegacyStatus(status, columns) : undefined) ?? firstOpenColumn(columns) ?? columns[0];
  if (!target) throw new HttpError(409, 'Este workspace não tem colunas.');
  return target;
}
