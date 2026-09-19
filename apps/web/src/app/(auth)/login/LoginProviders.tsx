'use client';

import { Button } from '@/app/components/ui/Button';
import { Typography } from '@/app/components/ui/Typography';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { PROVIDERS_CONFIG } from '@/lib/enums/providersConfig';
import { Loader2, TriangleAlert } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

type Props = {
  signInWithProvider: (provider: string) => Promise<void>;
};

const GENERIC_ERROR = 'Sign-in failed. Please try again.';

const WATCHDOG_MS = 6 * 60 * 1000;

type Phase = 'idle' | 'waiting' | 'finishing';

export function LoginProviders({ signInWithProvider }: Props) {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const release = () => {
    inFlight.current = false;
    setPendingProvider(null);
  };

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) release();
    };

    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

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

  const isRedirectError = (e: unknown): boolean =>
    typeof e === 'object' &&
    e !== null &&
    typeof (e as { digest?: unknown }).digest === 'string' &&
    (e as { digest: string }).digest.startsWith('NEXT_REDIRECT');

  const onProviderClick = async (provider: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPendingProvider(provider);
    setError(null);

    if (isDesktop && provider === PROVIDERS_CONFIG.google.name) {
      try {
        await signInThroughBrowser();
      } finally {
        release();
      }
      return;
    }

    try {
      await signInWithProvider(provider);
    } catch (e) {
      if (isRedirectError(e)) return;
      setError(GENERIC_ERROR);
      release();
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
          disabled={pendingProvider !== null}
          aria-busy={pendingProvider === name}
          size="lg"
          className="w-full"
        >
          {pendingProvider === name ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Image src={icon} alt="" width={18} height={18} aria-hidden />
          )}
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
