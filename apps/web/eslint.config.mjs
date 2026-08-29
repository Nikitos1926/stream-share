import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    // Flat configs do not cascade, so this mirrors the rule in the root
    // eslint.config.mjs. Configuration is validated once by src/lib/env and read
    // from there; a stray process.env read is how `undefined` reached the client
    // bundle in the first place.
    //
    // NODE_ENV is exempt: it is set by the toolchain rather than configured, and
    // Next special-cases it.
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/lib/env/**',
      // Validates SIGNALING_INTERNAL_URL lazily; see the comment in that file.
      'src/lib/signaling.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env'][property.name!='NODE_ENV']",
          message:
            'Read configuration from @/lib/env/server or @/lib/env/client instead of process.env, so it is validated at startup.',
        },
      ],
    },
  },
]);

export default eslintConfig;
