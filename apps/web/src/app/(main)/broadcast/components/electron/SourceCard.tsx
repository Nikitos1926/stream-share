import { Typography } from '@/app/components/ui/Typography';
import { Source } from '@/lib/types';

type SourceCardProps = {
  source: Source;
  onSelect: (id: string) => void;
};

export function SourceCard({ source, onSelect }: SourceCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(source.id)}
      className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface shadow-md transition-transform duration-200 hover:z-10 hover:scale-105 hover:shadow-xl hover:shadow-black/40"
    >
      <div className="flex aspect-video size-full justify-center gap-2 rounded-lg bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={source.thumbnail} alt="" className="aspect-video size-full object-contain" />
      </div>
      <div className="flex size-full items-center gap-2 px-2 pb-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {!source.isScreen && <img src={source.appIcon} alt="" className="size-4" />}
        <Typography className="overflow-hidden text-ellipsis whitespace-nowrap">
          {source.name}
        </Typography>
      </div>
    </button>
  );
}
