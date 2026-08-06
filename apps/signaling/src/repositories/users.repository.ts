import { streamsToUsers, User, users } from '@stream-share/db';
import { and, eq, inArray } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

export class UsersRepository {
  constructor(private readonly app: FastifyInstance) {}

  get db() {
    return this.app.db;
  }

  async getOne(userId: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({ where: { id: userId } });
  }

  async pruneGuest(userId: string): Promise<{ id: string } | undefined> {
    const [result] = await this.db
      .delete(users)
      .where(and(eq(users.role, 'guest'), eq(users.id, userId)))
      .returning({ id: users.id });
    return result;
  }

  async pruneGuestsByStream(streamId: string): Promise<{ id: string }[]> {
    return this.db
      .delete(users)
      .where(
        and(
          eq(users.role, 'guest'),
          inArray(
            users.id,
            this.db
              .select({ id: streamsToUsers.userId })
              .from(streamsToUsers)
              .where(eq(streamsToUsers.streamId, streamId)),
          ),
        ),
      )
      .returning({ id: users.id });
  }
}
