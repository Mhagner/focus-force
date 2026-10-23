import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api';
import { requireUser } from '@/lib/auth/require-user';
import { assertProjectOwned, assertTaskOwned } from '@/lib/auth/ownership';
export const dynamic = 'force-dynamic';
import { z } from 'zod';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await assertTaskOwned(userId, id);
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
        userId,
        taskId: id,
        message: trimmedMessage,
      },
    });

    return NextResponse.json(comment);
  } catch (err) {
    return apiError(err);
  }
}
