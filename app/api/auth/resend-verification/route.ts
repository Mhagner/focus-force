import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { issueAuthToken } from '@/lib/auth/tokens';
import { sendVerificationEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
const GENERIC_OK = { message: 'Se houver uma conta pendente, enviamos um novo link.' };

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const { email } = schema.parse(await request.json().catch(() => null));

    const [byIp, byEmail] = await Promise.all([
      rateLimit(`resend:ip:${ip}`, 10, 60 * 60),
      rateLimit(`resend:email:${email}`, 3, 60 * 60),
    ]);
    if (!byIp.ok || !byEmail.ok) {
      return NextResponse.json({ message: 'Muitas tentativas. Tente mais tarde.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified && !user.deletedAt) {
      await sendVerificationEmail(user.email, await issueAuthToken(user.id, 'EMAIL_VERIFY'));
    }
    return NextResponse.json(GENERIC_OK);
  } catch (error) {
    return apiError(error);
  }
}
