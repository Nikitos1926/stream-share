export {};

/**
 * Not an installed package — Next's bundler aliases it to
 * `next/dist/compiled/server-only`. The declaration only exists so `tsc --noEmit`
 * can resolve the import in `src/lib/env/server.ts`.
 */
declare module 'server-only';

declare global {
  interface CaptureController {
    setFocusBehavior(focusBehavior: 'focus-captured-surface' | 'no-focus-change'): void;
  }

  var CaptureController: {
    prototype: CaptureController;
    new (): CaptureController;
  };

  interface DisplayMediaStreamOptions {
    controller?: CaptureController;
  }
}
