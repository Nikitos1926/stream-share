import { StreamWithRelations } from '@stream-share/db';
import { Play } from 'lucide-react';
import { Typography } from '@/app/components/ui/Typography';
import { Link } from '@/app/components/ui/Link';

export async function StreamCard(props: { stream: StreamWithRelations }) {
  const { stream } = props;

  return (
    <div className="group scale-3d rounded-lg border border-line shadow-md transition-transform duration-200 hover:scale-105 hover:shadow-xl hover:shadow-black/40">
      <div className="relative aspect-video overflow-hidden rounded-lg">
        <Link href={`${stream.id}/watch`} variant="unstyled" className="absolute inset-0 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`http://localhost:4000/streams/${stream.id}/thumbnail?t=${stream.thumbnailUpdatedAt}`}
            alt={stream.streamer!.name!}
            className="size-full object-contain"
          />
          <div className="absolute inset-0 origin-bottom scale-y-[0.25] bg-linear-to-t from-black/90 via-black/60 to-transparent transition-transform duration-300 group-hover:scale-y-100" />
          <Typography className="absolute bottom-2 left-2 transition-opacity group-hover:opacity-0">
            {stream.streamer!.name}
          </Typography>
          <Play className="absolute top-1/2 left-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-accent opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </div>
    </div>
  );
}
