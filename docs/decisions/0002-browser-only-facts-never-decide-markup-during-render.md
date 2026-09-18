# 2. Browser-only facts never decide markup during render

Date: 2026-09-18

## Status

Accepted

## Context

The web app is server-rendered, and two components decided what to render from a
browser global read straight out of the render body:

- `DownloadButton` called `getOperatingSystem()`, which read `navigator.userAgent`.
  Node defines `navigator`, so the call did not throw — it returned `Node.js/24`,
  i.e. `Os.Unknown`, and the server rendered **nothing**, while the browser rendered
  a "Download for …" button. React reported a hydration mismatch on the landing
  page and threw the server HTML away.
- `useIsWindowFocused` seeded its state with `document.hasFocus()`. Node has no
  `document`, so `/broadcast` failed on the server with
  `ReferenceError: document is not defined` and fell back to client rendering —
  the same error in the console, one route further along.

Both are the same defect: a value that only exists in the browser was allowed to
change the first render's output.

## Decision

A browser-only value may never be read during render. It is read either

- **after mount** — in `useEffect`, or through `useSyncExternalStore` with a
  server snapshot that the first client render can reproduce (`useIsDesktop`,
  `useIsWindowFocused`); or
- **on the server, from the request** — when the value has a request-side
  equivalent and the UI should be correct on first paint. The visitor's OS is
  such a value: `getRequestOperatingSystem()` (`lib/utils/os.server.ts`) reads the
  `user-agent` header and Server Components pass the result down as a prop, so the
  installer button is in the HTML the server sends and hydration has nothing to
  reconcile.

`getOperatingSystem(userAgent)` therefore takes the string as an argument; it no
longer knows where it came from.

## Consequences

- The rendered output of `/` varies by `User-Agent`. Every route that uses it
  already reads the session cookie and is rendered on demand, and Caddy does not
  cache, so nothing is shared between visitors. A shared cache in front of the app
  would have to vary on `User-Agent`.
- `suppressHydrationWarning` stays where it belongs — on `<html>`, for the
  `next-themes` class the theme script writes before React runs — and is not used
  to hide a real mismatch.
- Desktop detection keeps a single source of truth, `window.conveyor`, refined
  after hydration by `useIsDesktop`. The user agent is not sniffed for it.
