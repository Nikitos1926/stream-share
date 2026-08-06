import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { UsersService } from '../services/users.service';
import { EntityNotFoundError } from '../errors/EntityNotFound.error';

export class UsersController {
  constructor(
    private readonly app: FastifyInstance,
    private readonly usersService: UsersService,
  ) {}

  initRoutes() {
    this.app.get<{ Params: { userId: string } }>('/users/:userId', this.handleGetUser);
  }

  private handleGetUser = async (
    req: FastifyRequest<{ Params: { userId: string } }>,
    res: FastifyReply,
  ) => {
    if (!req.params.userId)
      return res.status(400).send({ error: { message: 'User id is required' } });
    try {
      const user = await this.usersService.getOne(req.params.userId);
      console.log(req.params);
      console.log('User sever:', user);
      res.status(200).send({ data: user });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        res.status(404).send({
          error: {
            message: error.message,
          },
        });
      } else if (error instanceof Error) {
        res.status(500).send({
          error: {
            message: error.message,
          },
        });
      }
      this.app.log.error(error);
    }
  };
}
