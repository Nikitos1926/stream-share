import { Logo } from '../components/layout/Logo';
import { Link } from '../components/ui/Link';
import { Typography } from '../components/ui/Typography';

/**
 * The frame every auth surface shares: the product mark, one centred card and
 * the same footer links as the rest of the app. Pages under `(auth)` render
 * inside the card and only bring their own content.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-canvas px-4 py-10">
      <Link href="/" variant="unstyled" className="flex items-center gap-2">
        <Logo className="h-8 w-8" />
        <Typography className="text-lg font-semibold select-none">stream-share</Typography>
      </Link>

      <main className="w-full max-w-md rounded-xl border border-line bg-surface p-6 text-stroke">
        {children}
      </main>

      <span className="flex items-center gap-5">
        <Link href="/privacy" variant="muted" size="sm">
          Privacy
        </Link>
        <Link href="/terms" variant="muted" size="sm">
          Terms
        </Link>
      </span>
    </div>
  );
}
