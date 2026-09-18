import { auth } from '@/lib/auth/auth';
import {
  decodeHandoffRequest,
  encodeHandoffCode,
  HANDOFF_COOKIE,
  HANDOFF_COOKIE_PATH,
  HANDOFF_RETURN_PATH,
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
 * Without one there is nobody to answer, so the browser gets a page telling the
 * user to go back to the app — never a silent bounce onto a signed-in home page,
 * which is how the alternating-attempt bug in ../start/route.ts presented.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(HANDOFF_COOKIE)?.value;
  const request = raw ? await decodeHandoffRequest(raw) : null;
  if (raw) cookieStore.delete({ name: HANDOFF_COOKIE, path: HANDOFF_COOKIE_PATH });

  if (!request) {
    // An expired link, the second tab of a double-started flow, or a browser
    // that got here after the app had already given up.
    return NextResponse.redirect(new URL(HANDOFF_RETURN_PATH, req.nextUrl.origin));
  }

  const session = await auth();
  if (!session?.user?.id || session.user.role === 'guest') {
    return NextResponse.redirect(loopbackUrl(request, { error: 'access_denied' }));
  }

  const code = await encodeHandoffCode(session.user.id, request.challenge);
  return NextResponse.redirect(loopbackUrl(request, { code }));
}
