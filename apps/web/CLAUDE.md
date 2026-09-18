# apps/web — UI conventions

**Style with the tokens, not with hex values.** Colours come from the CSS variables in
`src/app/globals.css` and are used through their Tailwind aliases: `bg-canvas` (page),
`bg-surface` (cards, panels, bars), `border-line`, `text-stroke`, `text-stroke-muted`,
`text-accent`, `text-danger`, plus the `signal-*` colours for stream state. A literal colour
(`bg-[#2a2a2a]`, `text-red-400`) in a component is a bug: it ignores the theme and drifts from
the rest of the app.

**Reuse the primitives before writing markup.** `src/app/components/ui` (`Button`, `Link`,
`Typography`, `Input`, `Select`, `Slider`) and `src/app/components/common` (`Modal`,
`ErrorState`, `NotFoundState`, `SkeletonBlock`, `Paginator`) already carry the app's type scale,
focus rings and disabled states. `Button` is the only button — it owns the
`focus-visible:ring-accent` treatment, so hand-rolled `<button>`s silently lose keyboard focus
styling. Icons are `lucide-react`; the product mark is `components/layout/Logo`. A user picture is
`components/ui/Avatar` — it owns the missing/broken-picture fallback, so nothing else needs a
placeholder for a user without one.

**An image the app does not ship is a plain `<img>`, not `next/image`.** Avatars and stream
thumbnails come from someone else's origin, already sized, so the optimizer buys nothing and
fails closed: a URL whose host is not in `images.remotePatterns` throws while rendering in dev and
answers 400 in production, which is how a user with no Google picture ended up with a broken
header. `next/image` is for assets under `public/` (the OS and provider logos), and there is no
placeholder asset — a fallback is drawn from the tokens so it follows the theme.

**Every token flips with the theme.** `--canvas` / `--surface` / `--line` are light in light mode
and dark in dark mode; `--stroke` / `--stroke-muted` do the opposite; `--accent` and `--danger`
are dark in light mode and light in dark mode, which is what lets them be both readable _text_
on a canvas/surface background and a _fill_ whose label is `text-canvas`. So a solid accent or
danger button labels itself `text-canvas` — never `text-surface`, `text-stroke` or `text-black`,
which do not invert with the fill. No `dark:` variant is needed anywhere.

**Hover and press use the `-hover` / `-active` shades, not an alpha fill.** `bg-accent/80` mixes
the fill _towards the canvas_ — which is the colour its own `text-canvas` label is, so pressing
the button washed the label out (`active:bg-danger/80` under `text-danger` was 1.4:1).
`--accent-hover` / `--accent-active` and `--danger-hover` / `--danger-active` move away from the
canvas instead, so a state can only raise contrast: `bg-accent hover:bg-accent-hover
active:bg-accent-active`, and `hover:text-accent-hover` for accent text. Alpha is still right for
a _tint under text of another colour_ (`hover:bg-accent/10` beneath `text-accent`, the error
callout's `bg-danger/10`). An outline button that fills on press flips its label:
`active:bg-danger active:text-canvas`.

Keep it that way: `pnpm --filter @stream-share/web check:contrast` reads the tokens out of
`globals.css`, composites each translucent layer the way the browser does, and fails if a pair
drops below WCAG AA. It also fails on a colour class naming a token that does not exist, and on
any `hover:`/`active:`/`focus:` `bg-*`/`text-*` class in `src` that no pair accounts for — so a
new state forces you to say, in `scripts/check-contrast.mjs`, what text sits on it.

**Never read a browser global while rendering.** `navigator`, `document`, `window`, `localStorage`
and `matchMedia` are for effects and event handlers. Read during render they either crash the
server (`document is not defined` on `/broadcast`) or, worse, quietly return something else there
— Node's `navigator.userAgent` is `Node.js/24`, which is why the landing page rendered no
"Download" button on the server and one in the browser, i.e. a hydration mismatch. Two ways out:
`useSyncExternalStore` with a server snapshot the first client render can reproduce
(`useIsDesktop`, `useIsWindowFocused`), or — when the UI must be right on first paint — take the
value off the request in a Server Component and pass it down as a prop, the way
`getRequestOperatingSystem()` (`lib/utils/os.server.ts`) feeds `DownloadButton`. See
`docs/decisions/0002-*`. `suppressHydrationWarning` belongs on `<html>` for the `next-themes`
class and nowhere else.

**The session cookie's name and `Secure` flag are not the web app's to choose alone.** Both
come from `@stream-share/shared` (`sessionCookie.ts`), because the signaling server reads that
cookie without running Auth.js and uses its **name as the JWT salt** — a name the two sides
disagree on 401s every request instead of erroring. `src/lib/auth/auth.ts` therefore passes
`useSecureCookies` and pins `cookies.sessionToken` from those constants rather than letting
`@auth/core` infer them from the request protocol (behind Caddy that is `http:`), and
`sameSite` stays `lax` so the Google callback and the desktop hand-off still carry it. See
`docs/decisions/0004-*`; `pnpm --filter @stream-share/web check:session-cookie` asserts the
emitted `Set-Cookie` in both modes.

**Auth pages** (`src/app/(auth)`) share `(auth)/layout.tsx`: mark, one `max-w-md` surface card,
footer links. They deliberately do not use the `(main)` header/footer — a page you are not
signed in on should not offer app navigation. Pages under it render card content only.
