import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const { subtaskId } = await params;
    const body = await req.json();
    const schema = z.object({
      title: z.string().min(1).optional(),
      completed: z.boolean().optional(),
    });

    const parsed = schema.parse(body);

    const data: { title?: string; completed?: boolean } = {};
    if (parsed.title !== undefined) data.title = parsed.title;
    if (parsed.completed !== undefined) data.completed = parsed.completed;

    const updated = await prisma.taskSubtask.update({
      where: { id: subtaskId },
      data,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Erro ao atualizar subtarefa' }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  const { subtaskId } = await params;
  await prisma.taskSubtask.delete({ where: { id: subtaskId } });
  return NextResponse.json({ ok: true });
}
