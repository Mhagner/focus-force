import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
import { z } from 'zod';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const optionalUrlSchema = z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((value) => {
        if (value === undefined) return undefined;
        if (value === null) return null;
        return value.length > 0 ? value : undefined;
      });

    const estimatedDateSchema = z
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
          const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
          return utcNoon;
        }

        const parsedDate = new Date(trimmed);
        if (Number.isNaN(parsedDate.getTime())) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data inválida' });
          return z.NEVER;
        }

        return parsedDate;
      });

    const schema = z.object({
      projectId: z.string().min(1).optional(),
      title: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      priority: z.enum(['alta', 'media', 'baixa']).optional(),
      plannedFor: z.string().optional().nullable(),
      status: z.enum(['todo', 'call_agendada', 'pronta_elaboracao', 'doing', 'done']).optional(),
      estimateMin: z
        .union([z.string(), z.number()])
        .optional()
        .transform((v) => (v === undefined ? undefined : Number(v)))
        .refine((v) => v === undefined || (Number.isFinite(v) && Number.isInteger(v) && v >= 0), 'estimateMin inválido'),
      salesforceOppUrl: optionalUrlSchema,
      repoUrl: optionalUrlSchema,
      estimatedDeliveryDate: estimatedDateSchema,
    });

    const parsed = schema.parse(body);

    const data: {
      projectId?: string;
      title?: string;
      description?: string | null;
      priority?: 'alta' | 'media' | 'baixa';
      plannedFor?: string | null;
      status?: 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done';
      estimateMin?: number;
      salesforceOppUrl?: string | null;
      repoUrl?: string | null;
      estimatedDeliveryDate?: Date | null;
    } = {};
    if (parsed.projectId !== undefined) data.projectId = parsed.projectId;
    if (parsed.title !== undefined) data.title = parsed.title;
    if (parsed.description !== undefined) data.description = parsed.description ?? null;
    if (parsed.priority !== undefined) data.priority = parsed.priority;
    if (parsed.plannedFor !== undefined) data.plannedFor = parsed.plannedFor ?? null;
    if (parsed.status !== undefined) data.status = parsed.status;
    if (parsed.estimateMin !== undefined) data.estimateMin = parsed.estimateMin;
    if (parsed.salesforceOppUrl !== undefined) data.salesforceOppUrl = parsed.salesforceOppUrl;
    if (parsed.repoUrl !== undefined) data.repoUrl = parsed.repoUrl;
    if (parsed.estimatedDeliveryDate !== undefined) data.estimatedDeliveryDate = parsed.estimatedDeliveryDate;

    const task = await prisma.task.update({
      where: { id },
      data: data as any,
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
        },
        subtasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return NextResponse.json(task);
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Erro ao atualizar tarefa' }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
