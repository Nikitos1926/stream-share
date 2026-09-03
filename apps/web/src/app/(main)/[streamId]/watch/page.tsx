import { getStream } from '@/app/api/streams/server';
import { NotFoundState } from '@/app/components/common/NotFoundState';
import { StreamEnded } from '@/app/components/video/StreamEnded';
import { StreamStatus } from '@stream-share/db';
import { Watch } from './Watch';
import { ErrorState } from '@/app/components/common/ErrorState';

export default async function WatchPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params;
  let response;
  try {
    response = await getStream(streamId);
  } catch {
    return <ErrorState />;
  }

  if (!response.data) {
    return <NotFoundState title="Stream not found" />;
  }

  if (response.data.status === StreamStatus.Ended) {
    return <StreamEnded />;
  }
  return <Watch />;
}
