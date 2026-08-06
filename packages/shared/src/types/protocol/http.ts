import type { Relations, Stream, StreamColumns } from '@stream-share/db';
import type { RelationsFilter } from 'drizzle-orm';

export type StreamsFilter = RelationsFilter<Relations['streams'], Relations>;

export type ListParams<T extends Stream> = {
  limit: number;
  offset: number;
} & (T extends Stream
  ? { filters: StreamsFilter; sort: [StreamColumns, 'asc' | 'desc'][] }
  : never);
