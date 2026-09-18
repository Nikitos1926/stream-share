/**
 * Deterministic harness for the desktop sign-in hand-off, with the Google leg
 * stubbed out (see src/lib/auth/desktopHandoff.ts and
 * src/app/api/desktop-auth/*).
 *
 * It exists because the flow failed on *every second attempt* and nothing but a
 * repeated run shows that: it drives the whole browser leg N times against one
 * cookie jar — stub account chooser, Auth.js callback, /api/desktop-auth/complete,
 * loopback listener — and fails if any attempt does not reach the listener with
 * a code.
 *
 * Run: `pnpm --filter @stream-share/web check:desktop-auth [--attempts 6] [--legacy]`
 * `--legacy` restores the pre-fix /start (signOut() without an explicit
 * redirectTo), which is the regression itself: it must fail on attempts 2, 4, 6.
 *
 * Deliberately not the real route handlers: those need next/headers, a Next
 * server, Postgres and a real Google client. This models /start and /complete
 * (and next-auth's server-side signIn/signOut, which is where the bug lives)
 * around the *real* @auth/core, so the cookie arithmetic under test is the
 * library's own.
 */

import { Auth, raw, skipCSRFCheck } from '@auth/core';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { encode, decode } from '@auth/core/jwt';

const args = process.argv.slice(2);
const legacy = args.includes('--legacy');
const attempts = Number(args[args.indexOf('--attempts') + 1]) || 6;

const SECRET = 'desktop-auth-flow-check-secret-0123456789abcdef';
const HANDOFF_COOKIE = 'stream-share.desktop-auth';
const HANDOFF_COMPLETE_PATH = '/api/desktop-auth/complete';
const HANDOFF_RETURN_PATH = '/desktop-auth';
const REQUEST_SALT = 'stream-share.desktop-auth.request';
const CODE_SALT = 'stream-share.desktop-auth.code';

const listen = async (server) => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
};

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'text/plain', ...headers });
  res.end(body);
};

/* -------------------------------------------------------------- stub Google */

const googleServer = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/authorize') {
    const back = new URL(url.searchParams.get('redirect_uri'));
    back.searchParams.set('code', 'stub-authorization-code');
    back.searchParams.set('state', url.searchParams.get('state'));
    send(res, 302, '', { location: back.toString() });
    return;
  }
  if (url.pathname === '/token') {
    send(res, 200, JSON.stringify({ access_token: 'stub-access-token', token_type: 'bearer' }), {
      'content-type': 'application/json',
    });
    return;
  }
  if (url.pathname === '/userinfo') {
    send(res, 200, JSON.stringify({ sub: 'stub-user', name: 'Stub User', email: 'stub@example' }), {
      'content-type': 'application/json',
    });
    return;
  }
  send(res, 404, 'not found');
});

/* ------------------------------------------------------------- the web app */

const googlePort = await listen(googleServer);
const GOOGLE = `http://127.0.0.1:${googlePort}`;

const authConfig = {
  secret: SECRET,
  trustHost: true,
  basePath: '/api/auth',
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    {
      id: 'google',
      name: 'Google',
      type: 'oauth',
      clientId: 'stub-client-id',
      clientSecret: 'stub-client-secret',
      authorization: { url: `${GOOGLE}/authorize`, params: { prompt: 'select_account' } },
      token: `${GOOGLE}/token`,
      userinfo: `${GOOGLE}/userinfo`,
      checks: ['pkce', 'state'],
      profile: (p) => ({ id: p.sub, name: p.name, email: p.email, role: 'user' }),
    },
  ],
  callbacks: {
    jwt: ({ token, user }) => (user ? { ...token, role: user.role } : token),
    session: ({ session, token }) => ({
      ...session,
      user: { ...session.user, id: token.sub, role: token.role },
    }),
  },
};

/**
 * next-auth's server-side signIn/signOut (next-auth/lib/actions.js), verbatim in
 * the part that matters: both build their internal request from the *incoming*
 * request headers, and both write their response cookies into the response jar.
 */
async function serverAction(action, incoming, jar, { provider, redirectTo } = {}) {
  const headers = new Headers(incoming.headers);
  headers.set('content-type', 'application/x-www-form-urlencoded');
  const callbackUrl = redirectTo ?? headers.get('referer') ?? '/';
  const url = `${incoming.origin}/api/auth/${action}${provider ? `/${provider}` : ''}`;
  const req = new Request(url, {
    method: 'POST',
    headers,
    body: new URLSearchParams({ callbackUrl }),
  });
  const res = await Auth(req, { ...authConfig, raw, skipCSRFCheck });
  for (const c of res.cookies ?? []) jar.set(c.name, { value: c.value, options: c.options });
  return res.redirect;
}

const setCookieHeaders = (jar) =>
  [...jar].map(
    ([name, { value, options }]) =>
      `${name}=${value}; Path=${options?.path ?? '/'}` +
      (options?.expires ? `; Expires=${new Date(options.expires).toUTCString()}` : '') +
      (options?.maxAge !== undefined ? `; Max-Age=${options.maxAge}` : ''),
  );

const appServer = createServer((req, res) => {
  void (async () => {
    const origin = `http://127.0.0.1:${appPort}`;
    const url = new URL(req.url, origin);
    const incoming = { headers: req.headers, origin };
    const jar = new Map();

    // --- /api/desktop-auth/start ------------------------------------------
    if (url.pathname === '/api/desktop-auth/start') {
      // The route clears any session this browser has before starting Google.
      // `redirectTo` is what the fix adds: without it next-auth defaults to "/",
      // and @auth/core then writes authjs.callback-url="<origin>/".
      await serverAction(
        'signout',
        incoming,
        jar,
        legacy ? {} : { redirectTo: HANDOFF_COMPLETE_PATH },
      );

      const request = {
        port: Number(url.searchParams.get('port')),
        state: url.searchParams.get('state'),
        challenge: url.searchParams.get('challenge'),
      };
      jar.set(HANDOFF_COOKIE, {
        value: await encode({ token: request, secret: SECRET, salt: REQUEST_SALT, maxAge: 900 }),
        options: { path: '/api/desktop-auth' },
      });

      const location = await serverAction('signin', incoming, jar, {
        provider: 'google',
        redirectTo: HANDOFF_COMPLETE_PATH,
      });
      send(res, 302, '', { location, 'set-cookie': setCookieHeaders(jar) });
      return;
    }

    // --- /api/desktop-auth/complete ---------------------------------------
    if (url.pathname === HANDOFF_COMPLETE_PATH) {
      const handoff = parseCookies(req.headers.cookie)[HANDOFF_COOKIE];
      const request = handoff
        ? await decode({ token: handoff, secret: SECRET, salt: REQUEST_SALT }).catch(() => null)
        : null;
      const clear = `${HANDOFF_COOKIE}=; Path=/api/desktop-auth; Max-Age=0`;
      if (!request) {
        send(res, 302, '', { location: `${origin}${HANDOFF_RETURN_PATH}`, 'set-cookie': [clear] });
        return;
      }
      const session = await Auth(
        new Request(`${origin}/api/auth/session`, { headers: req.headers }),
        authConfig,
      ).then((r) => r.json());
      const loopback = new URL(`http://127.0.0.1:${request.port}/callback`);
      loopback.searchParams.set('state', request.state);
      if (session?.user?.id) {
        loopback.searchParams.set(
          'code',
          await encode({
            token: { jti: randomUUID(), sub: session.user.id, challenge: request.challenge },
            secret: SECRET,
            salt: CODE_SALT,
            maxAge: 120,
          }),
        );
      } else {
        loopback.searchParams.set('error', 'access_denied');
      }
      send(res, 302, '', { location: loopback.toString(), 'set-cookie': [clear] });
      return;
    }

    // --- Auth.js -----------------------------------------------------------
    if (url.pathname.startsWith('/api/auth/')) {
      const response = await Auth(
        new Request(url, { method: req.method, headers: req.headers }),
        authConfig,
      );
      const headers = Object.fromEntries(response.headers);
      const cookies = response.headers.getSetCookie?.() ?? [];
      delete headers['set-cookie'];
      res.writeHead(response.status, { ...headers, 'set-cookie': cookies });
      res.end(await response.text());
      return;
    }

    // Any other page: the proxy sends a signed-in visitor of /login to "/".
    send(res, 200, `page ${url.pathname}`);
  })();
});

const appPort = await listen(appServer);
const ORIGIN = `http://127.0.0.1:${appPort}`;

/* ------------------------------------------------------------- the browser */

const parseCookies = (header = '') =>
  Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const eq = part.indexOf('=');
        return [part.slice(0, eq), part.slice(eq + 1)];
      }),
  );

/** A cookie jar that only models what this flow depends on: name, value, expiry. */
function makeJar() {
  const jar = new Map();
  return {
    header: () =>
      [...jar]
        .map(([name, value]) => `${name}=${value}`)
        .join('; ')
        .trim(),
    apply: (setCookies) => {
      for (const line of setCookies) {
        const [pair, ...attrs] = line.split(';');
        const eq = pair.indexOf('=');
        const name = pair.slice(0, eq).trim();
        const value = pair.slice(eq + 1);
        const expired = attrs.some((a) => /max-age=0/i.test(a.trim()));
        if (!value || expired) jar.delete(name);
        else jar.set(name, value);
      }
    },
  };
}

/** Follows redirects the way a browser does, carrying the jar. */
async function browse(startUrl, jar) {
  let url = startUrl;
  for (let hop = 0; hop < 20; hop++) {
    const res = await fetch(url, {
      redirect: 'manual',
      headers: jar.header() ? { cookie: jar.header() } : {},
    }).catch(() => null);
    // A loopback listener that is gone: the browser would show a connection
    // error and the attempt is over, which is a result like any other.
    if (!res) return { url, status: 0, body: '' };
    jar.apply(res.headers.getSetCookie());
    const location = res.headers.get('location');
    if (!location) return { url, status: res.status, body: await res.text() };
    url = new URL(location, url).toString();
  }
  throw new Error('too many redirects');
}

/* ------------------------------------------------------------------ the app */

/** The Electron side of one attempt: a loopback listener, like googleAuth.ts. */
async function startAttempt() {
  let settle;
  const callback = new Promise((resolve) => (settle = resolve));
  const state = randomBytes(16).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  const loopback = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    send(res, 200, 'ok');
    if (url.pathname === '/callback' && url.searchParams.get('state') === state) {
      settle({ code: url.searchParams.get('code'), error: url.searchParams.get('error') });
    }
  });
  const port = await listen(loopback);

  const start = new URL('/api/desktop-auth/start', ORIGIN);
  start.searchParams.set('port', String(port));
  start.searchParams.set('state', state);
  start.searchParams.set('challenge', challenge);

  return {
    url: start.toString(),
    close: () => loopback.close(),
    /** What the app got, or null if the browser never came back. */
    result: () =>
      Promise.race([callback, new Promise((resolve) => setTimeout(() => resolve(null), 500))]),
  };
}

/** One full attempt: app starts listening, browser runs the whole leg. */
async function attempt(jar) {
  const app = await startAttempt();
  const landed = await browse(app.url, jar);
  const result = await app.result();
  app.close();
  return { landed, result };
}

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`);
};

// 1. The regression: N consecutive attempts in one browser. Before the fix
//    every second one ended on the home page instead of the loopback.
const jar = makeJar();
for (let i = 1; i <= attempts; i++) {
  const { landed, result } = await attempt(jar);
  check(
    `attempt ${i} of ${attempts} hands back to the app`,
    !!result?.code,
    result?.code ? '' : `browser ended at ${landed.url}, loopback got ${JSON.stringify(result)}`,
  );
}

// 2. Cancel and retry: an attempt abandoned at the account chooser leaves its
//    hand-off cookie behind; the next one must still be the one that completes.
{
  const abandoned = await startAttempt();
  await fetch(abandoned.url, { redirect: 'manual', headers: { cookie: jar.header() } }).then(
    (res) => jar.apply(res.headers.getSetCookie()),
  );
  const { landed, result } = await attempt(jar);
  check(
    'retry after an abandoned attempt hands back to the app',
    !!result?.code,
    result?.code ? '' : `browser ended at ${landed.url}`,
  );
  check(
    'the abandoned attempt is never answered',
    !(await abandoned.result()),
    'a superseded listener received a code',
  );
  abandoned.close();
}

// 3. Double start (the double-clicked button): two starts back to back, only
//    the live listener may be handed the code, and no tab may strand.
{
  const first = await startAttempt();
  await fetch(first.url, { redirect: 'manual', headers: { cookie: jar.header() } }).then((res) =>
    jar.apply(res.headers.getSetCookie()),
  );
  const { result } = await attempt(jar);
  check('double start: the newest attempt gets the code', !!result?.code);
  check('double start: the superseded attempt gets nothing', !(await first.result()));
  first.close();
}

// 4. A browser that reaches /complete with nothing to hand back is told to go
//    to the app, instead of being dropped on a signed-in page.
{
  const landed = await browse(`${ORIGIN}${HANDOFF_COMPLETE_PATH}`, jar);
  check(
    'a used-up completion tells the browser to return to the app',
    new URL(landed.url).pathname === HANDOFF_RETURN_PATH,
    `ended at ${landed.url}`,
  );
}

googleServer.close();
appServer.close();

const failures = results.filter((ok) => !ok).length;
console.log(
  failures
    ? `\n${failures}/${results.length} checks failed.`
    : `\nAll ${results.length} checks OK.`,
);
process.exit(failures ? 1 : 0);
