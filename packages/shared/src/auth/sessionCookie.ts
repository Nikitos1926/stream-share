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
