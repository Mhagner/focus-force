import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { HttpError, requireUser } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';
import { DEFAULT_FOCUS } from '@/lib/workspace/defaults';
import { focusSettingsSchema } from '@/lib/workspace/schemas';

export const dynamic = 'force-dynamic';

const workspaceQuery = z.string().min(1, 'Informe o workspace.');

// Configurações de foco pertencem ao WORKSPACE (não ao usuário): cada um tem as suas e nenhum herda de outro.
async function getOwnedWorkspace(userId: string, req: Request) {
  const workspaceId = workspaceQuery.parse(new URL(req.url).searchParams.get('workspaceId'));
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, userId },
    select: { id: true, mode: true },
  });
  if (!workspace) throw new HttpError(404, 'Não encontrado.');
  return workspace;
}

export async function GET(req: Request) {
  try {
    const { userId } = await requireUser();
    const workspace = await getOwnedWorkspace(userId, req);

    // Cria com os padrões do tipo apenas se ainda não existir (ex.: workspace anterior ao onboarding).
    const settings = await prisma.pomodoroSettings.upsert({
      where: { workspaceId: workspace.id },
      update: {},
      create: {
        ...DEFAULT_FOCUS[workspace.mode],
        userId,
        workspaceId: workspace.id,
        defaultHourlyRate: workspace.mode === 'WORK' ? 0 : null,
      },
    });
    return NextResponse.json({
      ...settings,
      defaultChecklist: Array.isArray(settings.defaultChecklist) ? settings.defaultChecklist : [],
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await requireUser();
    const workspace = await getOwnedWorkspace(userId, req);
    const parsed = focusSettingsSchema.parse(await req.json());

    // Valor/hora só existe em workspaces de trabalho.
    const data = {
      ...parsed,
      defaultHourlyRate: workspace.mode === 'WORK' ? parsed.defaultHourlyRate ?? 0 : null,
    };

    const updated = await prisma.pomodoroSettings.upsert({
      where: { workspaceId: workspace.id },
      update: data,
      create: { ...data, userId, workspaceId: workspace.id },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return apiError(err);
  }
}
