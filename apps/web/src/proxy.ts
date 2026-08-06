import { auth } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const proxy = auth((req) => {
  const isLoggedIn = !!req.auth && req.auth.user.role !== 'guest';
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');
  const isHomePage = req.nextUrl.pathname === '/';
  if (!isLoggedIn && !isAuthPage && !isHomePage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }
});

export default proxy as (req: NextRequest) => Promise<NextResponse>;

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.ico$|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/watch).*)',
  ],
};
