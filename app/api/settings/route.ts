import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiError } from '@/lib/api';
import { requireUser } from '@/lib/auth/require-user';
export const dynamic = 'force-dynamic';

const defaultSettings = {
  workMin: 50,
  shortBreakMin: 10,
  longBreakMin: 20,
  cyclesToLongBreak: 3,
  autoStartNext: true,
  soundOn: true,
  defaultChecklist: [],
  defaultHourlyRate: 0,
};

export async function GET() {
  try {
    const { userId } = await requireUser();
    // upsert evita corrida entre duas requisições simultâneas do primeiro acesso.
    const settings = await prisma.pomodoroSettings.upsert({
      where: { userId },
      update: {},
      create: { ...defaultSettings, userId },
    });
    return NextResponse.json({
      ...settings,
      defaultChecklist: Array.isArray(settings.defaultChecklist) ? settings.defaultChecklist : [],
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const schema = z.object({
      workMin: z.number().int().min(1).max(240),
      shortBreakMin: z.number().int().min(1).max(120),
      longBreakMin: z.number().int().min(1).max(240),
      cyclesToLongBreak: z.number().int().min(1).max(20),
      autoStartNext: z.boolean(),
      soundOn: z.boolean(),
      defaultChecklist: z.array(z.string().min(1).max(200)).max(50).default([]),
      defaultHourlyRate: z.number().min(0).max(1_000_000).optional(),
    });
    const parsed = schema.parse(body);
    const updated = await prisma.pomodoroSettings.upsert({
      where: { userId },
      update: parsed,
      create: { ...parsed, userId },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return apiError(err);
  }
}
