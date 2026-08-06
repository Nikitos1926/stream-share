import * as t from 'drizzle-orm/pg-core';
import { streams } from './streams.schema';
import { users } from './users.schema';

export type StreamsToUsers = typeof streamsToUsers.$inferInsert;

export const streamsToUsers = t.pgTable(
  'stream_to_user',
  {
    id: t
      .text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    streamId: t
      .text('stream_id')
      .notNull()
      .references(() => streams.id, { onDelete: 'cascade' }),
    userId: t
      .text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (streamsToUsers) => [
    {
      compoundKey: t.primaryKey({
        columns: [streamsToUsers.streamId, streamsToUsers.userId],
      }),
    },
  ],
);
