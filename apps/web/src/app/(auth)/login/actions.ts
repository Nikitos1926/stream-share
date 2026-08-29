'use server';

import { signIn, signOut } from '@/lib/auth/auth';

export async function signInWithProvider(provider: string) {
  await signOut({ redirect: false });
  await signIn(provider, { redirectTo: '/' });
}
