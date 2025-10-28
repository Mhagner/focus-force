import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { hashVerificationCode, normalizeEmail } from '@/lib/auth';

const credentialsSchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
});

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      id: 'magic-link',
      name: 'Código por e-mail',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code: { label: 'Código', type: 'text' },
      },
      async authorize(credentials) {
        try {
          const parsed = credentialsSchema.safeParse(credentials);

          if (!parsed.success) {
            return null;
          }

          const email = normalizeEmail(parsed.data.email);
          const code = parsed.data.code;
          const hashedCode = hashVerificationCode(email, code);
          const now = new Date();

          const storedToken = await prisma.verificationToken.findFirst({
            where: {
              identifier: email,
              expires: {
                gt: now,
              },
            },
            orderBy: {
              expires: 'desc',
            },
          });

          if (!storedToken || storedToken.token !== hashedCode) {
            throw new Error('Código inválido ou expirado.');
          }

          await prisma.verificationToken.deleteMany({ where: { identifier: email } });

          const user = await prisma.user.upsert({
            where: { email },
            update: { emailVerified: new Date() },
            create: {
              email,
              emailVerified: new Date(),
            },
          });

          return user;
        } catch (err) {
          // Log unexpected errors server-side to help debugging (do not log codes)
          // eslint-disable-next-line no-console
          console.error('magic-link authorize error:', err);
          throw err;
        }
      },
    }),
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        if (user) {
          session.user.id = user.id;
          session.user.email = user.email ?? session.user.email;
          session.user.name = user.name ?? session.user.name;
        } else if (session.user.email) {
          const existingUser = await prisma.user.findUnique({
            where: { email: normalizeEmail(session.user.email) },
          });

          if (existingUser) {
            session.user.id = existingUser.id;
            session.user.email = existingUser.email ?? session.user.email;
            session.user.name = existingUser.name ?? session.user.name;
          }
        }
      }

      return session;
    },
  },
  trustHost: true,
});
