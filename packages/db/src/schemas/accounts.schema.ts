import * as t from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const accounts = t.pgTable(
  'account',
  {
    userId: t
      .text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: t.text('type').notNull(),
    provider: t.text('provider').notNull(),
    providerAccountId: t.text('providerAccountId').notNull(),
    // Snake_case property names are intentional — they must match the
    // AdapterAccount keys Auth.js passes to linkAccount(), or the token
    // fields get silently dropped on insert.
    refresh_token: t.text('refresh_token'),
    access_token: t.text('access_token'),
    expires_at: t.integer('expires_at'),
    token_type: t.text('token_type'),
    scope: t.text('scope'),
    id_token: t.text('id_token'),
    session_state: t.text('session_state'),
  },
  (account) => [t.primaryKey({ columns: [account.provider, account.providerAccountId] })],
);
