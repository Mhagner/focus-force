import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api';
import { requireUser } from '@/lib/auth/require-user';
import { assertProjectOwned, assertTaskOwned } from '@/lib/auth/ownership';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id: taskId, subtaskId } = await params;
    const body = await req.json();

    const dateOrDateOnlySchema = z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .transform((value, ctx) => {
        if (value === undefined) return undefined;
        if (value === null) return null;

        if (value instanceof Date) {
          if (Number.isNaN(value.getTime())) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data inválida' });
            return z.NEVER;
          }
          return value;
        }

        const trimmed = value.trim();
        if (!trimmed) return undefined;

        const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
        if (dateOnlyMatch) {
          const [y, m, d] = trimmed.split('-').map((s) => Number(s));
          return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        }

        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data inválida' });
          return z.NEVER;
        }

        return parsed;
      });

    const schema = z.object({
      title: z.string().min(1).optional(),
      completed: z.boolean().optional(),
      completedAt: dateOrDateOnlySchema,
      estimatedDeliveryDate: dateOrDateOnlySchema,
    });

    const parsed = schema.parse(body);

    const data: {
      title?: string;
      completed?: boolean;
      completedAt?: Date | null;
      estimatedDeliveryDate?: Date | null;
    } = {};
    if (parsed.title !== undefined) data.title = parsed.title;

    // Completion toggles manage completedAt automatically (unless explicitly provided)
    const bodyHasCompletedAt =
      typeof body === 'object' && body !== null && Object.prototype.hasOwnProperty.call(body as any, 'completedAt');

    if (parsed.completed !== undefined) {
      data.completed = parsed.completed;

      if (parsed.completed === false) {
        data.completedAt = null;
      } else if (parsed.completed === true && !bodyHasCompletedAt) {
        data.completedAt = new Date();
      }
    }

    if (parsed.completedAt !== undefined) {
      data.completedAt = parsed.completedAt;
    }

    if (parsed.estimatedDeliveryDate !== undefined) {
      data.estimatedDeliveryDate = parsed.estimatedDeliveryDate;
    }

    const updated = await prisma.taskSubtask.update({
      where: { id: subtaskId, taskId, userId },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; subtaskId: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id: taskId, subtaskId } = await params;
    await prisma.taskSubtask.delete({ where: { id: subtaskId, taskId, userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
