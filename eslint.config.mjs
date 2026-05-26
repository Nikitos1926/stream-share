import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(js.configs.recommended, tseslint.configs.recommended, prettier, {
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.{js,mjs}', '__mocks__/*.{js,mjs,ts}', 'packages/*/*.{js,mjs}'],
        maximumDefaultProjectFileMatchCount: 50,
      },
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
