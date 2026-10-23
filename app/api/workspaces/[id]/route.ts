import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { assertWithinLimit } from '@/lib/billing/entitlements';
import { assertWorkspaceOwned } from '@/lib/auth/ownership';
import { HttpError, requireUser } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// `mode` não é aceito aqui de propósito: o modo é imutável depois da criação.
const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const parsed = patchSchema.parse(await req.json());
    await assertWorkspaceOwned(userId, id);

    if (parsed.archived === true) {
      const others = await prisma.workspace.count({ where: { userId, archived: false, id: { not: id } } });
      if (others === 0) {
        throw new HttpError(409, 'Você precisa manter pelo menos um workspace ativo.');
      }
    }

    if (parsed.archived === false) {
      // Reativar conta como criar: respeita o limite do plano.
      const current = await prisma.workspace.findFirst({ where: { id, userId }, select: { archived: true } });
      if (current?.archived) {
        const active = await prisma.workspace.count({ where: { userId, archived: false } });
        await assertWithinLimit(userId, 'workspaces', active);
      }
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: { name: parsed.name, archived: parsed.archived },
    });
    return NextResponse.json(workspace);
  } catch (err) {
    return apiError(err);
  }
}
