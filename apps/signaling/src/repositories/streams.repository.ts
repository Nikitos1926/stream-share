import {
  NewStream,
  StreamsToUsers,
  Stream,
  streams,
  streamsToUsers,
  StreamColumns,
  Relations,
  shortUserView,
  StreamsWithRelations,
} from '@stream-share/db';
import { FastifyInstance } from 'fastify';
import { eq, and, RelationsFilter, relationsFilterToSQL } from 'drizzle-orm';

export class StreamsRepository {
  constructor(private readonly app: FastifyInstance) {}

  get db() {
    return this.app.db;
  }

  async getOne(streamId: string): Promise<Stream | undefined> {
    return this.db.query.streams.findFirst({ where: { id: streamId } });
  }

  async getList(params: ListParams): Promise<{ streams: StreamsWithRelations[]; count: number }> {
    const { limit, offset, filters, sort } = params;
    const [list, count] = await Promise.all([
      this.db.query.streams.findMany({
        limit,
        offset,
        orderBy: Object.fromEntries(sort),
        where: filters,
        with: {
          streamer: {
            columns: shortUserView,
          },
          viewers: {
            columns: shortUserView,
          },
        },
      }),
      this.db.$count(streams, relationsFilterToSQL(streams, filters as RelationsFilterArg)),
    ]);
    return { streams: list, count };
  }

  async insertStream(stream: NewStream): Promise<Stream | undefined> {
    const [result] = await this.db.insert(streams).values(stream).returning();
    return result;
  }

  async updateStream(
    stream: Partial<Omit<NewStream, 'id'>> & { id: string },
  ): Promise<Stream | undefined> {
    const [result] = await this.db
      .update(streams)
      .set(stream)
      .where(eq(streams.id, stream.id))
      .returning();
    return result;
  }

  async addViewer(data: StreamsToUsers): Promise<void> {
    await this.db.insert(streamsToUsers).values(data);
  }

  async removeViewersByStream(streamId: string): Promise<{ id: string }[] | undefined> {
    return this.db
      .delete(streamsToUsers)
      .where(eq(streamsToUsers.streamId, streamId))
      .returning({ id: streamsToUsers.id });
  }

  async removeViewer(data: StreamsToUsers): Promise<{ id: string } | undefined> {
    const [result] = await this.db
      .delete(streamsToUsers)
      .where(
        and(eq(streamsToUsers.streamId, data.streamId), eq(streamsToUsers.userId, data.userId)),
      )
      .returning({ id: streamsToUsers.id });
    return result;
  }
}

type RelationsFilterArg = Parameters<typeof relationsFilterToSQL>[1];

export type StreamsFilter = RelationsFilter<Relations['streams'], Relations>;

export type ListParams = {
  limit: number;
  offset: number;
  filters: StreamsFilter;
  sort: [StreamColumns, 'asc' | 'desc'][];
};
