import { cn } from '@/lib/utils/cn.util';
import { cva, VariantProps } from 'class-variance-authority';
import { ComponentProps, FC, useCallback, ChangeEvent } from 'react';

const inputVariants = cva('rounded-lg border border-line bg-canvas px-2 outline-none', {
  variants: {
    variant: {
      default: 'py-1',
    },
    size: {
      default: 'w-full',
      w60: 'w-60',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export type InputProps = Omit<ComponentProps<'input'>, 'onChange'> &
  VariantProps<typeof inputVariants> & {
    onChange?: (value: string | number) => void;
  };

export const Input: FC<InputProps> = ({
  variant,
  size,
  className,
  onChange,
  readOnly,
  ...props
}) => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (readOnly) return;

      let value: string | number = event.target.value;
      if (props.type === 'number') {
        value = Number(value);
      }

      onChange?.(value);
    },
    [onChange, props.type, readOnly],
  );

  return (
    <input
      {...props}
      readOnly={readOnly}
      value={onChange ? String(props.value ?? '') : props.value}
      className={cn(inputVariants({ variant, size, className }))}
      onChange={handleChange}
    />
  );
};
