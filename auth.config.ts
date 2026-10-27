import type { NextAuthConfig } from 'next-auth';

// Variáveis sem as quais o Auth.js falha. O erro da tela ("problem with the server configuration")
// é genérico, então registramos aqui, nos logs do servidor, o NOME de cada variável ausente (nunca o valor).
const REQUIRED_ENV = ['AUTH_SECRET'] as const;
const missing = REQUIRED_ENV.filter((name) => !process.env[name] && !(name === 'AUTH_SECRET' && process.env.NEXTAUTH_SECRET));
if (missing.length > 0) {
  console.error(`[auth] variáveis de ambiente ausentes: ${missing.join(', ')}. Defina-as no ambiente de produção e faça um novo deploy.`);
}

/**
 * Config leve, segura para o runtime Edge (middleware): sem Prisma nem bcrypt.
 * Providers e callbacks que tocam o banco ficam em auth.ts.
 */
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  providers: [],
  // Fora da Vercel o Auth.js recusa o host ("UntrustedHost") se isso não estiver ligado. Com AUTH_URL definida,
  // as URLs são montadas a partir dela (não do cabeçalho Host), então é seguro confiar no host.
  trustHost: Boolean(process.env.AUTH_URL || process.env.AUTH_TRUST_HOST === 'true' || process.env.VERCEL),
} satisfies NextAuthConfig;
