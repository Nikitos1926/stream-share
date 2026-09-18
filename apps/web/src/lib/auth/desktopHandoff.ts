import 'server-only';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { decode, encode, type JWT } from '@auth/core/jwt';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { env } from '../env/server';

/**
 * Server half of the desktop "sign in through the system browser" hand-off.
 *
 * The Electron shell never talks to Google itself: it opens
 * `/api/desktop-auth/start` in the default browser, the browser runs the ordinary
 * Auth.js Google flow, and `/api/desktop-auth/complete` hands a short-lived code
 * back to a loopback listener the app started. The app then redeems that code
 * through the `desktop` credentials provider *from inside the Electron window*,
 * so Auth.js writes its session cookie into the Electron cookie jar — which is
 * what the signaling server authenticates against (apps/signaling/src/auth/jwt.ts).
 *
 * Consequences worth knowing before changing anything here:
 * - the Google redirect URI stays `<origin>/api/auth/callback/google`, so nothing
 *   new has to be registered in the Google Cloud console;
 * - the client secret never leaves the web server;
 * - the code is bound to a PKCE challenge, so a code leaked out of the loopback
 *   URL is useless without the verifier, which never leaves the desktop process.
 */

/**
 * Salts are the domain separation between token kinds: `@auth/core`'s `encode`
 * derives its key from secret + salt, so a session token can never be decoded as
 * a hand-off code, nor a hand-off request as a code.
 */
const REQUEST_SALT = 'stream-share.desktop-auth.request';
const CODE_SALT = 'stream-share.desktop-auth.code';

/** Name of the cookie carrying the request across the Google round trip. */
export const HANDOFF_COOKIE = 'stream-share.desktop-auth';

/** Scope of that cookie. Setting and clearing it must use the same path. */
export const HANDOFF_COOKIE_PATH = '/api/desktop-auth';

/** Long enough for a real person to pick an account (and sign in to Google first). */
export const REQUEST_TTL_SECONDS = 15 * 60;

/** The desktop app redeems the code immediately; minutes would only widen the window. */
export const CODE_TTL_SECONDS = 120;

/** Where Auth.js returns to once the browser has completed the Google flow. */
export const HANDOFF_COMPLETE_PATH = '/api/desktop-auth/complete';

/**
 * Page shown to a browser that reached the end of a desktop flow it can no
 * longer hand back — it tells the user to go to the app instead of leaving them
 * on a signed-in page wondering why the app is still waiting.
 */
export const HANDOFF_RETURN_PATH = '/desktop-auth';

const base64url = /^[A-Za-z0-9_-]+$/;

/**
 * Everything the desktop app is allowed to influence. It passes a port, not a
 * redirect URI: the callback URL is rebuilt here from a hardcoded loopback host
 * and path, so the parameter cannot be turned into an open redirect.
 */
export const handoffRequestSchema = z.object({
  port: z.coerce.number().int().min(1024).max(65535),
  state: z.string().regex(base64url).min(16).max(128),
  challenge: z.string().regex(base64url).length(43),
});

export type HandoffRequest = z.infer<typeof handoffRequestSchema>;

const handoffCodeSchema = z.object({
  jti: z.string().min(1),
  sub: z.string().min(1),
  challenge: z.string().regex(base64url).length(43),
});

/**
 * `JWT` is augmented app-wide with a required `role` (src/next-auth.d.ts), but
 * `encode`/`decode` only ever treat the payload as an opaque record. These two
 * casts keep that augmentation from leaking into hand-off payloads, which are
 * validated by zod on the way out instead.
 */
const asJwt = (payload: Record<string, unknown>) => payload as unknown as JWT;

export const encodeHandoffRequest = (request: HandoffRequest) =>
  encode({
    token: asJwt(request),
    secret: env.AUTH_SECRET,
    salt: REQUEST_SALT,
    maxAge: REQUEST_TTL_SECONDS,
  });

export async function decodeHandoffRequest(token: string): Promise<HandoffRequest | null> {
  const payload = await decode({ token, secret: env.AUTH_SECRET, salt: REQUEST_SALT }).catch(
    () => null,
  );
  const parsed = handoffRequestSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export const encodeHandoffCode = (userId: string, challenge: string) =>
  encode({
    token: asJwt({ jti: randomUUID(), sub: userId, challenge }),
    secret: env.AUTH_SECRET,
    salt: CODE_SALT,
    maxAge: CODE_TTL_SECONDS,
  });

/**
 * Best-effort single use. The code is already bound to the PKCE challenge and
 * expires in {@link CODE_TTL_SECONDS}, so this only closes the replay window for
 * a code that leaked from the loopback URL within those two minutes. It is
 * per-process on purpose: a shared store would be the only way to make it
 * airtight across replicas, and that is not worth a table for a two-minute code.
 */
const redeemed = new Map<string, number>();

function claim(jti: string): boolean {
  const now = Date.now();
  for (const [id, expiresAt] of redeemed) {
    if (expiresAt <= now) redeemed.delete(id);
  }
  if (redeemed.has(jti)) return false;
  redeemed.set(jti, now + CODE_TTL_SECONDS * 1000);
  return true;
}

/**
 * Verifies a hand-off code against the PKCE verifier that produced its challenge
 * and marks it used. Returns the user id it was issued for, or null.
 */
export async function redeemHandoffCode(token: string, verifier: string): Promise<string | null> {
  const payload = await decode({ token, secret: env.AUTH_SECRET, salt: CODE_SALT }).catch(
    () => null,
  );
  const parsed = handoffCodeSchema.safeParse(payload);
  if (!parsed.success) return null;

  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const expected = Buffer.from(parsed.data.challenge);
  const actual = Buffer.from(challenge);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return claim(parsed.data.jti) ? parsed.data.sub : null;
}

/**
 * Whether the browser is talking to this app over https, as opposed to whether
 * *this process* was reached over https: in production Caddy terminates TLS and
 * proxies plain HTTP (infra/caddy/Caddyfile), so the incoming protocol is always
 * `http:` there. The configured public origin is the authority when there is one
 * (compose sets `AUTH_URL`); the proxy's `x-forwarded-proto` is the fallback,
 * and only a direct request decides for itself.
 */
export function isSecureOrigin(req: NextRequest): boolean {
  if (env.AUTH_URL) return new URL(env.AUTH_URL).protocol === 'https:';

  const forwarded = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  if (forwarded) return forwarded.toLowerCase() === 'https';

  return req.nextUrl.protocol === 'https:';
}

/** The loopback URL the desktop app is listening on. Never taken from the request. */
export function loopbackUrl(
  request: HandoffRequest,
  params: Record<string, string | undefined>,
): string {
  const url = new URL(`http://127.0.0.1:${request.port}/callback`);
  url.searchParams.set('state', request.state);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
}
