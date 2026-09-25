import { cn } from '@/lib/utils/cn.util';
import * as React from 'react';

type TooltipProps = {
  /** Falsy content renders the children alone, so callers can pass a conditional message. */
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Hover/focus tooltip shown above its child. Pure CSS, so it also works on a
 * disabled button (the wrapper receives the hover). Styled like the Slider's
 * value tooltip.
 */
export function Tooltip({ content, children, className }: TooltipProps) {
  if (!content) return <>{children}</>;

  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-64 -translate-x-1/2',
          'rounded-sm border border-line bg-surface px-2 py-1 font-mono text-[11px] text-stroke normal-case',
          'opacity-0 transition-opacity duration-100 group-focus-within:opacity-100 group-hover:opacity-100',
        )}
      >
        {content}
        <span className="absolute top-full left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-line bg-surface" />
      </span>
    </span>
  );
}
