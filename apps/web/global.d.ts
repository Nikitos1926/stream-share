import { Source } from '@/lib/types';

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

  /** Mirrors apps/desktop/src/conveyor/schemas/auth.schema.ts. */
  type DesktopSignInResult =
    | { status: 'success'; code: string; verifier: string }
    | { status: 'cancelled' }
    | { status: 'timeout' }
    | { status: 'error'; message: string };

  interface Window {
    conveyor?: {
      auth: {
        signInWithGoogle(): Promise<DesktopSignInResult>;
        cancelSignIn(): Promise<void>;
      };
      stream: {
        getSources(): Promise<Source[]>;
        pickSource(sourceId: string): Promise<void>;
        startAudioCapture(): Promise<void>;
        stopAudioCapture(): Promise<void>;
      };
    };
  }
}

export {};
