import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';

import { authConfig } from '@/auth.config';

// Instância leve (Edge): só decodifica o JWT da sessão. A autorização real
// (usuário existe, sessão não invalidada, dono do recurso) é feita em requireUser().
const { auth } = NextAuth(authConfig);

const PUBLIC_PAGES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
const PUBLIC_API_PREFIX = '/api/auth/';
// Páginas de auth que não fazem sentido para quem já está logado.
const GUEST_ONLY_PAGES = ['/login', '/register', '/forgot-password'];

const matchesRoute = (pathname: string, routes: string[]) =>
  routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth);
  const isApiRoute = pathname.startsWith('/api');

  if (pathname.startsWith(PUBLIC_API_PREFIX) || request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  if (matchesRoute(pathname, PUBLIC_PAGES)) {
    if (isLoggedIn && matchesRoute(pathname, GUEST_ONLY_PAGES)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/';
      redirectUrl.search = '';
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  if (isLoggedIn) {
    return NextResponse.next();
  }

  if (isApiRoute) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  if (pathname && pathname !== '/') {
    loginUrl.searchParams.set('from', pathname);
  }
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|site.webmanifest|manifest.json|sitemap.xml|.*\\..*$).*)',
  ],
};
