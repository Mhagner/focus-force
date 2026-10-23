import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { audit } from '@/lib/auth/audit';
import { consumeAuthToken } from '@/lib/auth/tokens';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({ token: z.string().min(20).max(200) });

// POST (e não GET) para que scanners de link de e-mail não consumam o token.
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`verify:ip:${ip}`, 20, 15 * 60);
    if (!limit.ok) {
      return NextResponse.json({ message: 'Muitas tentativas.' }, { status: 429 });
    }

    const { token } = schema.parse(await request.json().catch(() => null));
    const userId = await consumeAuthToken(token, 'EMAIL_VERIFY');
    if (!userId) {
      return NextResponse.json({ message: 'Link inválido ou expirado.' }, { status: 400 });
    }

    await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
    await audit('email_verified', { userId, ip });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
