import { ComponentProps, FC } from 'react';

interface Option {
  value: string;
  label: string;
}
export interface SelectProps extends ComponentProps<'select'> {
  options: Option[];
}

export const Select: FC<SelectProps> = (props) => {
  const { options, ...rest } = props;
  return (
    <select {...rest} className="bg-canvas">
      <option value="" className="hidden">
        Select...
      </option>
      {options.map((option) => (
        <option value={option.value} key={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
