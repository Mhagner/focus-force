import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError } from '@/lib/api';
import { HttpError, requireUser } from '@/lib/auth/require-user';
import { doneColumn, firstOpenColumn, transitionData } from '@/lib/tasks/column-status';
import { loadColumns, resolveTargetColumn } from '@/lib/tasks/columns';
import { assertProjectOwned, assertTaskOwned } from '@/lib/auth/ownership';
export const dynamic = 'force-dynamic';
import { z } from 'zod';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
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
      title: z.string().trim().min(1).max(200).optional(),
      description: z.string().max(10000).optional().nullable(),
      priority: z.enum(['alta', 'media', 'baixa']).optional(),
      plannedFor: z.string().optional().nullable(),
      // `status` é aceito por compatibilidade e traduzido para uma coluna; o que vale é a coluna (columnId).
      status: z.enum(['todo', 'call_agendada', 'pronta_elaboracao', 'doing', 'done']).optional(),
      columnId: z.string().min(1).optional(),
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

    if (parsed.projectId !== undefined) {
      await assertProjectOwned(userId, parsed.projectId);
    }

    const current = await prisma.task.findFirst({
      where: { id, userId },
      select: { status: true, completedAt: true, plannedFor: true, project: { select: { workspaceId: true } } },
    });
    if (!current) throw new HttpError(404, 'Não encontrado.');

    let targetWorkspaceId = current.project.workspaceId;
    if (parsed.projectId !== undefined) {
      const targetProject = await prisma.project.findFirst({
        where: { id: parsed.projectId, userId },
        select: { workspaceId: true },
      });
      targetWorkspaceId = targetProject?.workspaceId ?? null;
    }
    const workspaceChanged = targetWorkspaceId !== current.project.workspaceId;

    const data: {
      columnId?: string;
      projectId?: string;
      title?: string;
      description?: string | null;
      priority?: 'alta' | 'media' | 'baixa';
      plannedFor?: string | null;
      status?: 'todo' | 'doing' | 'done';
      estimateMin?: number;
      salesforceOppUrl?: string | null;
      repoUrl?: string | null;
      estimatedDeliveryDate?: Date | null;
      completedAt?: Date | null;
    } = {};
    if (parsed.projectId !== undefined) data.projectId = parsed.projectId;
    if (parsed.title !== undefined) data.title = parsed.title;
    if (parsed.description !== undefined) data.description = parsed.description ?? null;
    if (parsed.priority !== undefined) data.priority = parsed.priority;
    if (parsed.plannedFor !== undefined) data.plannedFor = parsed.plannedFor ?? null;
    // Mover de coluna (ou mudar de projeto para outro workspace) define o status e o carimbo de conclusão.
    if (parsed.columnId !== undefined || parsed.status !== undefined || workspaceChanged) {
      if (!targetWorkspaceId) throw new HttpError(409, 'O projeto não pertence a um workspace.');
      const columns = await loadColumns(targetWorkspaceId);

      const target =
        workspaceChanged && parsed.columnId === undefined && parsed.status === undefined
          ? // projeto de outro workspace: mantém "concluída" se já estava, senão entra na primeira coluna
            (current.status === 'done' ? doneColumn(columns) : firstOpenColumn(columns)) ?? columns[0]
          : resolveTargetColumn(columns, parsed.columnId, parsed.status);
      if (!target) throw new HttpError(409, 'Este workspace não tem colunas.');

      const transition = transitionData(
        { completedAt: current.completedAt, plannedFor: current.plannedFor },
        current.status === 'done',
        target,
        columns,
      );
      data.columnId = transition.columnId;
      data.status = transition.status;
      if ('completedAt' in transition) data.completedAt = transition.completedAt;
      if ('plannedFor' in transition) data.plannedFor = transition.plannedFor;
    }
    if (parsed.estimateMin !== undefined) data.estimateMin = parsed.estimateMin;
    if (parsed.salesforceOppUrl !== undefined) data.salesforceOppUrl = parsed.salesforceOppUrl;
    if (parsed.repoUrl !== undefined) data.repoUrl = parsed.repoUrl;
    if (parsed.estimatedDeliveryDate !== undefined) data.estimatedDeliveryDate = parsed.estimatedDeliveryDate;

    const task = await prisma.task.update({
      where: { id, userId },
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
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await prisma.task.delete({ where: { id, userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
