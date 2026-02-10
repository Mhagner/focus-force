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
