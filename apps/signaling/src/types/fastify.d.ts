import 'fastify';
import type { DiService } from '../services/di.service';
import type { Database } from '@stream-share/db';

declare module 'fastify' {
  interface FastifyInstance {
    di: DiService;
    db: Database;
  }
  interface FastifyRequest {
    context: Record<string, unknown>;
  }
}
