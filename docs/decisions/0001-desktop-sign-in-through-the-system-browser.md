# 1. Desktop sign-in goes through the system browser via a web-app hand-off

Date: 2026-09-17

## Status

Accepted

## Context

The desktop app is an Electron shell that loads the deployed web app as a remote
URL. Google sign-in was therefore a same-window top-level navigation to
`accounts.google.com` inside the `BrowserWindow` — an embedded user agent, which
Google rejects (`disallowed_useragent`) and which hides the account chooser
inside an app window.

Two constraints shaped the fix:

- **The session must end up as an Auth.js cookie in the Electron session.** The
  signaling server authenticates WebSocket and REST traffic by verifying the
  `authjs.session-token` cookie itself (`apps/signaling/src/auth/jwt.ts`), so an
  access token held by the main process would be worthless.
- **The Google client is the web app's.** Its secret lives on the web server and
  its redirect URI is `<origin>/api/auth/callback/google`.

The obvious alternative — give the desktop app its own Google "Desktop app"
OAuth client and a `http://127.0.0.1:<port>` redirect URI — means a second client
to register and rotate, a (nominally public, still awkward) client secret shipped
in the bundle, and a new server endpoint to turn Google tokens into a session
anyway. It buys nothing the web app cannot already do.

## Decision

The desktop app opens the **web app's** `/api/desktop-auth/start` in the default
browser with `shell.openExternal`, passing a loopback port, a `state` and a PKCE
`code_challenge`. The browser runs the existing Auth.js Google flow.
`/api/desktop-auth/complete` then issues a one-time code, bound to that
challenge and valid for two minutes, and redirects the browser to
`http://127.0.0.1:<port>/callback`, where a listener started by the main process
picks it up. The renderer redeems the code through a new `desktop` credentials
provider, so **Auth.js** mints the session cookie in the Electron cookie jar.

Supporting decisions:

- The loopback listener binds to `127.0.0.1` on an ephemeral port, accepts one
  path, and requires the `state` it generated.
- The desktop app sends a _port_, not a redirect URI: the callback URL is rebuilt
  server-side from a hardcoded host and path, so the parameter cannot become an
  open redirect.
- Hand-off request and code are `@auth/core/jwt` tokens under distinct salts, so
  neither can be decoded as the other or as a session token. Single use is
  enforced best-effort in process memory; PKCE and the two-minute lifetime are
  what actually carry the security.
- `will-navigate` / `will-redirect` on the main window send anything that is not
  the web app's origin to the default browser, so no external page — Google's
  included — can render inside the app again.

## Consequences

- No change to the Google Cloud console: one client, one redirect URI, secret
  stays server-side.
- The desktop app depends on the web deployment it is built against (`WEB_URL`,
  inlined at build time) exposing `/api/desktop-auth/*`. An older server and a
  newer app cannot sign in.
- A user with no default browser, or one that cannot reach the web app, cannot
  sign in on the desktop; there is no in-app fallback by design.
- Sign-in also leaves the user signed in **in their browser**, as any OAuth flow
  in that browser would.
