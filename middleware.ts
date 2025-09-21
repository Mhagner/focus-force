import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { ACCESS_COOKIE_NAME } from '@/lib/auth';

const PUBLIC_ROUTES = ['/login'];
const AUTH_API_ROUTES = ['/api/auth/login', '/api/auth/logout'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasAccessCookie = Boolean(request.cookies.get(ACCESS_COOKIE_NAME));
  const isLoginRoute = PUBLIC_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAuthApiRoute = AUTH_API_ROUTES.some((route) => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith('/api');

  if (isLoginRoute) {
    if (hasAccessCookie) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/';
      redirectUrl.searchParams.delete('from');
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  if (isAuthApiRoute || request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  if (hasAccessCookie) {
    return NextResponse.next();
  }

  if (isApiRoute) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';

  if (pathname && pathname !== '/') {
    loginUrl.searchParams.set('from', pathname);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|site.webmanifest|manifest.json|sitemap.xml|.*\\..*$).*)',
  ],
};
