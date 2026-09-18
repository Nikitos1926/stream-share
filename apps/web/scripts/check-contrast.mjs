/**
 * Contrast guard for the colour tokens in src/app/globals.css.
 *
 * The tokens are the only place colours are defined (see apps/web/CLAUDE.md), so
 * every readability question in the app reduces to a list of foreground /
 * background pairs: body and muted text on the two backgrounds, accent/danger
 * used as text, the solid buttons whose label is `text-canvas` on an
 * accent/danger fill — and the hover and pressed states of all of those, which
 * is where the last regression hid: the guard only looked at flat tokens, so
 * `active:bg-danger/80` under a `text-danger` label (1.4:1) passed.
 *
 * So a background here is a *stack*: an opaque token plus any translucent
 * layers painted on it (`['surface', 'danger/10']`), composited the way the
 * browser does before the ratio is computed.
 *
 * On top of that, every `hover:`/`active:`/`focus:` `bg-*`/`text-*` class in
 * `src` has to be named in some pair's `covers`, and every colour class has to
 * name a token that exists. A new state cannot be added without deciding, here,
 * what it renders against.
 *
 * Run: `pnpm --filter @stream-share/web check:contrast`
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const WEB_ROOT = path.join(import.meta.dirname, '..');
const CSS_PATH = path.join(WEB_ROOT, 'src/app/globals.css');
const SRC_DIR = path.join(WEB_ROOT, 'src');

/** 4.5:1 for body text, 3:1 for large text (>=24px, or >=18.66px bold) and icons. */
const AA_TEXT = 4.5;
const AA_LARGE = 3;

/**
 * `{ fg, bg, min, usage, covers }` — `fg` is a token, optionally `token/alpha`;
 * `bg` is a token or a stack whose first entry is opaque; `covers` lists the
 * stateful classes the pair accounts for.
 */
const PAIRS = [
  // Resting text.
  { fg: 'stroke', bg: 'canvas', min: AA_TEXT, usage: 'body text on the page' },
  { fg: 'stroke', bg: 'surface', min: AA_TEXT, usage: 'body text on a card, footer, modal' },
  { fg: 'stroke-muted', bg: 'canvas', min: AA_TEXT, usage: 'muted copy on the page' },
  { fg: 'stroke-muted', bg: 'surface', min: AA_TEXT, usage: 'muted copy on a card' },
  { fg: 'accent', bg: 'canvas', min: AA_TEXT, usage: 'links, outline primary button label' },
  { fg: 'accent', bg: 'surface', min: AA_TEXT, usage: 'links and accent text on a card' },
  { fg: 'danger', bg: 'canvas', min: AA_TEXT, usage: 'error text on the page' },
  { fg: 'danger', bg: 'surface', min: AA_TEXT, usage: 'error text on a card' },

  // Solid buttons: the label is `text-canvas`, the only foreground that inverts
  // with the fill. Hover/press move the fill away from the canvas, never towards
  // it, which is why they are tokens and not `bg-accent/80`.
  { fg: 'canvas', bg: 'accent', min: AA_TEXT, usage: 'solid primary button label' },
  {
    fg: 'canvas',
    bg: 'accent-hover',
    min: AA_TEXT,
    usage: 'solid primary button label, hovered',
    covers: ['hover:bg-accent-hover'],
  },
  {
    fg: 'canvas',
    bg: 'accent-active',
    min: AA_TEXT,
    usage: 'solid primary button label, pressed',
    covers: ['active:bg-accent-active'],
  },
  { fg: 'canvas', bg: 'danger', min: AA_TEXT, usage: 'solid destructive button label' },
  {
    fg: 'canvas',
    bg: 'danger-hover',
    min: AA_TEXT,
    usage: 'solid destructive button label, hovered',
    covers: ['hover:bg-danger-hover'],
  },
  {
    fg: 'canvas',
    bg: 'danger-active',
    min: AA_TEXT,
    usage: 'solid destructive button label, pressed',
    covers: ['active:bg-danger-active'],
  },

  // Outline buttons: a tint on hover under the accent/danger label, then the
  // full fill on press, where the label flips to `text-canvas`.
  {
    fg: 'accent',
    bg: ['canvas', 'accent/10'],
    min: AA_TEXT,
    usage: 'outline primary button label, hovered on the page',
    covers: ['hover:bg-accent/10'],
  },
  {
    fg: 'accent',
    bg: ['surface', 'accent/10'],
    min: AA_TEXT,
    usage: 'outline primary button label, hovered on a card',
  },
  {
    fg: 'canvas',
    bg: ['canvas', 'accent'],
    min: AA_TEXT,
    usage: 'outline primary button label, pressed',
    covers: ['active:bg-accent', 'active:text-canvas'],
  },
  {
    fg: 'danger',
    bg: ['canvas', 'danger/10'],
    min: AA_TEXT,
    usage: 'outline destructive button label, hovered on the page',
    covers: ['hover:bg-danger/10'],
  },
  {
    fg: 'danger',
    bg: ['surface', 'danger/10'],
    min: AA_TEXT,
    usage: 'sign-in error callout on the auth card, outline destructive hovered',
  },
  {
    fg: 'canvas',
    bg: ['canvas', 'danger'],
    min: AA_TEXT,
    usage: 'outline destructive button label, pressed ("Stop broadcast")',
    covers: ['active:bg-danger'],
  },

  // Secondary / ghost buttons: a translucent surface under stroke text.
  {
    fg: 'stroke',
    bg: ['canvas', 'surface/50'],
    min: AA_TEXT,
    usage: 'secondary button label on a translucent surface',
    covers: ['hover:bg-surface/50', 'active:bg-surface/50', 'hover:text-stroke'],
  },
  {
    fg: 'stroke',
    bg: ['canvas', 'surface/70'],
    min: AA_TEXT,
    usage: 'secondary button label, hovered',
    covers: ['hover:bg-surface/70'],
  },
  {
    fg: 'stroke-muted',
    bg: ['canvas', 'surface/50'],
    min: AA_TEXT,
    usage: 'ghost button label on a translucent surface',
  },

  // Links.
  {
    fg: 'accent-hover',
    bg: 'canvas',
    min: AA_TEXT,
    usage: 'link hovered on the page',
    covers: ['hover:text-accent-hover'],
  },
  { fg: 'accent-hover', bg: 'surface', min: AA_TEXT, usage: 'link hovered on a card' },

  // Non-text: icons and the focus ring are graphical objects (3:1).
  // `--line` is deliberately a hairline separator (~1.25:1 in both themes, by
  // design), so it is not checked; the focus ring is what has to be visible.
  {
    fg: 'accent',
    bg: ['surface', 'accent/15'],
    min: AA_LARGE,
    usage: 'accent icon in its tinted tile (landing features, /desktop-auth)',
  },
  { fg: 'accent', bg: 'surface', min: AA_LARGE, usage: 'focus ring against a card' },
  { fg: 'accent', bg: 'canvas', min: AA_LARGE, usage: 'focus ring against the page' },
];

/** Stateful `bg-*`/`text-*` classes that never have text on them, so no pair applies. */
const NO_TEXT_ON_IT = new Set();

const parseBlock = (css, selector) => {
  const block = new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\}`).exec(css);
  if (!block) throw new Error(`no \`${selector}\` block in globals.css`);

  const tokens = {};
  for (const [, name, value] of block[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6});/g)) {
    tokens[name] = value;
  }
  return tokens;
};

const channel = (value) => {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
};

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

/** `over('#0b6b60', '#ffffff', 0.1)` — source-over compositing, sRGB. */
const over = (fg, bg, alpha) => {
  const [f, b] = [rgb(fg), rgb(bg)];
  return `#${f
    .map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)))
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
};

/** `accent/10` -> `['accent', 0.1]`; `accent` -> `['accent', 1]`. */
const resolve = (tokens, theme, spec) => {
  const [name, alpha] = spec.split('/');
  const hex = tokens[name];
  if (!hex) throw new Error(`missing token: --${name} in ${theme} mode`);
  return [hex, alpha === undefined ? 1 : Number(alpha) / 100];
};

/** Flattens a background stack (bottom layer first) into one opaque colour. */
const flatten = (tokens, theme, bg) =>
  (Array.isArray(bg) ? bg : [bg]).reduce((base, layer) => {
    const [hex, alpha] = resolve(tokens, theme, layer);
    if (base === null) {
      if (alpha !== 1) throw new Error(`background stack starts translucent: ${layer}`);
      return hex;
    }
    return over(hex, base, alpha);
  }, null);

const label = (spec) => (Array.isArray(spec) ? spec.join(' + ') : spec);

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return /\.(tsx?|css)$/.test(entry.name) ? [full] : [];
    }),
  );
  return nested.flat();
};

/**
 * Colour utilities used in `src`, as `{ stateful, all }` maps of class name to
 * where it was found. Only the token families defined in globals.css are
 * collected, so Tailwind's own utilities (`bg-transparent`, `text-sm`) are left
 * alone — but `border-line-strong`, a token that does not exist, is not.
 */
const scanClasses = async (tokenNames) => {
  const families = [...new Set(tokenNames.map((name) => name.split('-')[0]))].join('|');
  const utilities = 'bg|text|border|ring|ring-offset|fill|stroke|decoration|outline|from|to|via';
  const pattern = new RegExp(
    // The token has to be a colour family on its own or with a `-suffix`, so
    // `bg-linear-to-t` (a gradient utility) is not read as the `line` family.
    `(?<![\\w-/])((?:[\\w-]+(?:\\[[^\\]]*\\])?:)*)(${utilities})-((?:${families})(?:-[\\w-]+)?)(/\\d+)?(?![\\w-])`,
    'g',
  );

  const stateful = new Map();
  const all = new Map();
  for (const file of await walk(SRC_DIR)) {
    const source = await readFile(file, 'utf8');
    const where = path.relative(WEB_ROOT, file);
    for (const [, variants, utility, token, alpha] of source.matchAll(pattern)) {
      const className = `${variants}${utility}-${token}${alpha ?? ''}`;
      if (!all.has(className)) all.set(className, { token, where });
      if (variants && /^(bg|text)$/.test(utility) && !stateful.has(className)) {
        stateful.set(className, where);
      }
    }
  }
  return { stateful, all };
};

const css = await readFile(CSS_PATH, 'utf8');
const themes = {
  light: parseBlock(css, ':root'),
  dark: parseBlock(css, '\\.dark'),
};

let failed = false;
const fail = (message) => {
  failed = true;
  console.error(message);
};

for (const [theme, tokens] of Object.entries(themes)) {
  console.log(`\n${theme} mode`);
  for (const { fg, bg, min, usage } of PAIRS) {
    const background = flatten(tokens, theme, bg);
    const [fgHex, fgAlpha] = resolve(tokens, theme, fg);
    const ratio = contrast(over(fgHex, background, fgAlpha), background);

    const ok = ratio >= min;
    failed ||= !ok;
    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'} ${`${label(fg)} on ${label(bg)}`.padEnd(38)}` +
        ` ${ratio.toFixed(2)}:1 (needs ${min}) — ${usage}`,
    );
  }
}

// Both themes declare the same token names, so either set works for the scan.
const tokenNames = Object.keys(themes.light);
const { stateful, all } = await scanClasses(tokenNames);

for (const [className, { token, where }] of all) {
  if (!tokenNames.includes(token)) {
    fail(`\nDead class name \`${className}\` in ${where}: there is no --${token} token.`);
  }
}

const covered = new Set(PAIRS.flatMap(({ covers = [] }) => covers));
for (const [className, where] of stateful) {
  if (covered.has(className) || NO_TEXT_ON_IT.has(className)) continue;
  fail(
    `\nUnchecked state \`${className}\` in ${where}.\n` +
      '  A hover/press colour needs a pair in scripts/check-contrast.mjs saying which text\n' +
      "  sits on it (add the class to that pair's `covers`), or an entry in NO_TEXT_ON_IT.",
  );
}

if (failed) {
  console.error('\nContrast check failed.');
  process.exit(1);
}

console.log(`\nAll token pairs meet WCAG AA; ${stateful.size} stateful colour classes covered.`);
