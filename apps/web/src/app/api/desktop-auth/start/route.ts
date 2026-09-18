import { signIn, signOut } from '@/lib/auth/auth';
import {
  encodeHandoffRequest,
  handoffRequestSchema,
  HANDOFF_COMPLETE_PATH,
  HANDOFF_COOKIE,
  HANDOFF_COOKIE_PATH,
  isSecureOrigin,
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
  //
  // `redirectTo` is not cosmetic here, it is what makes the flow work on *every*
  // attempt. Where the browser goes after Google is decided by the
  // `authjs.callback-url` cookie, and @auth/core only re-sets that cookie when
  // the new value differs from the one on the *incoming request* — next-auth's
  // server-side signIn/signOut both build their internal request from the
  // request headers, not from the response jar they are writing to
  // (next-auth/lib/actions.js). Left at its default, signOut() writes
  // `<origin>/` here; on every second attempt — the one whose browser still
  // carries the completion URL from the attempt before — signIn() then finds
  // the incoming cookie already equal to its own callback URL, writes nothing,
  // and signOut's `<origin>/` survives. Google's callback then lands the browser
  // on the home page, signed in, while the desktop app waits for a callback that
  // never comes. Pointing both calls at the same URL makes the result identical
  // whichever of them ends up writing the cookie.
  await signOut({ redirect: false, redirectTo: HANDOFF_COMPLETE_PATH });

  const cookieStore = await cookies();
  cookieStore.set(HANDOFF_COOKIE, await encodeHandoffRequest(parsed.data), {
    httpOnly: true,
    sameSite: 'lax',
    // Not `req.nextUrl.protocol`: in production Caddy terminates TLS and talks
    // plain HTTP to this app (infra/caddy/Caddyfile), so the request protocol is
    // `http:` on an https deployment and the flag would never be set.
    secure: isSecureOrigin(req),
    path: HANDOFF_COOKIE_PATH,
    maxAge: REQUEST_TTL_SECONDS,
  });

  // Always redirects (to accounts.google.com), carrying the Set-Cookie headers
  // accumulated above.
  await signIn('google', { redirectTo: HANDOFF_COMPLETE_PATH });

  return new NextResponse('Could not start the Google sign-in flow.', { status: 500 });
}
