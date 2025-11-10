import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClockfyTimeEntry } from '@/lib/integrations/clockfy';

export const dynamic = 'force-dynamic';

function buildClockfyDescription(session: {
  type: 'manual' | 'pomodoro';
  notes?: string | null;
  project?: { name: string | null } | null;
  task?: { title: string | null } | null;
}) {
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
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await prisma.focusSession.findUnique({
      where: { id },
      include: { project: true, task: true },
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

    const settings = await prisma.clockfySettings.findFirst();
    const credentials = {
      apiKey: settings?.apiKey ?? undefined,
      workspaceId: settings?.workspaceId ?? undefined,
    };

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
      where: { id: session.id },
      data: { clockfyTimeEntryId: timeEntryId },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Clockfy manual sync failed', error);
    const message = error instanceof Error ? error.message : undefined;
    return NextResponse.json(
      { message: message ?? 'Erro ao sincronizar com o Clockfy' },
      { status: 500 },
    );
  }
}
