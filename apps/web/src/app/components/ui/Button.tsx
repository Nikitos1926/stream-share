import { cn } from '@/lib/utils/cn.util';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const buttonVariants = cva(
  [
    'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap',
    'font-mono text-sm font-medium tracking-wide uppercase select-none',
    'rounded-sm border transition-colors duration-100',
    'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none',
    'disabled:pointer-events-none disabled:opacity-40',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: '',
        secondary: '',
        ghost: '',
        destructive: '',
        icon: '',
        unstyled: 'border-none focus-visible:ring-0',
      },
      appearance: {
        solid: '',
        outline: '',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-6 gap-1.5 rounded-md px-2',
        md: 'h-8 gap-1.5 rounded-md px-3',
        lg: 'h-10 rounded-md px-6',
      },
    },
    compoundVariants: [
      // primary
      {
        variant: 'primary',
        appearance: 'outline',
        class:
          'border-accent bg-transparent text-accent hover:bg-accent/10 active:bg-accent/80 active:text-black',
      },
      {
        variant: 'primary',
        appearance: 'solid',
        class: 'border-accent bg-accent text-surface hover:bg-accent/90 active:bg-accent/80',
      },
      // secondary
      {
        variant: 'secondary',
        appearance: 'outline',
        class: 'text-fg border-line-strong bg-transparent hover:bg-surface/50',
      },
      {
        variant: 'secondary',
        appearance: 'solid',
        class: 'text-fg border-line bg-surface hover:bg-surface/70 active:bg-surface/50',
      },
      // ghost — outline у ghost обычно не имеет смысла, но для единообразия API можно оставить оба
      {
        variant: 'ghost',
        appearance: 'outline',
        class: 'text-fg-muted hover:text-fg border-line bg-transparent hover:bg-surface/50',
      },
      {
        variant: 'ghost',
        appearance: 'solid',
        class: 'text-fg-muted hover:text-fg border-transparent bg-surface/50 hover:bg-surface/70',
      },
      // destructive
      {
        variant: 'destructive',
        appearance: 'outline',
        class: 'border-danger bg-transparent text-danger hover:bg-danger/10 active:bg-danger/80',
      },
      {
        variant: 'destructive',
        appearance: 'solid',
        class: 'border-danger bg-danger text-surface hover:bg-danger/90 active:bg-danger/80',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      appearance: 'outline',
      size: 'default',
    },
  },
);

export function Button({
  className,
  variant = 'primary',
  size = 'default',
  type = 'button',
  children,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </button>
  );
}
