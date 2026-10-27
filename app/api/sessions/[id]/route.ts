import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { updateClockfyTimeEntry, buildClockfyDescription } from '@/lib/integrations/clockfy';
import { getClockfySettings } from '@/lib/integrations/clockfy-settings';
import { apiError } from '@/lib/api';
import { requireUser } from '@/lib/auth/require-user';
import { assertProjectOwned, assertTaskOwned } from '@/lib/auth/ownership';
export const dynamic = 'force-dynamic';

const isoDate = z.string().min(1).refine((value) => !Number.isNaN(new Date(value).getTime()), 'Data inválida');

// Lista permitida de campos: campos desconhecidos (id, userId, clockfyTimeEntryId...) são descartados.
const patchSchema = z.object({
  projectId: z.string().min(1).optional(),
  taskId: z.string().min(1).nullable().optional(),
  start: isoDate.optional(),
  end: isoDate.nullable().optional(),
  durationSec: z.number().int().nonnegative().optional(),
  type: z.enum(['manual', 'pomodoro']).optional(),
  pomodoroCycles: z.number().int().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const parsed = patchSchema.parse(await req.json());

    if (parsed.projectId !== undefined) await assertProjectOwned(userId, parsed.projectId);
    if (parsed.taskId) await assertTaskOwned(userId, parsed.taskId);

    const data = {
      projectId: parsed.projectId,
      taskId: parsed.taskId,
      start: parsed.start !== undefined ? new Date(parsed.start) : undefined,
      end: parsed.end === undefined ? undefined : parsed.end === null ? null : new Date(parsed.end),
      durationSec: parsed.durationSec,
      type: parsed.type,
      pomodoroCycles: parsed.pomodoroCycles,
      notes: parsed.notes,
    };

    const session = await prisma.focusSession.update({
      where: { id, userId },
      data,
      include: {
        project: true,
        task: { include: { comments: { orderBy: { createdAt: 'desc' } } } },
      },
    });

    const timeChanged = parsed.start !== undefined || parsed.end !== undefined;

    if (
      timeChanged &&
      session.clockfyTimeEntryId &&
      session.project?.syncWithClockfy &&
      session.project?.clockfyProjectId &&
      session.end
    ) {
      const { settings, apiKey } = await getClockfySettings(userId, session.project.workspaceId);
      const workspaces = (settings?.workspaces as any[]) ?? [];
      const credentials = {
        apiKey,
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
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await prisma.focusSession.delete({ where: { id, userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
