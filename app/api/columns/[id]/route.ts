import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { HttpError, requireUser } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';
import { statusForColumn } from '@/lib/tasks/column-status';
import { loadColumns, normalizePositions, recomputeStatuses } from '@/lib/tasks/columns';
import { MAX_COLUMN_TITLE } from '@/lib/workspace/defaults';

export const dynamic = 'force-dynamic';

const notFound = () => new HttpError(404, 'Não encontrado.');

// Só o título é editável aqui. Se a coluna é de conclusão ou não, é definido na criação do workspace e não muda.
const patchSchema = z.object({
  title: z.string().trim().min(1, 'Informe o nome da coluna.').max(MAX_COLUMN_TITLE),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const { title } = patchSchema.parse(await req.json());

    const column = await prisma.boardColumn.update({ where: { id, userId }, data: { title } });
    return NextResponse.json(column);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * Exclui uma coluna comum. A coluna de conclusão nunca pode ser excluída.
 * Se houver tarefas nela, `?moveTo=<id da coluna destino>` é obrigatório.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const moveTo = new URL(req.url).searchParams.get('moveTo');

    await prisma.$transaction(async (tx) => {
      const column = await tx.boardColumn.findFirst({ where: { id, userId } });
      if (!column) throw notFound();
      if (column.isDone) throw new HttpError(400, 'A coluna de conclusão não pode ser excluída.');

      const columns = await loadColumns(column.workspaceId, tx);
      if (columns.length <= 2) throw new HttpError(400, 'Mantenha pelo menos 2 colunas.');

      const taskCount = await tx.task.count({ where: { columnId: id } });
      if (taskCount > 0) {
        if (!moveTo || moveTo === id) {
          throw new HttpError(400, 'Escolha para qual coluna mover os itens antes de excluir.');
        }
        const target = columns.find((candidate) => candidate.id === moveTo);
        if (!target) throw new HttpError(400, 'Coluna de destino inválida.');

        const remaining = columns.filter((candidate) => candidate.id !== id);
        const status = statusForColumn(target, remaining);
        await tx.task.updateMany({
          where: { columnId: id },
          data: {
            columnId: target.id,
            status,
            // itens movidos para a conclusão contam como concluídos agora e saem de "Meu Dia"
            ...(status === 'done' ? { completedAt: new Date(), plannedFor: null } : {}),
          },
        });
      }

      await tx.boardColumn.delete({ where: { id } });
      await normalizePositions(tx, column.workspaceId);
      await recomputeStatuses(tx, column.workspaceId);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
