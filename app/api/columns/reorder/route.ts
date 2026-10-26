import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { assertWorkspaceOwned } from '@/lib/auth/ownership';
import { HttpError, requireUser } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';
import { loadColumns, recomputeStatuses } from '@/lib/tasks/columns';
import { MAX_COLUMNS } from '@/lib/workspace/defaults';

export const dynamic = 'force-dynamic';

const schema = z.object({
  workspaceId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1).max(MAX_COLUMNS),
});

// A lista precisa conter TODAS as colunas do workspace, uma única vez cada.
export async function PATCH(req: Request) {
  try {
    const { userId } = await requireUser();
    const body = schema.parse(await req.json());
    await assertWorkspaceOwned(userId, body.workspaceId);

    const result = await prisma.$transaction(async (tx) => {
      const current = await loadColumns(body.workspaceId, tx);
      const currentIds = new Set(current.map((column) => column.id));
      const sent = new Set(body.orderedIds);

      if (
        sent.size !== body.orderedIds.length ||
        sent.size !== currentIds.size ||
        body.orderedIds.some((id) => !currentIds.has(id))
      ) {
        throw new HttpError(400, 'A nova ordem deve conter todas as colunas do workspace, sem repetir.');
      }

      for (let index = 0; index < body.orderedIds.length; index += 1) {
        await tx.boardColumn.update({ where: { id: body.orderedIds[index] }, data: { position: index } });
      }
      // a "primeira coluna aberta" pode ter mudado: tarefas passam de todo para doing (ou vice-versa)
      await recomputeStatuses(tx, body.workspaceId);
      return loadColumns(body.workspaceId, tx);
    });

    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
