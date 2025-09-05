import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export const dynamic = 'force-dynamic';

interface Params { params: { id: string } }

export async function PATCH(req: Request, { params }: Params) {
  const data = await req.json();
  const session = await prisma.focusSession.update({ where: { id: params.id }, data });
  return NextResponse.json(session);
}

export async function DELETE(req: Request, { params }: Params) {
  await prisma.focusSession.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
