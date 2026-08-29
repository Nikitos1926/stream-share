import { z } from 'zod';

/**
 * Deliberately built from `z.string()` + `refine` rather than zod's newer
 * `z.url()` / `z.ipv4()` helpers: several workspace packages declare a
 * `zod@^3.25 || ^4` peer range, and these stay valid across both.
 */

export const nonEmpty = z.string().min(1);

export const port = z.coerce.number().int().min(1).max(65535);

export const httpUrl = nonEmpty.refine(
  (value) => /^https?:\/\/.+/.test(value),
  'must be an http(s) URL',
);

export const postgresUrl = nonEmpty.refine(
  (value) => /^postgres(ql)?:\/\/.+/.test(value),
  'must be a postgres:// connection string',
);

export const ipv4 = nonEmpty.refine((value) => {
  const parts = value.split('.');
  return (
    parts.length === 4 &&
    parts.every(
      (part) => /^\d{1,3}$/.test(part) && Number(part) <= 255 && String(Number(part)) === part,
    )
  );
}, 'must be a bare IPv4 address');

/**
 * Long enough that a truncated or placeholder value is rejected rather than
 * silently producing unverifiable sessions. Auth.js recommends 32+ bytes.
 */
export const authSecret = z
  .string()
  .min(32, 'must be at least 32 characters — generate with `openssl rand -hex 32`');

export const absolutePath = nonEmpty.refine(
  (value) => value.startsWith('/'),
  'must be an absolute path',
);
