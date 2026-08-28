import { decode, JWT } from '@auth/core/jwt';

export const NEXT_AUTH_SALT =
  process.env.NODE_ENV === 'production' ? '__Secure-authjs.session-token' : 'authjs.session-token';

export async function decodeAuthToken(rawToken: string): Promise<JWT | null> {
  const payload = await decode({
    salt: NEXT_AUTH_SALT,
    secret: process.env.AUTH_SECRET!,
    token: rawToken,
  });

  if (!payload?.sub) return null;
  return payload;
}
