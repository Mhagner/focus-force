import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { HttpError } from '@/lib/auth/require-user';

/** Converte qualquer erro em resposta JSON sem vazar detalhes internos (Prisma, stack, SQL). */
export function apiError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: 'Dados inválidos.',
        issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      },
      { status: 400 }
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2025: registro inexistente (ou de outro usuário, já que os filtros incluem userId).
    if (error.code === 'P2025') return notFound();
    if (error.code === 'P2002') return NextResponse.json({ message: 'Registro já existe.' }, { status: 409 });
    if (error.code === 'P2003') return NextResponse.json({ message: 'Referência inválida.' }, { status: 400 });
  }
  console.error('[api] erro não tratado', error);
  return NextResponse.json({ message: 'Erro interno. Tente novamente.' }, { status: 500 });
}

export function notFound() {
  return NextResponse.json({ message: 'Não encontrado.' }, { status: 404 });
}
