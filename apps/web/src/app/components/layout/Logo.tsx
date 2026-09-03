import { cn } from '@/lib/utils/cn.util';

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 34" className={cn('text-stroke', className)}>
      <rect
        x="5"
        y="6"
        width="24"
        height="17"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <line
        x1="17"
        y1="23"
        x2="17"
        y2="28"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <line
        x1="11"
        y1="28"
        x2="23"
        y2="28"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="30" cy="8" r="5.2" className="fill-accent" />
    </svg>
  );
}
