import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiError } from '@/lib/api';
import { requireUser } from '@/lib/auth/require-user';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await requireUser();
    const presets = await prisma.sessionDescriptionPreset.findMany({
      where: { userId, active: true },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json(presets);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireUser();
    const body = await req.json();
    const schema = z.object({
      label: z.string().min(1).max(120),
    });
    const parsed = schema.parse(body);

    const last = await prisma.sessionDescriptionPreset.findFirst({
      where: { userId },
      orderBy: { order: 'desc' },
    });

    const preset = await prisma.sessionDescriptionPreset.create({
      data: {
        userId,
        label: parsed.label.trim(),
        order: (last?.order ?? -1) + 1,
      },
    });

    return NextResponse.json(preset);
  } catch (err) {
    return apiError(err);
  }
}
