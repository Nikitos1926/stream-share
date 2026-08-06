import { cn } from '@/lib/utils/cn.util';
import { cva, VariantProps } from 'class-variance-authority';
import NextLink from 'next/link';

export const linkVariants = cva(['rounded-sm transition-colors duration-100'], {
  variants: {
    variant: {
      default: 'text-accent hover:text-accent/80',
      muted: 'text-stroke-muted',
      active: 'pointer-events-none font-semibold text-stroke',
      unstyled: 'focus:outline-none focus-visible:ring-0 focus-visible:outline-none',
    },
    underline: {
      always: 'underline underline-offset-2',
      hover: 'hover:underline hover:underline-offset-2',
      none: 'no-underline hover:no-underline',
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    variant: 'default',
    underline: 'hover',
    size: 'base',
  },
});

export type LinkVariants = VariantProps<typeof linkVariants>;
export function Link({
  className,
  href,
  variant,
  underline,
  size,
  children,
  ...props
}: React.ComponentProps<'a'> & VariantProps<typeof linkVariants> & { href: string }) {
  return (
    <NextLink
      href={href}
      className={cn(
        linkVariants({
          variant,
          underline: variant === 'unstyled' ? 'none' : underline,
          size,
          className,
        }),
      )}
      {...props}
    >
      {children}
    </NextLink>
  );
}
