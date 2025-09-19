import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ensureClockfySyncForProject } from '@/lib/integrations/clockfy';
export const dynamic = 'force-dynamic';

interface Params { params: { id: string } }

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id} = await params;
    const body = await req.json();
    const schema = z.object({
      name: z.string().min(1).optional(),
      client: z.string().optional().nullable(),
      color: z.string().min(1).optional(),
      hourlyRate: z
        .union([z.string(), z.number()])
        .optional()
        .transform((v) => (v === undefined ? undefined : Number(v)))
        .refine((v) => v === undefined || Number.isFinite(v), 'hourlyRate inválido'),
      active: z.boolean().optional(),
    });

    const parsed = schema.parse(body);

    const data: any = {};
    if (parsed.name !== undefined) data.name = parsed.name;
    if (parsed.client !== undefined) data.client = parsed.client || undefined;
    if (parsed.color !== undefined) data.color = parsed.color;
    if (parsed.hourlyRate !== undefined) data.hourlyRate = parsed.hourlyRate;
    if (parsed.active !== undefined) data.active = parsed.active;

    const project = await prisma.project.update({ where: { id }, data });

    if (parsed.name !== undefined || parsed.client !== undefined) {
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
          where: { id },
          data: {
            clockfyProjectId: syncResult.projectId ?? project.clockfyProjectId ?? undefined,
            clockfyClientId: syncResult.clientId ?? project.clockfyClientId ?? undefined,
          },
        });
        return NextResponse.json(updated);
      }
    }

    return NextResponse.json(project);
  } catch (err: any) {
    return NextResponse.json({ message: err.message ?? 'Erro ao atualizar projeto' }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
