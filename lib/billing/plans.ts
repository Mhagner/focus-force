import { prisma } from '@/lib/prisma';

export type PlanKey = 'free' | 'pro' | 'owner';

export interface PlanLimits {
  /** null = ilimitado */
  workspaces: number | null;
  projects: number | null;
}

// Valores iniciais de partida; ajustar quando o modelo comercial for definido.
export const PLAN_DEFINITIONS: Record<PlanKey, { name: string; limits: PlanLimits }> = {
  free: { name: 'Gratuito', limits: { workspaces: 1, projects: 3 } },
  pro: { name: 'Pro', limits: { workspaces: null, projects: null } },
  owner: { name: 'Proprietário', limits: { workspaces: null, projects: null } },
};

export const TRIAL_DAYS = 14;

export async function ensurePlan(key: PlanKey) {
  const def = PLAN_DEFINITIONS[key];
  return prisma.plan.upsert({
    where: { key },
    update: {},
    create: { key, name: def.name, limits: def.limits as unknown as object },
  });
}
