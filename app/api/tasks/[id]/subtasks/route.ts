import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api';
import { requireUser } from '@/lib/auth/require-user';
import { assertProjectOwned, assertTaskOwned } from '@/lib/auth/ownership';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

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
      title: z.string().min(1, 'Título é obrigatório'),
    });

    const parsed = schema.parse(body);

    const subtask = await prisma.taskSubtask.create({
      data: {
        userId,
        title: parsed.title,
        taskId: id,
      },
    });

    return NextResponse.json(subtask);
  } catch (err) {
    return apiError(err);
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const subtasks = await prisma.taskSubtask.findMany({
      where: { taskId: id, userId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(subtasks);
  } catch (err) {
    return apiError(err);
  }
}
