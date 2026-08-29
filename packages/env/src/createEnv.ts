import type { z } from 'zod';

/**
 * Set to `1`/`true` to bypass validation entirely. Intended for Docker image
 * builds and typechecks, where secrets are legitimately absent — never for a
 * running server.
 */
const SKIP_FLAG = 'SKIP_ENV_VALIDATION';

export type EnvSource = Record<string, string | undefined>;

export class EnvValidationError extends Error {
  readonly report!: string;

  constructor(report: string) {
    super('Environment validation failed');
    this.name = 'EnvValidationError';
    // The report has already gone to stderr in a readable form; a stack trace
    // through zod internals only buries it.
    this.stack = `${this.name}: ${this.message}`;
    // Non-enumerable so Node's uncaught-exception inspector does not print the
    // whole report a second time underneath the formatted one.
    Object.defineProperty(this, 'report', { value: report, enumerable: false });
  }
}

/**
 * Validate a set of environment variables once, at startup, and fail loudly with
 * every problem listed at once rather than one per restart.
 *
 * `source` must be passed explicitly for anything that reaches a browser bundle:
 * bundlers replace individual `process.env.NEXT_PUBLIC_X` reads with literals but
 * do not make `process.env` enumerable, so spreading it client-side yields `{}`.
 */
export function createEnv<T>(name: string, schema: z.ZodType<T>, source?: EnvSource): T {
  const raw = source ?? (process.env as EnvSource);

  if (isEnabled(raw[SKIP_FLAG])) return raw as T;

  const result = schema.safeParse(blankToUndefined(raw));
  if (result.success) return Object.freeze(result.data);

  const report = formatReport(name, result.error.issues, raw);
  console.error(report);
  throw new EnvValidationError(report);
}

function isEnabled(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

/**
 * `KEY=` in a dotenv file yields `''`, which would satisfy a `z.string()` and
 * suppress `.default()`. Treating blanks as absent is what makes "commented out"
 * and "present but empty" behave identically.
 */
function blankToUndefined(source: EnvSource): EnvSource {
  const out: EnvSource = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== '') out[key] = value;
  }
  return out;
}

function formatReport(
  name: string,
  issues: readonly z.core.$ZodIssue[],
  source: EnvSource,
): string {
  const rows = issues.map((issue) => {
    const key = issue.path.join('.') || '(schema)';
    const raw = source[key];
    // For an absent value zod only ever says "expected string, received
    // undefined", which adds nothing next to "missing".
    const detail =
      raw === undefined || raw === ''
        ? 'missing — required'
        : `${JSON.stringify(raw)} — ${issue.message}`;
    return { key, detail };
  });

  const width = Math.max(...rows.map((row) => row.key.length));
  const lines = rows.map((row) => `    ${row.key.padEnd(width)}  ${row.detail}`);

  return [
    ``,
    `✗ Invalid environment variables (${name}):`,
    ...lines,
    ``,
    `  Set them in the appropriate .env file or pass them through your runner.`,
    `  See .env.example for the full list.`,
    ``,
  ].join('\n');
}
