import { NextResponse } from 'next/server';

import { auth } from '@/auth';

const PUBLIC_ROUTES = ['/login'];

export default auth((request) => {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    if (request.auth) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/';
      redirectUrl.searchParams.delete('from');
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  if (request.auth) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';

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
