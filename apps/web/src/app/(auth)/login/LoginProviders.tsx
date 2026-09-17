'use client';

import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { PROVIDERS_CONFIG } from '@/lib/enums/providersConfig';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

type Props = {
  /** The browser path: a server action that redirects this tab to Google. */
  signInWithProvider: (provider: string) => Promise<void>;
};

const GENERIC_ERROR = 'Sign-in failed. Please try again.';

/**
 * In a browser this is the plain provider list; nothing about that flow changed.
 *
 * Inside the Electron shell the Google button hands off to the main process,
 * which opens the account chooser in the default browser and waits on a loopback
 * listener (apps/desktop/src/main/googleAuth.ts). The code it returns is
 * redeemed here, from the Electron window, so Auth.js writes the session cookie
 * into the app's own cookie jar.
 */
export function LoginProviders({ signInWithProvider }: Props) {
  const isDesktop = useIsDesktop();
  const router = useRouter();
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providers = Object.values(PROVIDERS_CONFIG);

  const signInThroughBrowser = async () => {
    setError(null);
    setWaiting(true);
    try {
      const result = await window.conveyor!.auth.signInWithGoogle();

      if (result.status === 'cancelled') return;
      if (result.status === 'timeout') {
        setError('Browser sign-in timed out. Please try again.');
        return;
      }
      if (result.status === 'error') {
        setError(result.message || GENERIC_ERROR);
        return;
      }

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
      setWaiting(false);
    }
  };

  const cancel = () => {
    void window.conveyor?.auth.cancelSignIn();
  };

  const onProviderClick = async (provider: string) => {
    if (isDesktop && provider === PROVIDERS_CONFIG.google.name) {
      await signInThroughBrowser();
      return;
    }
    await signInWithProvider(provider);
  };

  if (waiting) {
    return (
      <div className="mb-3 flex w-full max-w-sm flex-col items-center gap-3 rounded-xl bg-[#2a2a2a] p-5 text-center">
        <p className="text-sm font-medium">Waiting for browser sign-in…</p>
        <p className="text-muted-foreground text-xs font-light">
          Finish choosing your Google account in the browser window that just opened, then come
          back.
        </p>
        <button
          onClick={cancel}
          className="cursor-pointer rounded-lg border border-[#65645F] px-4 py-2 text-sm font-medium hover:bg-[#534AB7]"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 flex w-full max-w-sm flex-col gap-3 rounded-xl bg-[#2a2a2a] p-5">
      {providers.map(({ name, icon }) => (
        <button
          key={name}
          onClick={() => void onProviderClick(name)}
          className="text-foreground flex w-full cursor-pointer items-center gap-3 rounded-lg border border-[#65645F] bg-inherit px-4 py-3 text-sm font-medium hover:bg-[#534AB7]"
        >
          <Image src={icon} alt="" width={25} height={15} />
          <span>Continue with {name.charAt(0).toUpperCase() + name.slice(1)}</span>
        </button>
      ))}
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
