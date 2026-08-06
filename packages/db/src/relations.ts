import { BuildQueryResult, DBQueryConfig, defineRelations } from 'drizzle-orm';
import * as schemas from './schemas';
import { shortUserView } from './schemas';

export const relations = defineRelations(schemas, (r) => ({
  streams: {
    viewers: r.many.users({
      from: r.streams.id.through(r.streamsToUsers.streamId),
      to: r.users.id.through(r.streamsToUsers.userId),
    }),
    streamer: r.one.users({
      from: r.streams.userId,
      to: r.users.id,
    }),
  },
}));

export type Relations = typeof relations;
type QueryConfig<TTableName extends keyof Relations> = DBQueryConfig<
  'one' | 'many',
  Relations,
  Relations[TTableName]
>;
export type InferQueryModel<
  TTableName extends keyof Relations,
  TConfig extends QueryConfig<TTableName> = Record<string, never>,
> = BuildQueryResult<Relations, Relations[TTableName], TConfig>;

export type StreamWithRelations = InferQueryModel<
  'streams',
  {
    with: {
      streamer: {
        columns: typeof shortUserView;
      };
      viewers: {
        columns: typeof shortUserView;
      };
    };
  }
>;
