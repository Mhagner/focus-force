import { HttpError } from '@/lib/auth/require-user';
import { PLAN_DEFINITIONS, type PlanKey, type PlanLimits } from '@/lib/billing/plans';
import { prisma } from '@/lib/prisma';

/**
 * Limites efetivos do usuário. Trial vencido ou assinatura cancelada caem para o plano gratuito;
 * sem assinatura também (conta antiga que ainda não passou pelo backfill).
 */
export async function getEffectiveLimits(userId: string): Promise<PlanLimits> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });

  if (!subscription) return PLAN_DEFINITIONS.free.limits;

  const now = new Date();
  const trialExpired = subscription.status === 'trialing' && !!subscription.trialEndsAt && subscription.trialEndsAt < now;
  if (subscription.status === 'canceled' || trialExpired) {
    return PLAN_DEFINITIONS.free.limits;
  }

  const key = subscription.plan.key as PlanKey;
  return PLAN_DEFINITIONS[key]?.limits ?? (subscription.plan.limits as unknown as PlanLimits);
}

/** Lança 402 se criar mais um `resource` ultrapassaria o limite do plano. */
export async function assertWithinLimit(userId: string, resource: keyof PlanLimits, currentCount: number) {
  const limits = await getEffectiveLimits(userId);
  const max = limits[resource];
  if (max !== null && currentCount >= max) {
    throw new HttpError(402, `Limite do seu plano atingido (${max}). Faça upgrade para continuar.`);
  }
}
