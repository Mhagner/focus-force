import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const columnSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(60),
});

const boardSchema = z.object({
  columns: z.array(columnSchema).default([]),
  taskColumnMap: z.record(z.string(), z.string()).default({}),
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
  const existing = await prisma.taskBoardSettings.findFirst();

  if (!existing) {
    const created = await prisma.taskBoardSettings.create({ data: defaultBoard });
    return NextResponse.json(normalizeBoard(created));
  }

  return NextResponse.json(normalizeBoard(existing));
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = boardSchema.parse(body);

    const existing = await prisma.taskBoardSettings.findFirst();

    const saved = existing
      ? await prisma.taskBoardSettings.update({
          where: { id: existing.id },
          data: {
            columns: parsed.columns,
            taskColumnMap: parsed.taskColumnMap,
          },
        })
      : await prisma.taskBoardSettings.create({
          data: {
            columns: parsed.columns,
            taskColumnMap: parsed.taskColumnMap,
          },
        });

    return NextResponse.json(normalizeBoard(saved));
  } catch (err: any) {
    return NextResponse.json({ message: err?.message ?? 'Erro ao salvar board de tarefas' }, { status: 400 });
  }
}
