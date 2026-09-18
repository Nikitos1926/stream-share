import { NewUser } from '@stream-share/db';
import { SESSION_COOKIE_NAME, useSecureAuthCookies } from '@stream-share/shared';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '../db';
import { DrizzleAdapter } from '../db/adapter';
import { env } from '../env/server';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Style, Avatar } from '@dicebear/core';
import identicon from '@dicebear/styles/identicon.json' with { type: 'json' };
import { generateSlug } from 'random-word-slugs';
import { redeemHandoffCode } from './desktopHandoff';

const adapter = DrizzleAdapter(db);
const style = new Style(identicon);

const config: NextAuthConfig = {
  adapter,
  session: {
    strategy: 'jwt',
  },
  /**
   * The session cookie must never travel over plain http in production. Left to
   * @auth/core this follows `url.protocol === 'https:'`, which behind Caddy means
   * "is AUTH_URL set" rather than "is the user on https" — so the policy is
   * stated explicitly, from the same module the signaling server reads the name
   * from (@stream-share/shared/auth). `useSecureCookies` covers the csrf,
   * callback-url, pkce and state cookies too.
   */
  useSecureCookies: useSecureAuthCookies,
  cookies: {
    sessionToken: {
      // Pinned rather than derived, because signaling verifies this exact name
      // and uses it as the JWT salt (apps/signaling/src/auth/jwt.ts).
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        // `lax` is the ceiling here, not a default: the Google callback and the
        // desktop flow's return from the external browser are both top-level
        // cross-site navigations back to this origin, and `strict` would keep
        // the browser from sending the cookie on them.
        sameSite: 'lax',
        path: '/',
        secure: useSecureAuthCookies,
      },
    },
  },
  providers: [
    CredentialsProvider({
      id: 'guest',
      name: 'Guest',
      credentials: { userId: { type: 'text' } },
      async authorize({ userId }) {
        let guest;
        if (userId) {
          guest = await adapter.getUser!(userId as string);
          if (!guest) return null;
        } else {
          const name = generateSlug(2, { format: 'sentence' });
          const avatar = new Avatar(style, { seed: name });
          guest = await adapter.createUser!({
            name,
            image: avatar.toDataUri(),
            role: 'guest',
          } satisfies NewUser);
        }

        return {
          id: guest.id,
          name: guest.name,
          image: guest.image,
          role: guest.role,
        };
      },
    }),
    /**
     * Redeems the code the desktop app received on its loopback listener after
     * the user picked an account in the system browser (see
     * ./desktopHandoff.ts). It is called from the Electron window itself, so the
     * session cookie Auth.js sets lands in the Electron cookie jar — which is
     * the whole point of the round trip, because signaling authenticates that
     * cookie.
     */
    CredentialsProvider({
      id: 'desktop',
      name: 'Desktop browser sign-in',
      credentials: { code: { type: 'text' }, verifier: { type: 'text' } },
      async authorize({ code, verifier }) {
        if (typeof code !== 'string' || typeof verifier !== 'string') return null;

        const userId = await redeemHandoffCode(code, verifier);
        if (!userId) return null;

        const user = await adapter.getUser!(userId);
        // A guest never goes through the browser flow; refuse to mint one here.
        if (!user || user.role === 'guest') return null;

        return {
          id: user.id,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),
  ],
  callbacks: {
    async jwt(data) {
      const { token, user } = data;
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
};

const nextAuth = NextAuth(config);

export const handlers: typeof nextAuth.handlers = nextAuth.handlers;
export const signIn: typeof nextAuth.signIn = nextAuth.signIn;
export const signOut: typeof nextAuth.signOut = nextAuth.signOut;
export const auth: typeof nextAuth.auth = nextAuth.auth;
