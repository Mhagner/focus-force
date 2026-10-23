import { ensurePlan, TRIAL_DAYS } from '@/lib/billing/plans';
import { prisma } from '@/lib/prisma';

/**
 * Cria o que todo usuário novo precisa (workspace padrão e assinatura em trial).
 * Idempotente: pode ser chamado mais de uma vez para o mesmo usuário.
 */
export async function bootstrapUser(userId: string) {
  const existingWorkspace = await prisma.workspace.findFirst({ where: { userId }, select: { id: true } });
  if (!existingWorkspace) {
    await prisma.workspace.create({ data: { userId, name: 'Trabalho', mode: 'WORK' } });
  }

  const existingSubscription = await prisma.subscription.findUnique({ where: { userId }, select: { id: true } });
  if (!existingSubscription) {
    const plan = await ensurePlan('pro');
    await prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        status: 'trialing',
        trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
  }
}
