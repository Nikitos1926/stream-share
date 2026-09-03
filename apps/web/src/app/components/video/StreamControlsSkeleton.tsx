import { SkeletonBlock } from '../common/SkeletonBlock';

export function StreamControlsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex flex-col items-center gap-4 md:flex-row">
          <SkeletonBlock className="h-8 w-32" />

          <div className="flex flex-col gap-1.5">
            <div className="rounded-lg px-2.5">
              <div className="mb-1.5 flex justify-center">
                <SkeletonBlock className="h-3.5 w-14" />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <SkeletonBlock className="h-6 w-12" />
                <SkeletonBlock className="h-6 w-12" />
                <SkeletonBlock className="h-6 w-12" />
                <SkeletonBlock className="h-6 w-12" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <SkeletonBlock className="h-8 w-8" />
            <SkeletonBlock className="h-8 w-8" />
          </div>
        </div>

        <SkeletonBlock className="h-8 w-32" />
      </div>

      <div className="flex items-center gap-2 border-t border-line pt-3">
        <SkeletonBlock className="h-3 w-16 shrink-0" />
        <SkeletonBlock className="h-8 min-w-0 flex-1" />
        <SkeletonBlock className="h-6 w-14 shrink-0" />
      </div>
    </div>
  );
}
