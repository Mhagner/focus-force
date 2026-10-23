import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { requireUser } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_KEYS = ['todo', 'call_agendada', 'pronta_elaboracao', 'doing', 'done'] as const;

const columnSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(60),
});

const titlesByMode = z.record(z.enum(STATUS_KEYS), z.string().trim().min(1).max(40));

// Todos os campos são opcionais: só o que vier no corpo é atualizado.
const boardSchema = z.object({
  columns: z.array(columnSchema).max(30).optional(),
  taskColumnMap: z.record(z.string().max(100), z.string().max(100)).optional(),
  statusTitles: z.object({ WORK: titlesByMode.optional(), STUDY: titlesByMode.optional() }).optional(),
});

const defaultBoard = {
  columns: [],
  taskColumnMap: {},
};

function normalizeStatusTitles(value: unknown) {
  const result: { WORK: Record<string, string>; STUDY: Record<string, string> } = { WORK: {}, STUDY: {} };
  if (!value || typeof value !== 'object') return result;

  for (const mode of ['WORK', 'STUDY'] as const) {
    const raw = (value as Record<string, unknown>)[mode];
    if (!raw || typeof raw !== 'object') continue;
    for (const key of STATUS_KEYS) {
      const title = (raw as Record<string, unknown>)[key];
      if (typeof title === 'string' && title.trim().length > 0) {
        result[mode][key] = title.trim().slice(0, 40);
      }
    }
  }
  return result;
}

function normalizeBoard(data: {
  columns?: unknown;
  taskColumnMap?: unknown;
  statusTitles?: unknown;
  updatedAt?: Date | null;
}) {
  const columns = Array.isArray(data.columns)
    ? data.columns
        .filter((column): column is { id: string; title: string } => {
          if (!column || typeof column !== 'object') return false;
          const value = column as { id?: unknown; title?: unknown };
          return typeof value.id === 'string' && value.id.trim().length > 0 && typeof value.title === 'string' && value.title.trim().length > 0;
        })
        .map((column) => ({ id: column.id.trim(), title: column.title.trim().slice(0, 60) }))
    : [];

  const taskColumnMap =
    data.taskColumnMap && typeof data.taskColumnMap === 'object'
      ? Object.entries(data.taskColumnMap as Record<string, unknown>).reduce<Record<string, string>>((acc, [taskId, columnId]) => {
          if (typeof taskId === 'string' && taskId.trim().length > 0 && typeof columnId === 'string' && columnId.trim().length > 0) {
            acc[taskId] = columnId;
          }
          return acc;
        }, {})
      : {};

  return {
    columns,
    taskColumnMap,
    statusTitles: normalizeStatusTitles(data.statusTitles),
    updatedAt: data.updatedAt?.toISOString() ?? null,
  };
}

export async function GET() {
  try {
    const { userId } = await requireUser();
    const board = await prisma.taskBoardSettings.upsert({
      where: { userId },
      update: {},
      create: { ...defaultBoard, userId },
    });
    return NextResponse.json(normalizeBoard(board));
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await requireUser();
    const parsed = boardSchema.parse(await req.json());

    const data = {
      ...(parsed.columns !== undefined ? { columns: parsed.columns } : {}),
      ...(parsed.taskColumnMap !== undefined ? { taskColumnMap: parsed.taskColumnMap } : {}),
      ...(parsed.statusTitles !== undefined ? { statusTitles: normalizeStatusTitles(parsed.statusTitles) } : {}),
    };

    const saved = await prisma.taskBoardSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...defaultBoard, ...data },
    });

    return NextResponse.json(normalizeBoard(saved));
  } catch (err) {
    return apiError(err);
  }
}
