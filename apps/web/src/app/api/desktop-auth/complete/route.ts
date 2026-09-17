import { auth } from '@/lib/auth/auth';
import {
  decodeHandoffRequest,
  encodeHandoffCode,
  HANDOFF_COOKIE,
  loopbackUrl,
} from '@/lib/auth/desktopHandoff';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Where Auth.js lands the browser once the Google round trip is done. Issues the
 * one-time hand-off code and bounces the browser to the desktop app's loopback
 * listener, which closes the tab's usefulness right there — the app takes over.
 *
 * Every failure still redirects to the loopback when a request cookie is
 * present, so the app reports the problem instead of waiting for its timeout.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(HANDOFF_COOKIE)?.value;
  const request = raw ? await decodeHandoffRequest(raw) : null;
  if (raw) cookieStore.delete({ name: HANDOFF_COOKIE, path: '/api/desktop-auth' });

  if (!request) {
    // Nothing to hand back to — an expired or hijacked link. Behave like a
    // normal browser visit.
    return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  }

  const session = await auth();
  if (!session?.user?.id || session.user.role === 'guest') {
    return NextResponse.redirect(loopbackUrl(request, { error: 'access_denied' }));
  }

  const code = await encodeHandoffCode(session.user.id, request.challenge);
  return NextResponse.redirect(loopbackUrl(request, { code }));
}
