import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateClockfyTimeEntry, buildClockfyDescription } from '@/lib/integrations/clockfy';

export const dynamic = 'force-dynamic';

/**
 * Pushes the task's most recent comment (e.g. a mandatory time-overrun
 * justification collected when completing the task) into Clockify by editing
 * the description of every FocusSession of this task that was already
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

    const syncedSessions = await prisma.focusSession.findMany({
      where: { taskId: id, clockfyTimeEntryId: { not: null } },
      orderBy: { end: 'desc' },
      include: { project: true },
    });

    if (syncedSessions.length === 0) {
      return NextResponse.json(
        { message: 'Nenhuma sessão desta tarefa foi sincronizada com o Clockfy ainda.' },
        { status: 400 },
      );
    }

    const updatable = syncedSessions.filter((session) => session.project?.clockfyProjectId && session.end);

    if (updatable.length === 0) {
      return NextResponse.json(
        { message: 'As sessões sincronizadas estão incompletas para atualização.' },
        { status: 400 },
      );
    }

    const settings = await prisma.clockfySettings.findFirst();
    const workspaces = (settings?.workspaces as any[]) ?? [];
    const apiKey = settings?.apiKey ?? undefined;

    // Same comment on every Clockify entry of the task, so the report matches.
    const results = await Promise.allSettled(
      updatable.map(async (session) => {
        const workspaceId = session.project!.clockfyWorkspaceId ?? settings?.workspaceId ?? workspaces[0]?.id;
        if (!workspaceId) return false;

        return updateClockfyTimeEntry({
          timeEntryId: session.clockfyTimeEntryId!,
          projectId: session.project!.clockfyProjectId!,
          start: session.start,
          end: session.end!,
          description: buildClockfyDescription({ type: session.type, project: session.project!, task }),
          credentials: { apiKey, workspaceId },
        });
      }),
    );

    const updated = results.filter((r) => r.status === 'fulfilled' && r.value).length;
    // Sessions skipped by the `updatable` filter (no Clockify project / no end)
    // keep their old description, so they count as failed too.
    const failed = syncedSessions.length - updated;

    if (updated === 0) {
      return NextResponse.json({ message: 'Não foi possível atualizar os lançamentos no Clockfy.' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, updated, failed });
  } catch (error: unknown) {
    console.error('Clockfy task comment sync failed', error);
    const message = error instanceof Error ? error.message : undefined;
    return NextResponse.json(
      { message: message ?? 'Erro ao sincronizar comentário com o Clockfy' },
      { status: 500 },
    );
  }
}
