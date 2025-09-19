import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ensureClockfySyncForProject } from '@/lib/integrations/clockfy';
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

    const settings = await prisma.clockfySettings.findFirst();
    const credentials = {
      apiKey: settings?.apiKey ?? undefined,
      workspaceId: settings?.workspaceId ?? undefined,
    };

    const syncResult = await ensureClockfySyncForProject({
      projectName: project.name,
      clientName: project.client,
      credentials,
    });

    if (syncResult?.projectId || syncResult?.clientId) {
      const updated = await prisma.project.update({
        where: { id: project.id },
        data: {
          clockfyProjectId: syncResult.projectId ?? undefined,
          clockfyClientId: syncResult.clientId ?? undefined,
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json(project);
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Erro ao criar projeto' }, { status: 400 });
  }
}
