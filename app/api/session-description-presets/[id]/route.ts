import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await req.json();
    const schema = z.object({
      label: z.string().min(1).max(120).optional(),
      active: z.boolean().optional(),
      order: z.number().int().optional(),
    });
    const parsed = schema.parse(body);

    const preset = await prisma.sessionDescriptionPreset.update({
      where: { id },
      data: parsed,
    });

    return NextResponse.json(preset);
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Erro ao atualizar descrição padrão' }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.sessionDescriptionPreset.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
