/**
 * Contrast guard for the colour tokens in src/app/globals.css.
 *
 * The tokens are the only place colours are defined (see apps/web/CLAUDE.md), so
 * every readability question in the app reduces to a handful of token pairs:
 * body text and muted text on the two backgrounds, accent/danger used as text,
 * and the solid buttons whose label is `text-canvas` on an accent/danger fill.
 *
 * It parses the `:root` and `.dark` blocks straight out of the stylesheet and
 * fails if any of those pairs drops below its WCAG 2.1 AA threshold, so a token
 * edit that breaks light mode (the bug this was written for) cannot pass again
 * unnoticed.
 *
 * Run: `pnpm --filter @stream-share/web check:contrast`
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const CSS_PATH = path.join(import.meta.dirname, '../src/app/globals.css');

/** 4.5:1 for body text, 3:1 for large text (>=24px, or >=18.66px bold). */
const AA_TEXT = 4.5;
const AA_LARGE = 3;

/** [foreground token, background token, threshold, what uses it] */
const PAIRS = [
  ['stroke', 'canvas', AA_TEXT, 'body text on the page'],
  ['stroke', 'surface', AA_TEXT, 'body text on a card (auth card, footer, modal)'],
  ['stroke-muted', 'canvas', AA_TEXT, 'muted copy on the page'],
  ['stroke-muted', 'surface', AA_TEXT, 'muted copy on a card, ghost button label'],
  ['accent', 'canvas', AA_TEXT, 'links, outline primary button label'],
  ['accent', 'surface', AA_TEXT, 'links and accent text on a card'],
  ['danger', 'canvas', AA_TEXT, 'error text on the page'],
  ['danger', 'surface', AA_TEXT, 'sign-in error callout on the auth card'],
  ['canvas', 'accent', AA_TEXT, 'solid primary button label'],
  ['canvas', 'danger', AA_TEXT, 'solid destructive button label'],
  // `--line` is deliberately a hairline separator (~1.25:1 in both themes, by
  // design), so it is not checked; the focus ring is what has to be visible.
  ['accent', 'surface', AA_LARGE, 'focus ring against a card'],
  ['accent', 'canvas', AA_LARGE, 'focus ring against the page'],
];

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

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

const css = await readFile(CSS_PATH, 'utf8');
const themes = {
  light: parseBlock(css, ':root'),
  dark: parseBlock(css, '\\.dark'),
};

let failed = false;

for (const [theme, tokens] of Object.entries(themes)) {
  console.log(`\n${theme} mode`);
  for (const [fg, bg, threshold, usage] of PAIRS) {
    const [fgHex, bgHex] = [tokens[fg], tokens[bg]];
    if (!fgHex || !bgHex) throw new Error(`missing token: --${fg} or --${bg} in ${theme}`);

    const ratio = contrast(fgHex, bgHex);
    const ok = ratio >= threshold;
    failed ||= !ok;
    console.log(
      `  ${ok ? 'ok  ' : 'FAIL'} ${`${fg} on ${bg}`.padEnd(28)} ${ratio.toFixed(2)}:1` +
        ` (needs ${threshold}) — ${usage}`,
    );
  }
}

if (failed) {
  console.error('\nSome token pairs are below their WCAG AA threshold.');
  process.exit(1);
}

console.log('\nAll token pairs meet WCAG AA.');
