import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
import { z } from 'zod';
import { createClockfyTimeEntry } from '@/lib/integrations/clockfy';

export async function GET() {
  const sessions = await prisma.focusSession.findMany();
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const schema = z.object({
      projectId: z.string().min(1),
      taskId: z.string().optional().nullable(),
      start: z.string().min(1),
      end: z.string().optional().nullable(),
      durationSec: z.number().int().nonnegative(),
      type: z.enum(['manual', 'pomodoro']),
      pomodoroCycles: z.number().int().optional().nullable(),
      notes: z.string().optional().nullable(),
    });

    const parsed = schema.parse(body);
    const data = {
      projectId: parsed.projectId,
      taskId: parsed.taskId || undefined,
      start: new Date(parsed.start),
      end: parsed.end ? new Date(parsed.end) : undefined,
      durationSec: parsed.durationSec,
      type: parsed.type,
      pomodoroCycles: parsed.pomodoroCycles ?? undefined,
      notes: parsed.notes ?? undefined,
    };

    const session = await prisma.focusSession.create({
      data,
      include: { project: true, task: true },
    });

    const settings = await prisma.clockfySettings.findFirst();
    const credentials = {
      apiKey: settings?.apiKey ?? undefined,
      workspaceId: settings?.workspaceId ?? undefined,
    };

    type SessionPayload = typeof session | Awaited<ReturnType<typeof prisma.focusSession.update>>;
    let payload: SessionPayload = session;

    const buildClockfyDescription = () => {
      const segments: string[] = [];

      if (session.task?.title) {
        segments.push(`Tarefa: ${session.task.title}`);
      }

      let description = segments.join(' | ');

      if (session.notes?.trim()) {
        description = description
          ? `${description} | Notas: ${session.notes.trim()}`
          : session.notes.trim();
      }

      if (!description) {
        const sessionLabel = session.type === 'pomodoro' ? 'Pomodoro' : 'Manual';
        description = session.project?.name
          ? `${session.project.name} - Sessão ${sessionLabel}`
          : `Sessão ${sessionLabel}`;
      }

      return description;
    };

    if (session.project?.syncWithClockfy && session.project?.clockfyProjectId && session.end) {
      const timeEntryId = await createClockfyTimeEntry({
        projectId: session.project.clockfyProjectId,
        start: session.start,
        end: session.end,
        description: buildClockfyDescription(),
        credentials,
      });

      if (timeEntryId) {
        payload = await prisma.focusSession.update({
          where: { id: session.id },
          data: { clockfyTimeEntryId: timeEntryId },
        });
      }
    }

    if ('project' in payload) {
      const { project: _project, task: _task, ...sessionWithoutRelations } = payload;
      return NextResponse.json(sessionWithoutRelations);
    }

    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Erro ao criar sessão' }, { status: 400 });
  }
}
