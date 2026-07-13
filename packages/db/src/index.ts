import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Relations, relations } from './relations';
import * as schema from './schemas';

export * from './schemas';
export * from './relations';

export type Database = NodePgDatabase<typeof schema, Relations>;

export function createDb(url: string): Database {
  return drizzle(url, { schema, relations });
}
