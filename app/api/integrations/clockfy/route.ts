import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiError } from '@/lib/api';
import { HttpError, requireUser } from '@/lib/auth/require-user';
import { getWorkspaceFilter } from '@/lib/auth/workspace-filter';

import { encryptSecret } from '@/lib/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const workspaceSchema = z.object({
  id: z.string().max(100).optional().nullable(),
  description: z.string().max(200).optional().nullable(),
});

const settingsSchema = z.object({
  // Vazio/ausente = manter a chave atual. Para remover, enviar clearApiKey: true.
  apiKey: z.string().max(200).optional().nullable(),
  clearApiKey: z.boolean().optional(),
  workspaceId: z.string().max(100).optional().nullable(),
  workspaces: z.array(workspaceSchema).max(50).optional(),
});

function normalize(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// Nunca devolve a chave: o cliente só precisa saber se existe uma salva.
function toResponse(settings: { apiKey: string | null; workspaceId: string | null; workspaces: unknown; updatedAt: Date } | null) {
  return {
    apiKey: '',
    hasApiKey: Boolean(settings?.apiKey),
    workspaceId: settings?.workspaceId ?? '',
    workspaces: (settings?.workspaces as any[])?.filter(Boolean) ?? [],
    updatedAt: settings?.updatedAt ?? null,
  };
}

// A integração pertence ao WORKSPACE do app: cada um tem a sua chave e os seus workspaces do Clockify.
async function requireWorkspace(userId: string, req: Request): Promise<string> {
  const workspaceId = await getWorkspaceFilter(userId, req.url);
  if (!workspaceId) throw new HttpError(400, 'Informe o workspace.');
  return workspaceId;
}

export async function GET(req: Request) {
  try {
    const { userId } = await requireUser();
    const workspaceId = await requireWorkspace(userId, req);
    const settings = await prisma.clockfySettings.findFirst({ where: { userId, appWorkspaceId: workspaceId } });
    return NextResponse.json(toResponse(settings));
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await requireUser();
    const appWorkspaceId = await requireWorkspace(userId, req);
    const parsed = settingsSchema.parse(await req.json());

    const workspaces = (parsed.workspaces ?? [])
      .map((workspace) => ({
        id: normalize(workspace.id),
        description: normalize(workspace.description),
      }))
      .filter((workspace) => Boolean(workspace.id));

    const newKey = normalize(parsed.apiKey);
    const data: { apiKey?: string | null; workspaceId: string | null; workspaces: typeof workspaces } = {
      workspaceId: normalize(parsed.workspaceId) ?? workspaces[0]?.id ?? null,
      workspaces,
    };
    if (parsed.clearApiKey) {
      data.apiKey = null;
    } else if (newKey) {
      data.apiKey = encryptSecret(newKey);
    }

    const saved = await prisma.clockfySettings.upsert({
      where: { appWorkspaceId },
      update: data,
      create: { userId, appWorkspaceId, ...data },
    });

    return NextResponse.json(toResponse(saved));
  } catch (err) {
    return apiError(err);
  }
}
