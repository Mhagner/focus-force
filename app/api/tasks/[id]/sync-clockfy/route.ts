import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateClockfyTimeEntry, buildClockfyDescription } from '@/lib/integrations/clockfy';

export const dynamic = 'force-dynamic';

/**
 * Pushes the task's most recent comment (e.g. a mandatory time-overrun
 * justification collected when completing the task) into Clockify by editing
 * the description of the last FocusSession of this task that was already
 * synced there — rather than waiting for a new session to sync.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: { comments: { orderBy: { createdAt: 'desc' } } },
    });

    if (!task) {
      return NextResponse.json({ message: 'Tarefa não encontrada' }, { status: 404 });
    }

    const lastSyncedSession = await prisma.focusSession.findFirst({
      where: { taskId: id, clockfyTimeEntryId: { not: null } },
      orderBy: { end: 'desc' },
      include: { project: true },
    });

    if (!lastSyncedSession) {
      return NextResponse.json(
        { message: 'Nenhuma sessão desta tarefa foi sincronizada com o Clockfy ainda.' },
        { status: 400 },
      );
    }

    if (!lastSyncedSession.project?.clockfyProjectId || !lastSyncedSession.end) {
      return NextResponse.json(
        { message: 'A última sessão sincronizada está incompleta para atualização.' },
        { status: 400 },
      );
    }

    const settings = await prisma.clockfySettings.findFirst();
    const workspaces = (settings?.workspaces as any[]) ?? [];
    const credentials = {
      apiKey: settings?.apiKey ?? undefined,
      workspaceId: lastSyncedSession.project?.clockfyWorkspaceId ?? settings?.workspaceId ?? workspaces[0]?.id,
    };

    if (!credentials.workspaceId) {
      return NextResponse.json({ message: 'Nenhum workspace configurado para sincronização.' }, { status: 400 });
    }

    const updated = await updateClockfyTimeEntry({
      timeEntryId: lastSyncedSession.clockfyTimeEntryId!,
      projectId: lastSyncedSession.project.clockfyProjectId,
      start: lastSyncedSession.start,
      end: lastSyncedSession.end,
      description: buildClockfyDescription({
        type: lastSyncedSession.type,
        project: lastSyncedSession.project,
        task,
      }),
      credentials,
    });

    if (!updated) {
      return NextResponse.json({ message: 'Não foi possível atualizar o lançamento no Clockfy.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Clockfy task comment sync failed', error);
    const message = error instanceof Error ? error.message : undefined;
    return NextResponse.json(
      { message: message ?? 'Erro ao sincronizar comentário com o Clockfy' },
      { status: 500 },
    );
  }
}
