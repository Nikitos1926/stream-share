import { signIn, signOut } from '@/lib/auth/auth';
import {
  encodeHandoffRequest,
  handoffRequestSchema,
  HANDOFF_COMPLETE_PATH,
  HANDOFF_COOKIE,
  REQUEST_TTL_SECONDS,
} from '@/lib/auth/desktopHandoff';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Entry point of the desktop sign-in flow, opened in the user's default browser
 * by the Electron shell (apps/desktop/src/main/googleAuth.ts).
 *
 * It parks the app's loopback port and PKCE challenge in a signed cookie and
 * then starts the ordinary Auth.js Google flow, so this browser sees exactly the
 * account chooser a web visitor sees. `/api/desktop-auth/complete` picks the
 * cookie back up afterwards.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const parsed = handoffRequestSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return new NextResponse('Invalid desktop sign-in request.', { status: 400 });
  }

  // Clear any session this browser already has, so Google is reached with a
  // clean slate and the chooser is not skipped — same reason the web login
  // action does it (src/app/(auth)/login/actions.ts). Must run before the
  // hand-off cookie is written: signOut() rewrites the cookie jar.
  await signOut({ redirect: false });

  const cookieStore = await cookies();
  cookieStore.set(HANDOFF_COOKIE, await encodeHandoffRequest(parsed.data), {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
    path: '/api/desktop-auth',
    maxAge: REQUEST_TTL_SECONDS,
  });

  // Always redirects (to accounts.google.com), carrying the Set-Cookie headers
  // accumulated above.
  await signIn('google', { redirectTo: HANDOFF_COMPLETE_PATH });

  return new NextResponse('Could not start the Google sign-in flow.', { status: 500 });
}
