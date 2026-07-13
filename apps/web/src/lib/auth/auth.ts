import { users } from '@stream-share/db';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { DrizzleAdapter } from '../db/adapter';
// import Credentials from 'next-auth/providers/credentials';

const config: NextAuthConfig = {
  adapter: DrizzleAdapter(db),
  session: {
    strategy: 'jwt',
  },
  providers: [
    // Credentials({
    //   // ... same as before
    // }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt(data) {
      const { token, user, trigger } = data;
      if (trigger === 'signUp' && user.id) {
        await db.update(users).set({ role: 'user' }).where(eq(users.id, user.id));
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: true,
};

const nextAuth = NextAuth(config);

export const handlers: typeof nextAuth.handlers = nextAuth.handlers;
export const signIn: typeof nextAuth.signIn = nextAuth.signIn;
export const signOut: typeof nextAuth.signOut = nextAuth.signOut;
export const auth: typeof nextAuth.auth = nextAuth.auth;
