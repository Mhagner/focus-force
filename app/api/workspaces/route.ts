import { NextResponse } from 'next/server';

import { apiError } from '@/lib/api';
import { assertWithinLimit } from '@/lib/billing/entitlements';
import { requireUser } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';
import { createWorkspaceWithSetup } from '@/lib/workspace/create';
import { createWorkspaceSchema } from '@/lib/workspace/schemas';

export const dynamic = 'force-dynamic';

// Lista vazia significa "usuário novo": o app abre o onboarding para criar o primeiro workspace.
export async function GET() {
  try {
    const { userId } = await requireUser();
    const workspaces = await prisma.workspace.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(workspaces);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const parsed = createWorkspaceSchema.parse(await req.json());

    const active = await prisma.workspace.count({ where: { userId, archived: false } });
    await assertWithinLimit(userId, 'workspaces', active);

    // O tipo é definido só na criação e não pode ser alterado depois.
    const workspace = await createWorkspaceWithSetup(userId, parsed);
    return NextResponse.json(workspace, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
