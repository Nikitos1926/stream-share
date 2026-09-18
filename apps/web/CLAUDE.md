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
styling. Icons are `lucide-react`; the product mark is `components/layout/Logo`.

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

**Auth pages** (`src/app/(auth)`) share `(auth)/layout.tsx`: mark, one `max-w-md` surface card,
footer links. They deliberately do not use the `(main)` header/footer — a page you are not
signed in on should not offer app navigation. Pages under it render card content only.
