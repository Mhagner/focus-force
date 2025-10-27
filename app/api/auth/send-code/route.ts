import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';

import {
  generateVerificationCode,
  hashVerificationCode,
  normalizeEmail,
  MAGIC_LINK_EXPIRATION_MINUTES,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ message: 'E-mail inválido.' }, { status: 400 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !resendFrom) {
    return NextResponse.json(
      {
        message: 'Serviço de e-mail não configurado corretamente no servidor.',
      },
      { status: 500 }
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const code = generateVerificationCode();
  const hashedCode = hashVerificationCode(email, code);
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRATION_MINUTES * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashedCode,
      expires: expiresAt,
    },
  });

  const resend = new Resend(resendApiKey);

  try {
    await resend.emails.send({
      from: resendFrom,
      to: email,
      subject: 'Seu código de acesso FocusForge',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h1 style="color: #111827;">Código de acesso</h1>
          <p>Use o código abaixo para entrar na sua conta FocusForge.</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 8px;">${code}</p>
          <p style="color: #6b7280;">Este código expira em ${MAGIC_LINK_EXPIRATION_MINUTES} minutos.</p>
        </div>
      `,
    });
  } catch (error) {
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    return NextResponse.json(
      { message: 'Não foi possível enviar o e-mail com o código de acesso.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
