import { cn } from '@/lib/utils/cn.util';

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-md', className)} />;
}
