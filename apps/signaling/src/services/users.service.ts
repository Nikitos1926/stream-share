import { NewUser, User } from '@stream-share/db';
import { UserErrors } from '@stream-share/shared';
import { FastifyInstance } from 'fastify';
import { AsyncTask, CronJob } from 'toad-scheduler';
import { EntityNotFoundError } from '../errors/EntityNotFound.error';
import { UsersRepository } from '../repositories/users.repository';

export class UsersService {
  constructor(
    private readonly app: FastifyInstance,
    private readonly usersRepository: UsersRepository,
  ) {}

  async getOne(userId: string): Promise<User> {
    let user;
    try {
      user = await this.usersRepository.getOne(userId);
    } catch (error) {
      throw new Error(UserErrors.SELECTION_ERROR, { cause: error });
    }
    if (!user) throw new EntityNotFoundError('user');
    return user;
  }

  async update(user: Partial<Omit<NewUser, 'id'>> & { id: string }): Promise<User> {
    let updatedUser;
    try {
      updatedUser = await this.usersRepository.update(user);
    } catch (error) {
      throw new Error(UserErrors.UPDATE_ERROR, { cause: error });
    }
    if (!updatedUser) throw new EntityNotFoundError('user');
    return updatedUser;
  }

  pruneGuests = async (): Promise<{ id: string }[]> => {
    try {
      return this.usersRepository.pruneGuests();
    } catch (error) {
      throw new Error(UserErrors.DELETE_ERROR, { cause: error });
    }
  };

  async requireUser(userId: string): Promise<User> {
    const user = await this.usersRepository.getOne(userId);
    if (!user) throw new EntityNotFoundError('user');
    return user;
  }

  registerCronJobs(): void {
    const task = new AsyncTask('prune-stale-guest', this.pruneGuests, (err) =>
      this.app.log.error(err, 'cron job failed'),
    );

    const job = new CronJob(
      { cronExpression: '0 0 * * 1' }, // every monday 00:00
      task,
    );

    this.app.scheduler.addCronJob(job);
  }
}
