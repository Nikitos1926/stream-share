import * as t from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export enum StreamStatus {
  Created = 'created',
  Connecting = 'connecting',
  Reconnecting = 'reconnecting',
  Live = 'live',
  Ended = 'ended',
}

export enum StreamEndReason {
  StreamerStop = 'streamer_stop',
  AdminForce = 'admin_force',
  Timeout = 'timeout',
  ServerForce = 'server_force',
}

export const streams = t.pgTable('stream', {
  id: t
    .text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: t
    .text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  isPrivate: t.boolean().default(false),
  status: t
    .varchar({
      enum: [
        StreamStatus.Created,
        StreamStatus.Connecting,
        StreamStatus.Reconnecting,
        StreamStatus.Live,
        StreamStatus.Ended,
      ],
    })
    .default(StreamStatus.Created),
  endReason: t.varchar({
    enum: [
      StreamEndReason.StreamerStop,
      StreamEndReason.AdminForce,
      StreamEndReason.Timeout,
      StreamEndReason.ServerForce,
    ],
  }),
  startedAt: t.timestamp({ withTimezone: true }).defaultNow(),
  endedAt: t.timestamp({ withTimezone: true }),
  thumbnailUpdatedAt: t.timestamp({ withTimezone: true }),
});

export type NewStream = typeof streams.$inferInsert;
export type Stream = typeof streams.$inferSelect;
export type StreamColumns = keyof Stream;
