import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const sessions = await prisma.focusSession.findMany();
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const data = await req.json();
  const session = await prisma.focusSession.create({ data });
  return NextResponse.json(session);
}
