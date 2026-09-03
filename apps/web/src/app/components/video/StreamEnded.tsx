import { MonitorX } from 'lucide-react';
import { Typography } from '../ui/Typography';
import { Link } from '../ui/Link';
import { Button } from '../ui/Button';

export function StreamEnded() {
  return (
    <div className="container h-[calc(100dvh-var(--header-h)-var(--footer-h)-var(--footer-gap))] py-4">
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-md bg-surface p-4">
        <MonitorX className="mb-2" size="96" />
        <Typography>The stream has ended</Typography>
        <Button appearance="solid">
          <Link href="/" variant="unstyled">
            Back to stream list
          </Link>
        </Button>
      </div>
    </div>
  );
}
