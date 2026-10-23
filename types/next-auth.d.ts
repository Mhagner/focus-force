import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
    /** versão do token do usuário; usada para invalidar sessões (troca de senha). */
    tv: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    tv?: number;
  }
}
