import { redirect } from 'next/navigation';
import { StreamCard } from './StreamCard';
import { Paginator } from '@/app/components/Paginator';
import { ScreenShareOff } from 'lucide-react';
import { Typography } from '@/app/components/ui/Typography';
import { Button } from '@/app/components/ui/Button';
import { Link } from '@/app/components/ui/Link';
import { StreamStatus } from '@stream-share/db';
import { getStreams } from '@/app/api/streams/server';

export async function StreamList(props: { currentPage: number }) {
  const limit = 12;
  const { currentPage } = props;
  if (!isValidPage(currentPage)) return redirect('/?page=1');
  const offset = (currentPage - 1) * limit;
  const {
    data: streams,
    meta: { count },
  } = await getStreams({ limit, offset, filters: { status: StreamStatus.Live } });

  const lastPage = Math.ceil(count / limit);
  if (count && offset >= count) return redirect(`/?page=${lastPage}`);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 rounded-md bg-surface p-4">
      {!!count ? (
        <>
          <div className="min-h-0 grow overflow-x-hidden overflow-y-auto">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
              {streams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          </div>
          <Paginator
            className="mt-auto pt-4"
            total={lastPage}
            current={currentPage}
            getHref={getHref}
          />
        </>
      ) : (
        <div className="flex grow flex-col items-center justify-center gap-4">
          <ScreenShareOff className="mb-2" size="96" />
          <div className="flex flex-col items-center">
            <Typography>No one{"'"}s live right now</Typography>
            <Typography tone="muted" size="sm">
              Be the first
            </Typography>
          </div>
          <Button appearance="solid">
            <Link href="/broadcast" variant="unstyled">
              Start streaming
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function isValidPage(page: number): boolean {
  return Number.isInteger(page) && page > 0;
}

function getHref(page: number) {
  return `/?page=${page}`;
}
