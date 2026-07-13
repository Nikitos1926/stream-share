import * as t from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const auditLog = t.pgTable('audit_log', {
  id: t.uuid().defaultRandom().primaryKey(),
  actorUserId: t.text('actor_user_id').references(() => users.id),
  action: t.text(),
  targetType: t.text(),
  targetId: t.text(),
  metadata: t.jsonb(),
  createdAt: t.timestamp({ withTimezone: true }).defaultNow(),
});
