import { NewUser, streamsToUsers, User, users } from '@stream-share/db';
import { and, eq, lt, notExists } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

export class UsersRepository {
  private static readonly guestActivityPeriod = 7 * 24 * 60 * 60 * 1000;
  constructor(private readonly app: FastifyInstance) {}

  get db() {
    return this.app.db;
  }

  async getOne(userId: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({ where: { id: userId } });
  }

  async update(user: Partial<Omit<NewUser, 'id'>> & { id: string }): Promise<User | undefined> {
    const [result] = await this.db.update(users).set(user).where(eq(users.id, user.id)).returning();
    return result;
  }
  async pruneGuests(): Promise<{ id: string }[]> {
    return this.db
      .delete(users)
      .where(
        and(
          eq(users.role, 'guest'),
          notExists(
            this.db.select().from(streamsToUsers).where(eq(streamsToUsers.userId, users.id)),
          ),
          lt(users.activeAt, new Date(Date.now() - UsersRepository.guestActivityPeriod)),
        ),
      )
      .returning({ id: users.id });
  }
}
