import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
import { z } from 'zod';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const schema = z.object({
      message: z.string().min(1, 'Comentário obrigatório'),
    });

    const { message } = schema.parse(body);
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return NextResponse.json({ message: 'Comentário obrigatório' }, { status: 400 });
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: id,
        message: trimmedMessage,
      },
    });

    return NextResponse.json(comment);
  } catch (err: any) {
    const message = err?.message ?? 'Erro ao adicionar comentário';
    return NextResponse.json({ message }, { status: 400 });
  }
}
