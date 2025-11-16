import { NextResponse, type NextRequest } from 'next/server';

// Lightweight middleware that checks for NextAuth session cookie without importing
// server-only auth modules (avoids bundling Prisma into the edge runtime).
const PUBLIC_ROUTES = ['/login'];

export default function middleware(request: NextRequest) {
  const req = request;
  const { pathname } = req.nextUrl;

  // allow the auth API routes through
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check common NextAuth cookie names (secure and non-secure).
  const sessionCookie = req.cookies.get('__Secure-next-auth.session-token') ?? req.cookies.get('next-auth.session-token');
  const isAuthenticated = Boolean(sessionCookie && sessionCookie.value);

  if (isPublicRoute) {
    if (isAuthenticated) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/';
      redirectUrl.searchParams.delete('from');
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.next();
  }

  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api')) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
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
