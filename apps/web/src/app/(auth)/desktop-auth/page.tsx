import { MonitorCheck } from 'lucide-react';
import { Typography } from '../../components/ui/Typography';

export default function DesktopAuthReturnPage() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="mb-1 flex size-12 items-center justify-center rounded-lg bg-accent/15">
        <MonitorCheck className="size-6 text-accent" aria-hidden />
      </span>

      <Typography tag="h1" className="text-2xl font-semibold">
        Go back to the app
      </Typography>

      <Typography tag="p" tone="muted" size="sm">
        This browser is done with the sign-in, but it could not hand the result back to stream-share
        — the link had already been used or it expired.
      </Typography>
      <Typography tag="p" tone="muted" size="sm">
        Switch to the stream-share app and sign in again; it takes a few seconds now that the
        browser knows your account. You can close this tab.
      </Typography>
    </div>
  );
}
