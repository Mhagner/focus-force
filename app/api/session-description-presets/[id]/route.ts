import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiError } from '@/lib/api';
import { requireUser } from '@/lib/auth/require-user';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const schema = z.object({
      label: z.string().min(1).max(120).optional(),
      active: z.boolean().optional(),
      order: z.number().int().optional(),
    });
    const parsed = schema.parse(body);

    const preset = await prisma.sessionDescriptionPreset.update({
      where: { id, userId },
      data: parsed,
    });

    return NextResponse.json(preset);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUser();
    const { id } = await params;
    await prisma.sessionDescriptionPreset.delete({ where: { id, userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
