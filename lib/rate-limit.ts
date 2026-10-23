import { prisma } from '@/lib/prisma';

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

/**
 * Contador por janela fixa, atômico, armazenado em Postgres (tabela RateLimit).
 * `key` deve incluir o escopo, ex.: `login:ip:1.2.3.4` ou `login:email:a@b.com`.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const rows = await prisma.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" < now() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" < now()
                       THEN now() + make_interval(secs => ${windowSec})
                       ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"
  `;

  const row = rows[0];
  const retryAfterSec = Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000));
  return { ok: Number(row.count) <= limit, retryAfterSec };
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip') ?? 'unknown';
}
