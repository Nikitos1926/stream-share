import { Typography } from '../ui/Typography';

type NotFoundStateProps = {
  code?: string | number;
  title: string;
};

export function NotFoundState({ code = 404, title }: NotFoundStateProps) {
  return (
    <div className="container h-[calc(100dvh-var(--header-h)-var(--footer-h)-var(--footer-gap))] py-4">
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-md bg-surface p-4">
        <Typography className="text-muted text-8xl leading-none font-bold tracking-tight">
          {code}
        </Typography>
        <Typography>{title}</Typography>
      </div>
    </div>
  );
}
