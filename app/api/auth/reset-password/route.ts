import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { audit } from '@/lib/auth/audit';
import { consumeAuthToken } from '@/lib/auth/tokens';
import { hashPassword, passwordSchema } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({ token: z.string().min(20).max(200), password: passwordSchema });

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`reset:ip:${ip}`, 20, 15 * 60);
    if (!limit.ok) {
      return NextResponse.json({ message: 'Muitas tentativas.' }, { status: 429 });
    }

    const { token, password } = schema.parse(await request.json().catch(() => null));
    const userId = await consumeAuthToken(token, 'PASSWORD_RESET');
    if (!userId) {
      return NextResponse.json({ message: 'Link inválido ou expirado.' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(password),
        tokenVersion: { increment: 1 }, // encerra todas as sessões abertas
        emailVerified: new Date(), // receber o link prova controle da caixa de entrada
      },
    });
    await audit('password_reset', { userId, ip });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
