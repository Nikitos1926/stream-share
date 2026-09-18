'use client';

import { Button } from '@/app/components/ui/Button';
import { Typography } from '@/app/components/ui/Typography';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { PROVIDERS_CONFIG } from '@/lib/enums/providersConfig';
import { Loader2, TriangleAlert } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useRef, useState } from 'react';

type Props = {
  /** The browser path: a server action that redirects this tab to Google. */
  signInWithProvider: (provider: string) => Promise<void>;
};

const GENERIC_ERROR = 'Sign-in failed. Please try again.';

/**
 * Last resort against a spinner that never ends. The main process gives up on
 * its own after five minutes (apps/desktop/src/main/googleAuth.ts); this only
 * fires when that answer never arrives at all — a reloaded or crashed main
 * process, a dropped IPC reply — and turns it into an error the user can retry.
 */
const WATCHDOG_MS = 6 * 60 * 1000;

type Phase = 'idle' | 'waiting' | 'finishing';

/**
 * In a browser this is the plain provider list; nothing about that flow changed.
 *
 * Inside the Electron shell the Google button hands off to the main process,
 * which opens the account chooser in the default browser and waits on a loopback
 * listener (apps/desktop/src/main/googleAuth.ts). The code it returns is
 * redeemed here, from the Electron window, so Auth.js writes the session cookie
 * into the app's own cookie jar.
 *
 * Every path out of the hand-off ends in one of three states: signed in, or the
 * buttons back with an error, or the buttons back because the user cancelled.
 * None of them leaves the waiting panel up.
 */
export function LoginProviders({ signInWithProvider }: Props) {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Starting a second attempt cancels the first one in the main process, so two
   * clicks landing before this component re-rendered left the window waiting on
   * an attempt that had already been superseded. `busy` disables the buttons;
   * the ref is what makes the guard hold inside a single tick.
   */
  const inFlight = useRef(false);

  const providers = Object.values(PROVIDERS_CONFIG);

  const signInThroughBrowser = async () => {
    setError(null);
    setPhase('waiting');

    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        window.conveyor!.auth.signInWithGoogle(),
        new Promise<DesktopSignInResult>((resolve) => {
          watchdog = setTimeout(() => {
            void window.conveyor?.auth.cancelSignIn();
            resolve({ status: 'error', message: 'Browser sign-in did not come back in time.' });
          }, WATCHDOG_MS);
        }),
      ]);

      if (result.status === 'cancelled') return;
      if (result.status === 'timeout') {
        setError('Browser sign-in timed out. Please try again.');
        return;
      }
      if (result.status === 'error') {
        setError(result.message || GENERIC_ERROR);
        return;
      }

      setPhase('finishing');
      const outcome = await signIn('desktop', {
        code: result.code,
        verifier: result.verifier,
        redirect: false,
      });

      if (outcome?.error) {
        setError(GENERIC_ERROR);
        return;
      }

      // The session cookie is set now; let the server components and the proxy
      // see it.
      router.replace('/');
      router.refresh();
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      clearTimeout(watchdog);
      setPhase('idle');
    }
  };

  const cancel = () => {
    void window.conveyor?.auth.cancelSignIn();
  };

  const onProviderClick = async (provider: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      if (isDesktop && provider === PROVIDERS_CONFIG.google.name) {
        await signInThroughBrowser();
        return;
      }
      // Redirects this tab to the provider, so it normally never comes back.
      await signInWithProvider(provider);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (phase !== 'idle') {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-lg border border-line bg-canvas p-5 text-center"
        aria-live="polite"
      >
        <Loader2 className="size-6 animate-spin text-accent" aria-hidden />
        <Typography size="sm" className="font-medium">
          {phase === 'waiting' ? 'Waiting for browser sign-in…' : 'Finishing sign-in…'}
        </Typography>
        {phase === 'waiting' && (
          <>
            <Typography tag="p" tone="muted" size="xs">
              Finish choosing your Google account in the browser window that just opened, then come
              back.
            </Typography>
            <Button onClick={cancel} variant="ghost" appearance="outline" size="lg">
              Cancel
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {providers.map(({ name, icon }) => (
        <Button
          key={name}
          onClick={() => void onProviderClick(name)}
          disabled={busy}
          size="lg"
          className="w-full"
        >
          <Image src={icon} alt="" width={18} height={18} aria-hidden />
          <span>Continue with {name.charAt(0).toUpperCase() + name.slice(1)}</span>
        </Button>
      ))}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/50 bg-danger/10 px-3 py-2"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          <Typography tag="p" tone="danger" size="xs">
            {error}
          </Typography>
        </div>
      )}
    </div>
  );
}
