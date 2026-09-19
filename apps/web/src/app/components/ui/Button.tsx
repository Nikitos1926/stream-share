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
        sm: 'h-6 gap-1.5 rounded-md px-2',
        md: 'h-8 gap-1.5 rounded-md px-3',
        lg: 'h-10 rounded-md px-6',
      },
    },
    compoundVariants: [
      {
        variant: 'primary',
        appearance: 'outline',
        class:
          'border-accent bg-transparent text-accent hover:bg-accent/10 active:bg-accent active:text-canvas',
      },
      {
        variant: 'primary',
        appearance: 'solid',
        class:
          'border-accent bg-accent text-canvas hover:border-accent-hover hover:bg-accent-hover active:border-accent-active active:bg-accent-active',
      },
      {
        variant: 'secondary',
        appearance: 'outline',
        class: 'border-line bg-transparent text-stroke hover:bg-surface/50',
      },
      {
        variant: 'secondary',
        appearance: 'solid',
        class: 'border-line bg-surface text-stroke hover:bg-surface/70 active:bg-surface/50',
      },
      {
        variant: 'ghost',
        appearance: 'outline',
        class: 'border-line bg-transparent text-stroke-muted hover:bg-surface/50 hover:text-stroke',
      },
      {
        variant: 'ghost',
        appearance: 'solid',
        class:
          'border-transparent bg-surface/50 text-stroke-muted hover:bg-surface/70 hover:text-stroke',
      },
      {
        variant: 'destructive',
        appearance: 'outline',
        class:
          'border-danger bg-transparent text-danger hover:bg-danger/10 active:bg-danger active:text-canvas',
      },
      {
        variant: 'destructive',
        appearance: 'solid',
        class:
          'border-danger bg-danger text-canvas hover:border-danger-hover hover:bg-danger-hover active:border-danger-active active:bg-danger-active',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      appearance: 'outline',
      size: 'md',
    },
  },
);

export type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = 'button',
  appearance,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, className, appearance }))}
      {...props}
    >
      {children}
    </button>
  );
}
