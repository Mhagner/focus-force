import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
import { z } from 'zod';

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

    const session = await prisma.focusSession.create({ data });
    return NextResponse.json(session);
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Erro ao criar sessão' }, { status: 400 });
  }
}
