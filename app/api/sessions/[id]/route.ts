import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateClockfyTimeEntry, buildClockfyDescription } from '@/lib/integrations/clockfy';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();
  const session = await prisma.focusSession.update({
    where: { id },
    data,
    include: {
      project: true,
      task: { include: { comments: { orderBy: { createdAt: 'desc' } } } },
    },
  });

  const timeChanged = 'start' in data || 'end' in data;

  if (
    timeChanged &&
    session.clockfyTimeEntryId &&
    session.project?.syncWithClockfy &&
    session.project?.clockfyProjectId &&
    session.end
  ) {
    const settings = await prisma.clockfySettings.findFirst();
    const workspaces = (settings?.workspaces as any[]) ?? [];
    const credentials = {
      apiKey: settings?.apiKey ?? undefined,
      workspaceId: session.project?.clockfyWorkspaceId ?? settings?.workspaceId ?? workspaces[0]?.id,
    };

    if (credentials.workspaceId) {
      await updateClockfyTimeEntry({
        timeEntryId: session.clockfyTimeEntryId,
        projectId: session.project.clockfyProjectId,
        start: session.start,
        end: session.end,
        description: buildClockfyDescription(session),
        credentials,
      });
    }
  }

  const { project: _project, task: _task, ...sessionWithoutRelations } = session;
  return NextResponse.json(sessionWithoutRelations);
}

export async function DELETE(
    req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.focusSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
