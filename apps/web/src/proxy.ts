import { auth } from '@/lib/auth/auth';
import { HANDOFF_RETURN_PATH } from '@/lib/auth/desktopHandoff';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const proxy = auth((req) => {
  const isLoggedIn = !!req.auth && req.auth.user.role !== 'guest';
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');
  const isHomePage = req.nextUrl.pathname === '/';
  // Tells a browser that a desktop sign-in ended here to go back to the app. It
  // is reached both signed in and signed out, so it stays public.
  const isDesktopReturnPage = req.nextUrl.pathname === HANDOFF_RETURN_PATH;
  if (!isLoggedIn && !isAuthPage && !isHomePage && !isDesktopReturnPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }
});

export default proxy as (req: NextRequest) => Promise<NextResponse>;

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$|.*\\.ico$|.*\\.js$|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/watch).*)',
  ],
};
