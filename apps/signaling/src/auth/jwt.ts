import { decode, JWT } from '@auth/core/jwt';
import { env } from '@stream-share/env/signaling';
import { SESSION_COOKIE_NAME } from '@stream-share/shared';

/**
 * @auth/core derives a token's key from secret + salt, and for the session
 * cookie the salt *is* the cookie name — so this is both the cookie to read and
 * the salt to decode it with. The name comes from the shared policy the web app
 * issues it under (packages/shared/src/auth/sessionCookie.ts) rather than being
 * spelled out a second time: the two must agree or every request is a 401.
 */
export const NEXT_AUTH_SALT = SESSION_COOKIE_NAME;

export async function decodeAuthToken(rawToken: string): Promise<JWT | null> {
  const payload = await decode({
    salt: NEXT_AUTH_SALT,
    secret: env.AUTH_SECRET,
    token: rawToken,
  });

  if (!payload?.sub) return null;
  return payload;
}
