import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
export const dynamic = 'force-dynamic';

export async function GET() {
  const projects = await prisma.project.findMany();
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const schema = z.object({
      name: z.string().min(1),
      client: z.string().optional().nullable(),
      color: z.string().min(1),
      hourlyRate: z
        .union([z.string(), z.number()])
        .optional()
        .transform((v) => (v === undefined ? undefined : Number(v)))
        .refine((v) => v === undefined || Number.isFinite(v), 'hourlyRate inválido'),
      active: z.boolean().optional(),
    });

    const parsed = schema.parse(body);

    const data = {
      name: parsed.name,
      client: parsed.client || undefined,
      color: parsed.color,
      hourlyRate: parsed.hourlyRate !== undefined ? parsed.hourlyRate : undefined,
      active: parsed.active ?? true,
    };

    const project = await prisma.project.create({ data });
    return NextResponse.json(project);
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Erro ao criar projeto' }, { status: 400 });
  }
}
