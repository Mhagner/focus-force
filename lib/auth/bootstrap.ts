import { ensurePlan, TRIAL_DAYS } from '@/lib/billing/plans';
import { prisma } from '@/lib/prisma';

/**
 * Cria o que todo usuário novo precisa: a assinatura em trial.
 * O workspace NÃO é criado aqui: o primeiro acesso passa pelo onboarding, onde a pessoa escolhe
 * o tipo (Estudos ou Trabalho), o nome e as configurações.
 * Idempotente: pode ser chamado mais de uma vez para o mesmo usuário.
 */
export async function bootstrapUser(userId: string) {
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
