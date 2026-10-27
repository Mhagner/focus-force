import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { createClockfyTimeEntry, buildClockfyDescription } from '@/lib/integrations/clockfy';
import { getClockfySettings } from '@/lib/integrations/clockfy-settings';
import { apiError } from '@/lib/api';
import { requireUser } from '@/lib/auth/require-user';
import { assertProjectOwned, assertTaskOwned } from '@/lib/auth/ownership';
import { getWorkspaceFilter } from '@/lib/auth/workspace-filter';

export async function GET(req: Request) {
  try {
    const { userId } = await requireUser();
    const workspaceId = await getWorkspaceFilter(userId, req.url);
    const sessions = await prisma.focusSession.findMany({
      where: { userId, ...(workspaceId ? { project: { workspaceId } } : {}) },
    });
    return NextResponse.json(sessions);
  } catch (err) {
    return apiError(err);
  }
}

const isoDate = z.string().min(1).refine((value) => !Number.isNaN(new Date(value).getTime()), 'Data inválida');

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const schema = z.object({
      projectId: z.string().min(1),
      taskId: z.string().optional().nullable(),
      start: isoDate,
      end: isoDate.optional().nullable(),
      durationSec: z.number().int().nonnegative(),
      type: z.enum(['manual', 'pomodoro']),
      pomodoroCycles: z.number().int().optional().nullable(),
      notes: z.string().min(1, 'Descrição da sessão é obrigatória').max(5000),
    });

    const parsed = schema.parse(body);
    await assertProjectOwned(userId, parsed.projectId);
    if (parsed.taskId) {
      await assertTaskOwned(userId, parsed.taskId);
    }

    const data = {
      userId,
      projectId: parsed.projectId,
      taskId: parsed.taskId || undefined,
      start: new Date(parsed.start),
      end: parsed.end ? new Date(parsed.end) : undefined,
      durationSec: parsed.durationSec,
      type: parsed.type,
      pomodoroCycles: parsed.pomodoroCycles ?? undefined,
      notes: parsed.notes,
    };

    const session = await prisma.focusSession.create({
      data,
      include: {
        project: true,
        task: { include: { comments: { orderBy: { createdAt: 'desc' } } } },
      },
    });

    const { settings, apiKey } = await getClockfySettings(userId, session.project.workspaceId);
    const workspaces = (settings?.workspaces as any[]) ?? [];
    const credentials = {
      apiKey,
      workspaceId: session.project?.clockfyWorkspaceId ?? settings?.workspaceId ?? workspaces[0]?.id,
    };

    type SessionPayload = typeof session | Awaited<ReturnType<typeof prisma.focusSession.update>>;
    let payload: SessionPayload = session;

    if (
      session.project?.syncWithClockfy &&
      session.project?.clockfyProjectId &&
      session.end &&
      credentials.workspaceId
    ) {
      const timeEntryId = await createClockfyTimeEntry({
        projectId: session.project.clockfyProjectId,
        start: session.start,
        end: session.end,
        description: buildClockfyDescription(session),
        credentials,
      });

      if (timeEntryId) {
        payload = await prisma.focusSession.update({
          where: { id: session.id, userId },
          data: { clockfyTimeEntryId: timeEntryId },
        });
      }
    }

    if ('project' in payload) {
      const { project: _project, task: _task, ...sessionWithoutRelations } = payload;
      return NextResponse.json(sessionWithoutRelations);
    }

    return NextResponse.json(payload);
  } catch (err) {
    return apiError(err);
  }
}
