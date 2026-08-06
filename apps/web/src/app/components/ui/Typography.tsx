import { cn } from '@/lib/utils/cn.util';
import { cva, VariantProps } from 'class-variance-authority';
import { ComponentProps, ElementType, PropsWithChildren } from 'react';

export const textVariants = cva([], {
  variants: {
    tone: {
      default: 'text-stroke',
      muted: 'text-stroke-muted',
      accent: 'text-accent',
      danger: 'text-danger',
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
    },
  },
  defaultVariants: {
    tone: 'default',
    size: 'base',
  },
});
export type TextVariants = VariantProps<typeof textVariants>;

type Tags = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

type TypographyProps<T extends Tags> = PropsWithChildren<
  ComponentProps<T> & VariantProps<typeof textVariants> & { tag?: T }
>;

export const Typography = <T extends Tags>({
  tag,
  tone,
  size,
  className,
  ...props
}: TypographyProps<T>) => {
  const Tag = (tag ?? 'span') as ElementType;

  return <Tag {...props} className={cn(textVariants({ tone, size, className }))} />;
};
