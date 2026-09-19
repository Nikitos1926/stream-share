'use client';

import { User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn.util';

/**
 * The user avatar, with its fallback built in.
 *
 * There is deliberately no `/default-avatar.png`. The header used to point
 * `next/image` at that path for every user Google returns no picture for, the
 * asset never existed, and `/_next/image?url=/default-avatar.png` answered 400 —
 * a broken image in the header. An asset would also have to be two assets to
 * follow the theme, so the fallback is drawn from the tokens instead: initials on
 * an `accent` fill, labelled `text-canvas`, the only foreground that inverts with
 * it (see apps/web/CLAUDE.md), or a `User` glyph when there is no name.
 *
 * The picture itself is a plain `<img>`, like the stream thumbnails, rather than
 * `next/image`: an avatar URL is a ~32px image already sized by someone else's
 * CDN, so the optimizer buys nothing — and it fails closed on a host that is not
 * in `next.config.ts` (a render-time throw in dev, a 400 in production), which is
 * the same class of bug as the missing asset. `onError` sends a picture that does
 * not load — a Google URL the account has since dropped, an unreachable host — to
 * the same fallback.
 */

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  /** Rendered size in px. */
  size?: number;
  className?: string;
};

/** `'Ada Lovelace'` -> `'AL'`, `'ada'` -> `'A'`, `''` -> `null`. */
const initialsOf = (name: string | null | undefined) => {
  const initials = (name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase();
  return initials || null;
};

export function Avatar({ src, name, size = 32, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const alt = name ? `${name}'s avatar` : 'User avatar';
  const box = { width: size, height: size };

  if (!src || failed) {
    const initials = initialsOf(name);
    return (
      <span
        role="img"
        aria-label={alt}
        style={{ ...box, fontSize: Math.round(size * 0.4) }}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full',
          'bg-accent font-medium text-canvas select-none',
          className,
        )}
      >
        {initials ?? <User aria-hidden style={{ width: size * 0.55, height: size * 0.55 }} />}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={box}
      // Google serves the picture without a referrer of ours; keep it that way.
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn('shrink-0 rounded-full object-cover select-none', className)}
    />
  );
}
