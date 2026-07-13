import * as t from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export type NewStream = typeof streams.$inferInsert;
export type Stream = typeof streams.$inferSelect;
export type StreamColumns = keyof Stream;

export const streams = t.pgTable('stream', {
  id: t
    .text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: t
    .text('user_id')
    .references(() => users.id)
    .notNull(),
  startedAt: t.timestamp({ withTimezone: true }).defaultNow(),
  endedAt: t.timestamp({ withTimezone: true }),
  endReason: t.varchar({ enum: ['streamer_stop', 'admin_force', 'timeout', 'error'] }),
  status: t.varchar({ enum: ['created', 'connecting', 'live', 'ended'] }).default('created'),
});
