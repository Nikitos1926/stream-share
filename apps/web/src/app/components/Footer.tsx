import { Logo } from './Logo';
import { Link } from './ui/Link';
import { Typography } from './ui/Typography';

export function Footer() {
  return (
    <footer className="mt-(--footer-gap) h-(--footer-h) w-full border-t-2 border-line bg-surface">
      {' '}
      <div className="container mx-auto flex h-full items-center justify-between">
        <Link href="/" variant="unstyled" className="flex items-center justify-around gap-2">
          <Logo className="h-6 w-6 text-stroke-muted" />
          <Typography className="font-semibold text-stroke-muted" size="sm">
            stream-share
          </Typography>
        </Link>
        <span className="flex gap-5">
          <Link
            href="https://github.com/Nikitos1926/stream-share"
            target="_blank"
            variant="muted"
            size="sm"
          >
            GitHub
          </Link>
          <Link href="/privacy" variant="muted" size="sm">
            Privacy
          </Link>
          <Link href="/terms" variant="muted" size="sm">
            Terms
          </Link>
          <Typography className="text-stroke-muted" size="sm">
            © 2026
          </Typography>
        </span>
      </div>
    </footer>
  );
}
