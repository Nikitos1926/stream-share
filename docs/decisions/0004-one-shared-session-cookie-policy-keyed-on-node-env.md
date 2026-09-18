# 4. One shared session-cookie policy, keyed on NODE_ENV

Date: 2026-09-18

## Status

Accepted

## Context

The session cookie is issued by the web app's Auth.js config and verified by the
signaling server, which does not run Auth.js: it reads the cookie itself and
decodes it with `@auth/core`'s `decode`, where **the cookie name is the JWT
salt** (`apps/signaling/src/auth/jwt.ts`). Signaling spelled the name out —
`__Secure-authjs.session-token` when `NODE_ENV === 'production'` — while the web
app set none, leaving `@auth/core` to default `useSecureCookies` to
`url.protocol === 'https:'` (`lib/init.js`).

In this deployment that protocol is not the user's: Caddy terminates TLS and
proxies plain HTTP, so the request Next sees is `http:` and the only thing that
makes the default come out `https:` is `AUTH_URL` being set
(`next-auth/lib/env.js` rewrites the request URL from it). A production
deployment that forgot `AUTH_URL` would therefore issue `authjs.session-token`
over https without `Secure`, and signaling — still reading `__Secure-…` — would
401 every WebSocket and REST call. Two independent rules for one name, and the
failure mode is silent on both sides.

## Decision

The name and the `Secure` decision live in one module both surfaces import,
`packages/shared/src/auth/sessionCookie.ts`, and the decision is `NODE_ENV`:

- the web app passes `useSecureCookies` explicitly and pins
  `cookies.sessionToken` to `SESSION_COOKIE_NAME` with `httpOnly`, `path: '/'`
  and `sameSite: 'lax'` — `lax` because the Google callback and the desktop
  hand-off's return from the external browser are top-level cross-site
  navigations that must carry the cookie;
- signaling uses the same constant as cookie name and salt;
- the web env schema requires `AUTH_URL`, when set, to be https in production, so
  a deployment whose public origin is http fails at startup with a message
  instead of becoming unsignable-into.

`pnpm --filter @stream-share/web check:session-cookie` drives the real
`@auth/core` with that policy and asserts the emitted `Set-Cookie`: a
`__Secure-` name with `Secure`, `HttpOnly` and `SameSite=Lax` in production, and
nothing `Secure` in development.

## Consequences

- `NODE_ENV=production` now _requires_ https in front of the app. That is the
  point, but it means a bare-http staging box cannot be run in production mode.
- Anything else that ever needs the cookie must import it from
  `@stream-share/shared`; a third literal reintroduces exactly this bug.
- No change for the current deployment, which sets `AUTH_URL` and so already got
  `__Secure-` out of the default. A deployment that did not would have been
  broken anyway; its existing sessions are signed out once, by the rename.
