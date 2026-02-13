import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';
import { z } from 'zod';

export async function GET() {
  const tasks = await prisma.task.findMany({
    include: {
      comments: {
        orderBy: { createdAt: 'desc' },
      },
      subtasks: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  try {
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

        // If the client sent a date-only string like 'YYYY-MM-DD',
        // construct a Date at noon UTC to avoid timezone shifts.
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
      projectId: z.string().min(1),
      title: z.string().min(1),
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

    const bodyHasDescription =
      typeof body === 'object' && body !== null && Object.prototype.hasOwnProperty.call(body, 'description');
    const bodyHasPlannedFor =
      typeof body === 'object' && body !== null && Object.prototype.hasOwnProperty.call(body, 'plannedFor');

    const data: {
      projectId: string;
      title: string;
      priority: 'alta' | 'media' | 'baixa';
      status: 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done';
      description?: string | null;
      plannedFor?: string | null;
      estimateMin?: number;
      salesforceOppUrl?: string | null;
      repoUrl?: string | null;
      estimatedDeliveryDate?: Date | null;
    } = {
      projectId: parsed.projectId,
      title: parsed.title,
      priority: parsed.priority ?? 'media',
      status: parsed.status ?? 'todo',
    };

    if (bodyHasDescription) {
      data.description = parsed.description ?? null;
    }

    if (bodyHasPlannedFor) {
      data.plannedFor = parsed.plannedFor ?? null;
    }

    if (parsed.estimateMin !== undefined) {
      data.estimateMin = parsed.estimateMin;
    }

    if (parsed.salesforceOppUrl !== undefined) {
      data.salesforceOppUrl = parsed.salesforceOppUrl;
    }

    if (parsed.repoUrl !== undefined) {
      data.repoUrl = parsed.repoUrl;
    }

    if (parsed.estimatedDeliveryDate !== undefined) {
      data.estimatedDeliveryDate = parsed.estimatedDeliveryDate;
    }

    const settings = await prisma.pomodoroSettings.findFirst();
    const defaultChecklist = Array.isArray(settings?.defaultChecklist)
      ? settings?.defaultChecklist.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];

    if (defaultChecklist.length > 0) {
      (data as any).subtasks = {
        create: defaultChecklist.map((title) => ({ title })),
      };
    }

    const task = await prisma.task.create({
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
    return NextResponse.json({ message: err.message ?? 'Erro ao criar tarefa' }, { status: 400 });
  }
}
