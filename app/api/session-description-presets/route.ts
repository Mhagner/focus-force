import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { assertWorkspaceOwned } from '@/lib/auth/ownership';
import { requireUser } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Descrições de sessão pertencem ao workspace: cada um tem as suas.
export async function GET(req: Request) {
  try {
    const { userId } = await requireUser();
    const workspaceId = z.string().min(1, 'Informe o workspace.').parse(new URL(req.url).searchParams.get('workspaceId'));
    await assertWorkspaceOwned(userId, workspaceId);

    const presets = await prisma.sessionDescriptionPreset.findMany({
      where: { userId, workspaceId, active: true },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(presets);
  } catch (err) {
    return apiError(err);
  }
}

const createSchema = z.object({
  workspaceId: z.string().min(1),
  label: z.string().trim().min(1).max(120),
});

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const parsed = createSchema.parse(await req.json());
    await assertWorkspaceOwned(userId, parsed.workspaceId);

    const last = await prisma.sessionDescriptionPreset.findFirst({
      where: { userId, workspaceId: parsed.workspaceId },
      orderBy: { order: 'desc' },
    });

    const preset = await prisma.sessionDescriptionPreset.create({
      data: {
        userId,
        workspaceId: parsed.workspaceId,
        label: parsed.label,
        order: (last?.order ?? -1) + 1,
      },
    });

    return NextResponse.json(preset);
  } catch (err) {
    return apiError(err);
  }
}
