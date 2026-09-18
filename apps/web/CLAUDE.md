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
are dark in light mode and light in dark mode, which is what lets them be both readable *text*
on a canvas/surface background and a *fill* whose label is `text-canvas`. So a solid accent or
danger button labels itself `text-canvas` — never `text-surface`, `text-stroke` or `text-black`,
which do not invert with the fill. No `dark:` variant is needed anywhere.

Keep it that way: `pnpm --filter @stream-share/web check:contrast` reads the tokens out of
`globals.css` and fails if any of those pairs drops below WCAG AA. Add a pair to
`scripts/check-contrast.mjs` when you introduce one.

**Auth pages** (`src/app/(auth)`) share `(auth)/layout.tsx`: mark, one `max-w-md` surface card,
footer links. They deliberately do not use the `(main)` header/footer — a page you are not
signed in on should not offer app navigation. Pages under it render card content only.
