import { Stream, StreamWithRelations } from '@stream-share/db';
import { ListParams } from '@stream-share/shared';
import { cookies } from 'next/headers';

export const getStreams = async (params?: Partial<ListParams<Stream>>) => {
  const cookieStore = await cookies();
  let response;
  try {
    response = await fetch('http://localhost:4000/streams/search', {
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
