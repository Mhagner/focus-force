import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { requireUser } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const columnSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(60),
});

const boardSchema = z.object({
  columns: z.array(columnSchema).max(30).default([]),
  taskColumnMap: z.record(z.string().max(100), z.string().max(100)).default({}),
});

const defaultBoard = {
  columns: [],
  taskColumnMap: {},
};

function normalizeBoard(data: { columns?: unknown; taskColumnMap?: unknown; updatedAt?: Date | null }) {
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

    const saved = await prisma.taskBoardSettings.upsert({
      where: { userId },
      update: { columns: parsed.columns, taskColumnMap: parsed.taskColumnMap },
      create: { userId, columns: parsed.columns, taskColumnMap: parsed.taskColumnMap },
    });

    return NextResponse.json(normalizeBoard(saved));
  } catch (err) {
    return apiError(err);
  }
}
