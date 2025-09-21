import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ACCESS_COOKIE_MAX_AGE, ACCESS_COOKIE_NAME } from '@/lib/auth';

const loginSchema = z.object({
  code: z.string().min(6).max(6),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Código de acesso inválido. Verifique e tente novamente.' },
      { status: 400 }
    );
  }

  const accessCode = process.env.ACCESS_CODE;

  if (!accessCode) {
    return NextResponse.json(
      { message: 'Código de acesso não configurado no servidor.' },
      { status: 500 }
    );
  }

  if (parsed.data.code !== accessCode) {
    return NextResponse.json(
      { message: 'Código de acesso incorreto.' },
      { status: 401 }
    );
  }

  cookies().set({
    name: ACCESS_COOKIE_NAME,
    value: 'granted',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ACCESS_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ success: true });
}
