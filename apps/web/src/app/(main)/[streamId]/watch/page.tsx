import { StreamStatus } from '@stream-share/db';
import { Watch } from './Watch';
import { getStream } from '@/app/api/streams/server';

export default async function WatchPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params;
  let response;
  try {
    response = await getStream(streamId);
  } catch {
    return (
      <>
        <div>Error</div>
      </>
    );
  }

  if (!response.data) {
    return (
      <>
        <div>404</div>
      </>
    );
  }

  // TODO
  if (response.data.status === StreamStatus.Ended) {
    return (
      <>
        <div>Ended</div>
      </>
    );
  }
  return <Watch />;
}
