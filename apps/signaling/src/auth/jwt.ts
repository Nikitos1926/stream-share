import { decode, JWT } from '@auth/core/jwt';

export const NEXT_AUTH_SALT =
  process.env.NODE_ENV === 'production' ? '__Secure-authjs.session-token' : 'authjs.session-token';

export async function decodeAuthToken(rawToken: string): Promise<JWT | null> {
  const payload = await decode({
    salt: NEXT_AUTH_SALT,
    secret: '8e880fb85520e3353a7beaea0f3c2073516d9e21de4c79d42e7069204ba8b896',
    token: rawToken,
  });

  if (!payload?.sub) return null;
  return payload;
}
