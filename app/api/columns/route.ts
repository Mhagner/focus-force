import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { assertWorkspaceOwned } from '@/lib/auth/ownership';
import { HttpError, requireUser } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';
import { loadColumns, recomputeStatuses } from '@/lib/tasks/columns';
import { MAX_COLUMN_TITLE, MAX_COLUMNS } from '@/lib/workspace/defaults';

export const dynamic = 'force-dynamic';

const workspaceQuery = z.string().min(1);

export async function GET(req: Request) {
  try {
    const { userId } = await requireUser();
    const workspaceId = workspaceQuery.parse(new URL(req.url).searchParams.get('workspaceId'));
    await assertWorkspaceOwned(userId, workspaceId);
    return NextResponse.json(await loadColumns(workspaceId));
  } catch (err) {
    return apiError(err);
  }
}

const createSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().trim().min(1, 'Informe o nome da coluna.').max(MAX_COLUMN_TITLE),
});

// Nova coluna entra logo antes da coluna de conclusão; depois o usuário arrasta para onde quiser.
export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const body = createSchema.parse(await req.json());
    await assertWorkspaceOwned(userId, body.workspaceId);

    const created = await prisma.$transaction(async (tx) => {
      const columns = await loadColumns(body.workspaceId, tx);
      if (columns.length >= MAX_COLUMNS) {
        throw new HttpError(400, `No máximo ${MAX_COLUMNS} colunas.`);
      }

      const done = columns.find((column) => column.isDone);
      const position = done ? done.position : columns.length;

      // abre espaço: tudo a partir da posição escolhida desce uma casa (de trás para frente, evita colisão)
      for (const column of [...columns].reverse()) {
        if (column.position >= position) {
          await tx.boardColumn.update({ where: { id: column.id }, data: { position: column.position + 1 } });
        }
      }

      const column = await tx.boardColumn.create({
        data: { userId, workspaceId: body.workspaceId, title: body.title, position, isDone: false },
      });
      await recomputeStatuses(tx, body.workspaceId);
      return column;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
