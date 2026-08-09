import { Stream, StreamWithRelations } from '@stream-share/db';

export const createStream = async (isPrivate = false) => {
  let response;
  try {
    response = await fetch('http://localhost:4000/streams', {
      method: 'post',
      credentials: 'include',
      body: JSON.stringify({ isPrivate }),
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.log(error);
    // toastContext.error
    return;
  }
  if (!response.ok) {
    // toastContext.error
    return;
  }
  try {
    const { data } = (await response.json()) as { data: Stream };
    return data;
  } catch (error) {
    console.log(error);
    // toastContext.error
  }
};

export const getStream = async (streamId: string) => {
  const response = await fetch(`http://localhost:4000/streams/${streamId}`);

  if (!response.ok) {
    if (response.status === 404) return { data: null };
    throw new Error(`Failed to fetch stream by id "${streamId}": ${response.status}`);
  }

  return response.json() as Promise<{
    data: StreamWithRelations;
  }>;
};
