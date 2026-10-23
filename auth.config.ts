import type { NextAuthConfig } from 'next-auth';

/**
 * Config leve, segura para o runtime Edge (middleware): sem Prisma nem bcrypt.
 * Providers e callbacks que tocam o banco ficam em auth.ts.
 */
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  providers: [],
} satisfies NextAuthConfig;
