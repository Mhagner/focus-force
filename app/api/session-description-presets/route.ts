import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET() {
  const presets = await prisma.sessionDescriptionPreset.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
  });
  return NextResponse.json(presets);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const schema = z.object({
      label: z.string().min(1).max(120),
    });
    const parsed = schema.parse(body);

    const last = await prisma.sessionDescriptionPreset.findFirst({
      orderBy: { order: 'desc' },
    });

    const preset = await prisma.sessionDescriptionPreset.create({
      data: {
        label: parsed.label.trim(),
        order: (last?.order ?? -1) + 1,
      },
    });

    return NextResponse.json(preset);
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Erro ao criar descrição padrão' }, { status: 400 });
  }
}
