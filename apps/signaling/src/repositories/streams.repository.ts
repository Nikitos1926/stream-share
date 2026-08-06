import {
  NewStream,
  shortUserView,
  Stream,
  streams,
  StreamStatus,
  StreamsToUsers,
  streamsToUsers,
  StreamWithRelations,
} from '@stream-share/db';
import { ListParams } from '@stream-share/shared';
import { and, eq, inArray, ne, relationsFilterToSQL } from 'drizzle-orm';
import { FastifyInstance } from 'fastify';

export class StreamsRepository {
  constructor(private readonly app: FastifyInstance) {}

  get db() {
    return this.app.db;
  }

  async getOne(streamId: string): Promise<Stream | undefined> {
    return this.db.query.streams.findFirst({ where: { id: streamId } });
  }

  async getLiveByUserId(userId: string): Promise<Stream | undefined> {
    return this.db.query.streams.findFirst({
      where: { userId, status: StreamStatus.Live },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getList(
    params: ListParams<Stream>,
  ): Promise<{ streams: StreamWithRelations[]; count: number }> {
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

  async insert(stream: NewStream): Promise<Stream | undefined> {
    const [result] = await this.db.insert(streams).values(stream).returning();
    return result;
  }

  async update(
    stream: Partial<Omit<NewStream, 'id'>> & { id: string },
  ): Promise<Stream | undefined> {
    const [result] = await this.db
      .update(streams)
      .set(stream)
      .where(eq(streams.id, stream.id))
      .returning();
    return result;
  }

  async batchUpdate(
    streamIds: string[],
    stream: Partial<Omit<NewStream, 'id'>>,
  ): Promise<Stream[]> {
    return this.db.update(streams).set(stream).where(inArray(streams.id, streamIds)).returning();
  }

  async updateUnfinishedStreams(stream: Partial<Omit<NewStream, 'id'>>): Promise<Stream[]> {
    return this.db
      .update(streams)
      .set(stream)
      .where(ne(streams.status, StreamStatus.Ended))
      .returning();
  }

  async addViewer(data: StreamsToUsers): Promise<void> {
    await this.db.insert(streamsToUsers).values(data);
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

  async removeViewersByStream(streamId: string): Promise<{ id: string }[] | undefined> {
    return this.db
      .delete(streamsToUsers)
      .where(eq(streamsToUsers.streamId, streamId))
      .returning({ id: streamsToUsers.id });
  }

  async removeViewersByStreams(streamIds: string[]): Promise<{ id: string }[] | undefined> {
    return this.db
      .delete(streamsToUsers)
      .where(inArray(streamsToUsers.streamId, streamIds))
      .returning({ id: streamsToUsers.id });
  }
}

type RelationsFilterArg = Parameters<typeof relationsFilterToSQL>[1];
