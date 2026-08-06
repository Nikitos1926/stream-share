import { UsersRepository } from '../repositories/users.repository';
import { EntityNotFoundError } from '../errors/EntityNotFound.error';
import { UserErrors } from '@stream-share/shared';
import { User } from '@stream-share/db';

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getOne(userId: string): Promise<User> {
    let user;
    try {
      user = await this.usersRepository.getOne(userId);
    } catch (error) {
      throw new Error(UserErrors.SELECTION_ERROR, { cause: error });
    }
    if (!user) throw new EntityNotFoundError('stream');
    return user;
  }

  async requireUser(userId: string): Promise<User> {
    const user = await this.usersRepository.getOne(userId);
    if (!user) throw new EntityNotFoundError('user');
    return user;
  }
}
