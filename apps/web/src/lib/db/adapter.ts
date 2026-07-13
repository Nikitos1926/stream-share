import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Adapter, AdapterAccount, AdapterUser } from '@auth/core/adapters';
import { users, accounts } from '@stream-share/db';

type DB = NodePgDatabase;

export function DrizzleAdapter(db: DB): Adapter {
  return {
    async createUser(data) {
      const [user] = await db
        .insert(users)
        .values({ ...data, id: data.id ?? crypto.randomUUID() })
        .returning();
      if (!user) throw new Error('createUser: insert вернул пустой результат');
      return user as AdapterUser;
    },

    async getUser(id) {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return (user as AdapterUser) ?? null;
    },

    async getUserByEmail(email) {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return (user as AdapterUser) ?? null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const result = await db
        .select({ user: users })
        .from(accounts)
        .innerJoin(users, eq(accounts.userId, users.id))
        .where(
          and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)),
        )
        .limit(1);
      return (result[0]?.user as AdapterUser) ?? null;
    },

    async getAccount(providerAccountId, provider) {
      const [account] = await db
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)),
        )
        .limit(1);
      return (account as AdapterAccount) ?? null;
    },

    async updateUser(data) {
      if (!data.id) throw new Error('updateUser: отсутствует id');
      const { id, ...set } = data;
      const [user] = await db.update(users).set(set).where(eq(users.id, id)).returning();
      if (!user) throw new Error(`updateUser: пользователь ${id} не найден`);
      return user as AdapterUser;
    },

    async deleteUser(userId) {
      await db.delete(users).where(eq(users.id, userId));
    },

    async linkAccount(data) {
      await db.insert(accounts).values(data);
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await db
        .delete(accounts)
        .where(
          and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)),
        );
    },
  };
}
