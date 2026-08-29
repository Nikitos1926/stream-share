import { NewUser } from '@stream-share/db';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '../db';
import { DrizzleAdapter } from '../db/adapter';
import { env } from '../env/server';
import CredentialsProvider from 'next-auth/providers/credentials';
import { Style, Avatar } from '@dicebear/core';
import identicon from '@dicebear/styles/identicon.json' with { type: 'json' };
import { generateSlug } from 'random-word-slugs';

const adapter = DrizzleAdapter(db);
const style = new Style(identicon);

const config: NextAuthConfig = {
  adapter,
  session: {
    strategy: 'jwt',
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
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
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
