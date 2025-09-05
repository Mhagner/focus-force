import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();
  const session = await prisma.focusSession.update({ where: { id }, data });
  return NextResponse.json(session);
}

export async function DELETE(
    req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.focusSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
