import { Typography } from '../ui/Typography';

type ErrorStateProps = {
  code?: string | number;
  title?: string;
};

export function ErrorState({ code = 'Error', title = 'Something went wrong' }: ErrorStateProps) {
  return (
    <div className="container h-[calc(100dvh-var(--header-h)-var(--footer-h)-var(--footer-gap))] py-4">
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-md bg-surface p-4">
        <Typography className="text-8xl leading-none font-bold tracking-tight text-danger">
          {code}
        </Typography>
        <Typography>{title}</Typography>
      </div>
    </div>
  );
}
