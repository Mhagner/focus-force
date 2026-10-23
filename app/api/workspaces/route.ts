import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { assertWithinLimit } from '@/lib/billing/entitlements';
import { bootstrapUser } from '@/lib/auth/bootstrap';
import { requireUser } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome.').max(60),
  mode: z.enum(['WORK', 'STUDY']),
});

export async function GET() {
  try {
    const { userId } = await requireUser();
    let workspaces = await prisma.workspace.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    // Contas antigas ou criadas fora do cadastro podem não ter workspace: cria o padrão (idempotente).
    if (workspaces.length === 0) {
      await bootstrapUser(userId);
      workspaces = await prisma.workspace.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    }
    return NextResponse.json(workspaces);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const parsed = createSchema.parse(await req.json());

    const active = await prisma.workspace.count({ where: { userId, archived: false } });
    await assertWithinLimit(userId, 'workspaces', active);

    // O modo é definido só na criação e não pode ser alterado depois.
    const workspace = await prisma.workspace.create({
      data: { userId, name: parsed.name, mode: parsed.mode },
    });
    return NextResponse.json(workspace, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
