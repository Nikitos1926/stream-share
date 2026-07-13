import { FastifyReply } from 'fastify/types/reply';
import { FastifyRequest } from 'fastify/types/request';
import { decodeAuthToken, NEXT_AUTH_SALT } from './jwt';

export const validateWsJwt = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const rawToken = req.cookies[NEXT_AUTH_SALT];

  if (!rawToken) {
    reply.code(401).send({ error: 'Missing token' });
    return;
  }

  const payload = await decodeAuthToken(rawToken);

  if (!payload) {
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }

  req.context.userId = payload.sub;
};
