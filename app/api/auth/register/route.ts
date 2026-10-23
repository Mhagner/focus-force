import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiError } from '@/lib/api';
import { audit } from '@/lib/auth/audit';
import { bootstrapUser } from '@/lib/auth/bootstrap';
import { issueAuthToken } from '@/lib/auth/tokens';
import { sendAccountExistsEmail, sendVerificationEmail } from '@/lib/email';
import { hashPassword, passwordSchema } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().toLowerCase().email().max(254),
  password: passwordSchema,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'É necessário aceitar os termos.' }) }),
});

// Resposta idêntica para e-mail novo ou já existente (evita enumeração de contas).
const GENERIC_OK = { message: 'Se o e-mail puder ser usado, enviamos um link de confirmação.' };

export async function POST(request: Request) {
  try {
    // Cadastro público só abre quando o isolamento por usuário estiver ativo em todas as rotas.
    if (process.env.ALLOW_SIGNUP !== 'true') {
      return NextResponse.json({ message: 'Cadastros ainda não estão abertos.' }, { status: 403 });
    }

    const ip = getClientIp(request.headers);
    const body = registerSchema.parse(await request.json().catch(() => null));

    const [byIp, byEmail] = await Promise.all([
      rateLimit(`register:ip:${ip}`, 10, 60 * 60),
      rateLimit(`register:email:${body.email}`, 5, 60 * 60),
    ]);
    if (!byIp.ok || !byEmail.ok) {
      return NextResponse.json(
        { message: 'Muitas tentativas. Tente novamente mais tarde.' },
        { status: 429, headers: { 'Retry-After': String(Math.max(byIp.retryAfterSec, byEmail.retryAfterSec)) } }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email } });

    if (existing && existing.emailVerified) {
      await sendAccountExistsEmail(body.email);
      return NextResponse.json(GENERIC_OK);
    }

    const passwordHash = await hashPassword(body.password);
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash, name: body.name ?? existing.name },
        })
      : await prisma.user.create({ data: { email: body.email, name: body.name, passwordHash } });

    await bootstrapUser(user.id);
    const token = await issueAuthToken(user.id, 'EMAIL_VERIFY');
    await sendVerificationEmail(user.email, token);
    await audit('signup_password', { userId: user.id, ip });

    return NextResponse.json(GENERIC_OK);
  } catch (error) {
    return apiError(error);
  }
}
