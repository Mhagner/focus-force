import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClockfyTimeEntry, buildClockfyDescription } from '@/lib/integrations/clockfy';
import { getClockfySettings } from '@/lib/integrations/clockfy-settings';
import { apiError } from '@/lib/api';
import { requireUser } from '@/lib/auth/require-user';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;

    const session = await prisma.focusSession.findFirst({
      where: { id, userId },
      include: {
        project: true,
        task: { include: { comments: { orderBy: { createdAt: 'desc' } } } },
      },
    });

    if (!session) {
      return NextResponse.json({ message: 'Sessão não encontrada' }, { status: 404 });
    }

    if (session.clockfyTimeEntryId) {
      return NextResponse.json(session);
    }

    if (!session.end) {
      return NextResponse.json({ message: 'A sessão precisa estar finalizada para sincronizar.' }, { status: 400 });
    }

    if (!session.project?.syncWithClockfy) {
      return NextResponse.json({ message: 'O projeto não está configurado para sincronizar com o Clockfy.' }, { status: 400 });
    }

    if (!session.project.clockfyProjectId) {
      return NextResponse.json({ message: 'O projeto não está vinculado a um projeto do Clockfy.' }, { status: 400 });
    }

    const { settings, apiKey } = await getClockfySettings(userId);
    const workspaces = (settings?.workspaces as any[]) ?? [];
    const credentials = {
      apiKey,
      workspaceId: session.project?.clockfyWorkspaceId ?? settings?.workspaceId ?? workspaces[0]?.id,
    };

    if (!credentials.workspaceId) {
      return NextResponse.json({ message: 'Nenhum workspace configurado para sincronização.' }, { status: 400 });
    }

    const timeEntryId = await createClockfyTimeEntry({
      projectId: session.project.clockfyProjectId,
      start: session.start,
      end: session.end,
      description: buildClockfyDescription(session),
      credentials,
    });

    if (!timeEntryId) {
      return NextResponse.json({ message: 'Não foi possível sincronizar a sessão com o Clockfy.' }, { status: 502 });
    }

    const updated = await prisma.focusSession.update({
      where: { id: session.id, userId },
      data: { clockfyTimeEntryId: timeEntryId },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}
