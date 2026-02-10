import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
export const dynamic = 'force-dynamic';

const defaultSettings = {
  workMin: 50,
  shortBreakMin: 10,
  longBreakMin: 20,
  cyclesToLongBreak: 3,
  autoStartNext: true,
  soundOn: true,
  defaultChecklist: [],
};

export async function GET() {
  const existing = await prisma.pomodoroSettings.findFirst();
  if (existing) {
    return NextResponse.json({
      ...existing,
      defaultChecklist: Array.isArray(existing.defaultChecklist) ? existing.defaultChecklist : [],
    });
  }
  const created = await prisma.pomodoroSettings.create({ data: defaultSettings });
  return NextResponse.json(created);
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const schema = z.object({
      workMin: z.number().int(),
      shortBreakMin: z.number().int(),
      longBreakMin: z.number().int(),
      cyclesToLongBreak: z.number().int(),
      autoStartNext: z.boolean(),
      soundOn: z.boolean(),
      defaultChecklist: z.array(z.string().min(1)).default([]),
    });
    const parsed = schema.parse(body);
    const existing = await prisma.pomodoroSettings.findFirst();
    const updated = existing
      ? await prisma.pomodoroSettings.update({ where: { id: existing.id }, data: parsed })
      : await prisma.pomodoroSettings.create({ data: parsed });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Erro ao atualizar' }, { status: 400 });
  }
}
