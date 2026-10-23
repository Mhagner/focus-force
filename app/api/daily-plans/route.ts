import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiError } from '@/lib/api';
import { HttpError, requireUser } from '@/lib/auth/require-user';
import { assertProjectOwned } from '@/lib/auth/ownership';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const planSchema = z.object({
  id: z.string().optional(),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  notes: z.string().max(5000).optional().nullable(),
  blocks: z
    .array(
      z.object({
        projectId: z.string(),
        targetMinutes: z.number().int().min(0).max(24 * 60),
      })
    )
    .max(100),
});

type PlanWithRelations = {
  id: string;
  date: Date;
  notes: string | null;
  blocks: { projectId: string; targetMinutes: number }[];
};

function mapPlan(plan: PlanWithRelations) {
  return {
    id: plan.id,
    dateISO: plan.date.toISOString().slice(0, 10),
    notes: plan.notes ?? undefined,
    blocks: plan.blocks.map((block) => ({
      projectId: block.projectId,
      targetMinutes: block.targetMinutes,
    })),
  };
}

function getDateRange(dateISO: string) {
  const start = new Date(`${dateISO}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    throw new HttpError(400, 'Data inválida');
  }
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function GET() {
  try {
    const { userId } = await requireUser();
    const plans = await prisma.dailyPlan.findMany({
      where: { userId },
      include: { blocks: true },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(plans.map((plan) => mapPlan(plan as PlanWithRelations)));
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const payload = planSchema.parse(await req.json());
    const { start, end } = getDateRange(payload.dateISO);

    for (const projectId of Array.from(new Set(payload.blocks.map((block) => block.projectId)))) {
      await assertProjectOwned(userId, projectId);
    }

    const existing = await prisma.dailyPlan.findFirst({
      where: {
        userId,
        date: {
          gte: start,
          lt: end,
        },
      },
    });

    const blocksData = payload.blocks.map((block) => ({
      userId,
      projectId: block.projectId,
      targetMinutes: block.targetMinutes,
    }));

    const saved = existing
      ? await prisma.dailyPlan.update({
          where: { id: existing.id, userId },
          data: {
            date: start,
            notes: payload.notes?.trim() ? payload.notes : null,
            blocks: {
              deleteMany: {},
              create: blocksData,
            },
          },
          include: { blocks: true },
        })
      : await prisma.dailyPlan.create({
          data: {
            userId,
            date: start,
            notes: payload.notes?.trim() ? payload.notes : null,
            blocks: {
              create: blocksData,
            },
          },
          include: { blocks: true },
        });

    return NextResponse.json(mapPlan(saved as PlanWithRelations));
  } catch (err) {
    return apiError(err);
  }
}
