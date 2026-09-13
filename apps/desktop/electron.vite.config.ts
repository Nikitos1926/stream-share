import { env } from '@stream-share/env/desktop';
import { defineConfig } from 'electron-vite';
import { resolve } from 'path';
import copy from 'rollup-plugin-copy';

export default defineConfig({
  main: {
    define: {
      __WEB_URL__: JSON.stringify(env.WEB_URL),
    },
    plugins: [
      copy({
        targets: [{ src: 'assets/*', dest: 'out/main/assets' }],
        hook: 'writeBundle',
      }),
    ],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/main/main.ts'),
          audioWorker: resolve(__dirname, 'src/audioWorker/audioCapture.worker.ts'),
        },
        external: [
          'electron-native-screenshare',
          'electron-devtools-installer',
          'core-util-is',
          'util-deprecate',
          'inherits',
        ],
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'src/preload/preload.ts'),
        },
      },
    },
  },
});
