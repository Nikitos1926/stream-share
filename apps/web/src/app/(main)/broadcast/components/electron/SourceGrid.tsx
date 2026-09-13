import { SkeletonBlock } from '@/app/components/common/SkeletonBlock';
import { Source } from '@/lib/types';
import { SourceCard } from './SourceCard';

type SourceGridProps = {
  sources: Source[] | null;
  isLoading: boolean;
  activeTab: 'apps' | 'screens';
  onSelect: (id: string) => void;
};

export function SourceGrid({ sources, isLoading, activeTab, onSelect }: SourceGridProps) {
  if (isLoading || !sources) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <SkeletonBlock className="aspect-video size-full" />
            <SkeletonBlock className="h-6 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  const filtered = sources.filter((s) => (activeTab === 'screens' ? s.isScreen : !s.isScreen));

  return (
    <div className="grid grid-cols-2 gap-4">
      {filtered.map((source) => (
        <SourceCard key={source.id} source={source} onSelect={onSelect} />
      ))}
    </div>
  );
}
