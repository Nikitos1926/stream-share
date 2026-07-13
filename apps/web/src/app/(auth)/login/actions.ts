'use server';

import { auth, signIn } from '@/lib/auth/auth';

export async function signInWithProvider(provider: string) {
  await signIn(provider, { redirectTo: '/dashboard' });
}
