import { NextResponse } from 'next/server';

import { apiError } from '@/lib/api';
import { getEffectiveLimits } from '@/lib/billing/entitlements';
import { requireUser } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Quantos workspaces ativos o usuário pode ter, para o onboarding avisar antes de começar. */
export async function GET() {
  try {
    const { userId } = await requireUser();
    const [limits, used] = await Promise.all([
      getEffectiveLimits(userId),
      prisma.workspace.count({ where: { userId, archived: false } }),
    ]);
    const max = limits.workspaces;
    return NextResponse.json({ max, used, canCreate: max === null || used < max });
  } catch (err) {
    return apiError(err);
  }
}
