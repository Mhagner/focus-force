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

    const optionalUrlSchema = z
      .string()
      .trim()
      .optional()
      .nullable()
      .transform((value) => {
        if (value === undefined) return undefined;
        if (value === null) return null;
        return value.length > 0 ? value : undefined;
      });

    const estimatedDateSchema = z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .transform((value, ctx) => {
        if (value === undefined) return undefined;
        if (value === null) return null;

        if (value instanceof Date) {
          if (Number.isNaN(value.getTime())) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data inválida' });
            return z.NEVER;
          }
          return value;
        }

        const trimmed = value.trim();
        if (!trimmed) return undefined;

        // If the client sent a date-only string like 'YYYY-MM-DD',
        // construct a Date at noon UTC to avoid timezone shifts when
        // converting to local time on the client.
        const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
        if (dateOnlyMatch) {
          const [y, m, d] = trimmed.split('-').map((s) => Number(s));
          const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
          return utcNoon;
        }

        const parsedDate = new Date(trimmed);
        if (Number.isNaN(parsedDate.getTime())) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data inválida' });
          return z.NEVER;
        }

        return parsedDate;
      });

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
      syncWithClockfy: z.boolean().optional(),
      salesforceOppUrl: optionalUrlSchema,
      sharepointRepoUrl: optionalUrlSchema,
      estimatedDeliveryDate: estimatedDateSchema,
    });

    const parsed = schema.parse(body);

    const data = {
      name: parsed.name,
      client: parsed.client || undefined,
      color: parsed.color,
      hourlyRate: parsed.hourlyRate !== undefined ? parsed.hourlyRate : undefined,
      active: parsed.active ?? true,
      syncWithClockfy: parsed.syncWithClockfy ?? false,
      salesforceOppUrl: parsed.salesforceOppUrl ?? undefined,
      sharepointRepoUrl: parsed.sharepointRepoUrl ?? undefined,
      estimatedDeliveryDate: parsed.estimatedDeliveryDate ?? undefined,
    };

    const project = await prisma.project.create({ data });

    if (!project.syncWithClockfy) {
      return NextResponse.json(project);
    }

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
