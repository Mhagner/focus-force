import { PrismaAdapter } from '@auth/prisma-adapter';
import type { Adapter, AdapterAccount } from 'next-auth/adapters';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { z } from 'zod';

import { authConfig } from '@/auth.config';
import { audit } from '@/lib/auth/audit';
import { bootstrapUser } from '@/lib/auth/bootstrap';
import { verifyPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

const baseAdapter = PrismaAdapter(prisma);

// Não persistimos tokens do Google (não usamos a API deles); guardamos só o vínculo.
const adapter: Adapter = {
  ...baseAdapter,
  linkAccount: (data: AdapterAccount) => {
    const { access_token, refresh_token, id_token, ...safe } = data;
    void access_token;
    void refresh_token;
    void id_token;
    return baseAdapter.linkAccount!(safe as AdapterAccount);
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
      // Seguro porque o signIn callback abaixo só aceita e-mails verificados pelo Google.
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const ip = getClientIp(request.headers);
        const [byIp, byEmail] = await Promise.all([
          rateLimit(`login:ip:${ip}`, 30, 15 * 60),
          rateLimit(`login:email:${email}`, 8, 15 * 60),
        ]);
        if (!byIp.ok || !byEmail.ok) {
          await audit('login_rate_limited', { ip });
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        // Sempre roda o bcrypt (hash falso se o usuário não existe) para não vazar existência por tempo.
        const passwordOk = await verifyPassword(password, user?.passwordHash);

        if (!user || !passwordOk || !user.emailVerified || user.deletedAt) {
          await audit('login_failed', { userId: user?.id, ip });
          return null;
        }

        await audit('login', { userId: user.id, ip });
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true;

      const email = profile?.email?.toLowerCase();
      if (!email || profile?.email_verified !== true) return false;

      // Anti pre-hijacking: se existia uma conta criada por senha com este e-mail e nunca verificada,
      // quem controla a caixa de entrada (via Google) passa a ser o dono; descartamos a senha antiga
      // e invalidamos sessões.
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && !existing.emailVerified) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash: null, tokenVersion: { increment: 1 }, emailVerified: new Date() },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        const row = await prisma.user.findUnique({ where: { id: user.id }, select: { tokenVersion: true } });
        token.tv = row?.tokenVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) {
        session.user.id = token.uid as string;
      }
      session.tv = (token.tv as number | undefined) ?? 0;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      // Usuários criados via Google chegam sem emailVerified quando o provider não informa.
      await prisma.user.updateMany({
        where: { id: user.id, emailVerified: null },
        data: { emailVerified: new Date() },
      });
      await bootstrapUser(user.id);
      await audit('signup_google', { userId: user.id });
    },
    async linkAccount({ user }) {
      if (user.id) await audit('link_google', { userId: user.id });
    },
  },
});
