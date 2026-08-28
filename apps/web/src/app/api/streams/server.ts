import { Stream, StreamWithRelations } from '@stream-share/db';
import { ListParams } from '@stream-share/shared';
import { cookies } from 'next/headers';
import { signalingUrl } from '@/lib/signaling';

export const getStream = async (streamId: string) => {
  const response = await fetch(signalingUrl(`/streams/${streamId}`));

  if (!response.ok) {
    if (response.status === 404) return { data: null };
    throw new Error(`Failed to fetch stream by id "${streamId}": ${response.status}`);
  }

  return response.json() as Promise<{
    data: StreamWithRelations;
  }>;
};

export const getStreams = async (params?: Partial<ListParams<Stream>>) => {
  const cookieStore = await cookies();
  let response;
  try {
    response = await fetch(signalingUrl('/streams/search'), {
      method: 'post',
      headers: {
        'content-type': 'application/json',
        cookie: cookieStore.toString(),
      },
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch streams: ${response.status}`);
  }

  return response.json() as Promise<{
    data: StreamWithRelations[];
    meta: {
      limit: number;
      offset: number;
      count: number;
    };
  }>;
};
