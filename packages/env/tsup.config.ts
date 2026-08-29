import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/signaling.ts'],
  format: ['esm'],
  clean: true,
  sourcemap: true,
});
