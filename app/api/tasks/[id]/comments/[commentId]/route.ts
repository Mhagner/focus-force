import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
import { z } from 'zod';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: taskId, commentId } = await params;
    const body = await req.json();

    const schema = z.object({
      message: z.string().min(1, 'Comentário obrigatório'),
    });

    const { message } = schema.parse(body);
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return NextResponse.json({ message: 'Comentário obrigatório' }, { status: 400 });
    }

    const existing = await prisma.taskComment.findUnique({ where: { id: commentId } });

    if (!existing || existing.taskId !== taskId) {
      return NextResponse.json({ message: 'Comentário não encontrado' }, { status: 404 });
    }

    const updated = await prisma.taskComment.update({
      where: { id: commentId },
      data: { message: trimmedMessage },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    const message = err?.message ?? 'Erro ao atualizar comentário';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: taskId, commentId } = await params;

    const existing = await prisma.taskComment.findUnique({ where: { id: commentId } });

    if (!existing || existing.taskId !== taskId) {
      return NextResponse.json({ message: 'Comentário não encontrado' }, { status: 404 });
    }

    await prisma.taskComment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message = err?.message ?? 'Erro ao excluir comentário';
    return NextResponse.json({ message }, { status: 400 });
  }
}
