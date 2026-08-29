import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.{js,mjs}', '__mocks__/*.{js,mjs,ts}', 'packages/*/*.{js,mjs}'],
          maximumDefaultProjectFileMatchCount: 50,
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    // Configuration is read once, validated, and exported by the env modules below.
    // Reading process.env anywhere else reintroduces the unvalidated `process.env.X!`
    // pattern that shipped `undefined` to production.
    //
    // NODE_ENV is exempt: it is set by the toolchain rather than configured, and
    // bundlers special-case it.
    files: ['apps/**/src/**/*.{ts,tsx}', 'packages/**/src/**/*.ts'],
    ignores: [
      'packages/env/src/**',
      'apps/web/src/lib/env/**',
      // Validates SIGNALING_INTERNAL_URL lazily; see the comment in that file.
      'apps/web/src/lib/signaling.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env'][property.name!='NODE_ENV']",
          message:
            'Read configuration from @stream-share/env (or @/lib/env in the web app) instead of process.env, so it is validated at startup.',
        },
      ],
    },
  },
);
