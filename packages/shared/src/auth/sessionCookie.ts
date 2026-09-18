/**
 * The Auth.js session cookie, as both surfaces that touch it must see it.
 *
 * The web app issues the cookie (apps/web/src/lib/auth/auth.ts) and the
 * signaling server verifies it without running Auth.js
 * (apps/signaling/src/auth/jwt.ts) — and for @auth/core the cookie *name is the
 * JWT salt*, so a name the two sides disagree on does not fail loudly: the token
 * simply never decodes and every WebSocket/REST call is a 401. That is why the
 * name and the `Secure` decision live here, in one module both import, instead
 * of being spelled out twice.
 *
 * The decision is `NODE_ENV`, not the request or the configured origin. @auth/core
 * would otherwise default `useSecureCookies` to `url.protocol === 'https:'`
 * (lib/init.js), i.e. to whether `AUTH_URL` happens to be set on a deployment
 * where Caddy terminates TLS and proxies plain HTTP — an unset `AUTH_URL` would
 * silently downgrade the cookie to a name signaling does not read. Reading the
 * same variable on both sides makes them agree by construction; the production
 * origin is required to be https in the web env schema so the flag cannot lock
 * the app out (apps/web/src/lib/env/server.ts).
 */

/** Auth.js's own name for the cookie, without the prefix. */
export const AUTHJS_SESSION_COOKIE = 'authjs.session-token';

/**
 * Whether cookies get the `__Secure-`/`__Host-` prefix convention and the
 * `Secure` attribute. False in development, where sign-in happens over
 * http://localhost.
 */
export const useSecureAuthCookies: boolean = process.env.NODE_ENV === 'production';

/**
 * A `Secure` cookie must be named `__Secure-*` to be worth anything — the prefix
 * is what stops a plain-http origin on the same site from overwriting it.
 */
export const sessionCookieName = (secure: boolean): string =>
  `${secure ? '__Secure-' : ''}${AUTHJS_SESSION_COOKIE}`;

/** The name in use in this process. */
export const SESSION_COOKIE_NAME: string = sessionCookieName(useSecureAuthCookies);
