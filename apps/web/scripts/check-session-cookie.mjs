/**
 * Checks the cookie policy the app signs users in with: in production the
 * session cookie must be `__Secure-` prefixed and carry `Secure`, in development
 * (http://localhost) neither, and in both cases it stays `HttpOnly` and
 * `SameSite=Lax` so the Google callback and the desktop hand-off still send it.
 *
 * It runs the *real* @auth/core against the *real* policy module
 * (@stream-share/shared/auth, which is also where signaling reads the cookie
 * name from), so what is asserted is the library's own Set-Cookie header rather
 * than our reading of it. The provider and callbacks are a stub — those are not
 * what decides cookie attributes; `useSecureCookies` and `cookies.sessionToken`
 * in src/lib/auth/auth.ts are, and this mirrors them.
 *
 * Needs the workspace libraries built (`pnpm build` / `pnpm dev:lib`), because it
 * imports @stream-share/shared's dist.
 *
 * Run: `pnpm --filter @stream-share/web check:session-cookie`
 */

import { Auth, skipCSRFCheck } from '@auth/core';
import Credentials from '@auth/core/providers/credentials';
import { AUTHJS_SESSION_COOKIE, sessionCookieName } from '@stream-share/shared';

const SECRET = 'check-session-cookie-secret-0123456789abcdef';

/** src/lib/auth/auth.ts, reduced to what decides cookies. */
const authConfig = (secure) => ({
  secret: SECRET,
  trustHost: true,
  basePath: '/api/auth',
  session: { strategy: 'jwt' },
  useSecureCookies: secure,
  cookies: {
    sessionToken: {
      name: sessionCookieName(secure),
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure },
    },
  },
  providers: [
    Credentials({
      id: 'guest',
      credentials: { userId: { type: 'text' } },
      authorize: () => ({ id: 'guest-1', name: 'Guest', role: 'guest' }),
    }),
  ],
});

/** Signs in and returns the Set-Cookie lines, parsed into name + attributes. */
async function signIn(origin, secure) {
  const response = await Auth(
    new Request(`${origin}/api/auth/callback/guest`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ userId: 'guest-1' }),
    }),
    { ...authConfig(secure), skipCSRFCheck },
  );

  return response.headers.getSetCookie().map((line) => {
    const [pair, ...attrs] = line.split(';');
    const flags = attrs.map((attr) => attr.trim());
    return {
      name: pair.slice(0, pair.indexOf('=')),
      value: pair.slice(pair.indexOf('=') + 1),
      has: (flag) => flags.some((f) => f.toLowerCase() === flag.toLowerCase()),
      attr: (key) =>
        flags.find((f) => f.toLowerCase().startsWith(`${key.toLowerCase()}=`))?.split('=')[1],
    };
  });
}

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`);
};

/* ------------------------------------------------------- production policy */
{
  const cookies = await signIn('https://streamshare.example', true);
  const session = cookies.find((c) => c.name.endsWith(AUTHJS_SESSION_COOKIE));

  check('production: a session cookie is set', !!session?.value, JSON.stringify(cookies));
  check(
    'production: it is the name signaling reads',
    session?.name === sessionCookieName(true),
    `got ${session?.name}, expected ${sessionCookieName(true)}`,
  );
  check('production: Secure', !!session?.has('Secure'));
  check('production: HttpOnly', !!session?.has('HttpOnly'));
  check('production: SameSite=Lax', session?.attr('SameSite')?.toLowerCase() === 'lax');
  check('production: Path=/', session?.attr('Path') === '/');
  // A `__Secure-` name without the attribute is refused by the browser outright.
  check(
    'production: every cookie the flow sets is Secure',
    cookies.every((c) => c.has('Secure')),
    cookies
      .filter((c) => !c.has('Secure'))
      .map((c) => c.name)
      .join(', '),
  );
}

/* ------------------------------------------------------ development policy */
{
  const cookies = await signIn('http://localhost:3000', false);
  const session = cookies.find((c) => c.name.endsWith(AUTHJS_SESSION_COOKIE));

  check('development: a session cookie is set', !!session?.value, JSON.stringify(cookies));
  check(
    'development: unprefixed name',
    session?.name === sessionCookieName(false),
    `got ${session?.name}, expected ${sessionCookieName(false)}`,
  );
  // http://localhost must keep working, so nothing may be Secure-only here.
  check(
    'development: nothing is Secure',
    cookies.every((c) => !c.has('Secure')),
    cookies
      .filter((c) => c.has('Secure'))
      .map((c) => c.name)
      .join(', '),
  );
  check('development: HttpOnly', !!session?.has('HttpOnly'));
  check('development: SameSite=Lax', session?.attr('SameSite')?.toLowerCase() === 'lax');
}

const failures = results.filter((ok) => !ok).length;
console.log(
  failures
    ? `\n${failures}/${results.length} checks failed.`
    : `\nAll ${results.length} checks OK.`,
);
process.exit(failures ? 1 : 0);
