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

**Surfaces are dark in both themes.** `--surface` and `--line` have the same value in `:root`
and `.dark`; only `--canvas` and `--stroke` flip. Text on a `bg-surface` card therefore reads
black-on-dark in light mode — an app-wide token issue (the landing page has it too), not
something to work around per page with `dark:` variants. Fix it in `globals.css` when it is
worth fixing.

**Auth pages** (`src/app/(auth)`) share `(auth)/layout.tsx`: mark, one `max-w-md` surface card,
footer links. They deliberately do not use the `(main)` header/footer — a page you are not
signed in on should not offer app navigation. Pages under it render card content only.
