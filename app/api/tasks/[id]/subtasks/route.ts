import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const schema = z.object({
      title: z.string().min(1, 'Título é obrigatório'),
    });

    const parsed = schema.parse(body);

    const subtask = await prisma.taskSubtask.create({
      data: {
        title: parsed.title,
        taskId: id,
      },
    });

    return NextResponse.json(subtask);
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Erro ao criar subtarefa' }, { status: 400 });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const subtasks = await prisma.taskSubtask.findMany({
    where: { taskId: id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(subtasks);
}
