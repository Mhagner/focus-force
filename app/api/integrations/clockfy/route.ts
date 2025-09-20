import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const settingsSchema = z.object({
  apiKey: z.string().optional().nullable(),
  workspaceId: z.string().optional().nullable(),
});

function normalize(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  const settings = await prisma.clockfySettings.findFirst();

  return NextResponse.json({
    apiKey: settings?.apiKey ?? '',
    workspaceId: settings?.workspaceId ?? '',
    updatedAt: settings?.updatedAt ?? null,
  });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = settingsSchema.parse(body);

    const data = {
      apiKey: normalize(parsed.apiKey),
      workspaceId: normalize(parsed.workspaceId),
    };

    const existing = await prisma.clockfySettings.findFirst();

    const saved = existing
      ? await prisma.clockfySettings.update({ where: { id: existing.id }, data })
      : await prisma.clockfySettings.create({ data });

    return NextResponse.json({
      apiKey: saved.apiKey ?? '',
      workspaceId: saved.workspaceId ?? '',
      updatedAt: saved.updatedAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message ?? 'Erro ao salvar configurações do Clockfy' },
      { status: 400 }
    );
  }
}
