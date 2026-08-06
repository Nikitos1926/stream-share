import * as t from 'drizzle-orm/pg-core';

export const users = t.pgTable('user', {
  id: t
    .text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: t.varchar({ length: 512 }).unique('user_email_unique'),
  emailVerified: t.timestamp('emailVerified', { mode: 'date' }),
  image: t.text('image'),
  name: t.varchar({ length: 255 }),
  passwordHash: t.text('password_hash'),
  role: t
    .varchar({ enum: ['user', 'admin', 'guest'] })
    .notNull()
    .default('user'),
  status: t
    .varchar({ enum: ['active', 'blocked', 'deleted'] })
    .notNull()
    .default('active'),
  failedLoginCount: t.integer('failed_login_count').notNull().default(0),
  lockedUntil: t.timestamp('locked_until', { withTimezone: true }),
  createdAt: t.timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const shortUserView = { id: true, name: true, image: true } as const;
export const userView = {
  ...shortUserView,
  email: true,
  status: true,
  role: true,
  createdAt: true,
} as const;

export type NewUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
