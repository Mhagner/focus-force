import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const planSchema = z.object({
  id: z.string().optional(),
  dateISO: z.string(),
  notes: z.string().optional().nullable(),
  blocks: z.array(
    z.object({
      projectId: z.string(),
      targetMinutes: z.number().int().min(0),
    })
  ),
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
    throw new Error('Data inválida');
  }
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function GET() {
  const plans = await prisma.dailyPlan.findMany({
    include: { blocks: true },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json(plans.map((plan) => mapPlan(plan as PlanWithRelations)));
}

export async function POST(req: Request) {
  try {
    const payload = planSchema.parse(await req.json());
    const { start, end } = getDateRange(payload.dateISO);

    const existing = await prisma.dailyPlan.findFirst({
      where: {
        date: {
          gte: start,
          lt: end,
        },
      },
    });

    const blocksData = payload.blocks.map((block) => ({
      projectId: block.projectId,
      targetMinutes: block.targetMinutes,
    }));

    const saved = existing
      ? await prisma.dailyPlan.update({
          where: { id: existing.id },
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
    if (err instanceof z.ZodError) {
      return NextResponse.json({ message: 'Dados inválidos', issues: err.issues }, { status: 400 });
    }
    if (err instanceof Error && err.message === 'Data inválida') {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ message: 'Erro ao salvar plano diário' }, { status: 500 });
  }
}
