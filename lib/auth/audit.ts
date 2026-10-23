import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export async function audit(action: string, opts: { userId?: string | null; ip?: string; meta?: Prisma.InputJsonValue } = {}) {
  try {
    await prisma.auditLog.create({
      data: { action, userId: opts.userId ?? null, ip: opts.ip, meta: opts.meta },
    });
  } catch (error) {
    // Auditoria nunca deve derrubar o fluxo principal.
    console.error('[audit] falha ao registrar', action, error);
  }
}
