import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params { params: { id: string } }

export async function PATCH(req: Request, { params }: Params) {
  const data = await req.json();
  const task = await prisma.task.update({ where: { id: params.id }, data });
  return NextResponse.json(task);
}

export async function DELETE(req: Request, { params }: Params) {
  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
