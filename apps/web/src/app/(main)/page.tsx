import { auth } from '@/lib/auth/auth';
import { cva } from 'class-variance-authority';
import { Lock, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from '../components/ui/Link';
import { StreamList } from './components/StreamList';

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Zap,
    title: 'Instant start',
    description: 'Start streaming in one click, right from your browser — nothing to install.',
  },
  {
    icon: Lock,
    title: 'Private by default',
    description: 'Only the people you send the link to can see your screen — no one else.',
  },
  {
    icon: Sparkles,
    title: 'Crystal-clear video',
    description: 'Smooth HD video with almost no delay, even on a slow connection.',
  },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  const { page } = await searchParams;
  const currentPage = !page ? 1 : Number(page);

  if (session && session.user.role !== 'guest') {
    return (
      <div className="container h-[calc(100dvh-var(--header-h)-var(--footer-h)-var(--footer-gap))] py-4">
        <StreamList currentPage={currentPage} />
      </div>
    );
  }

  return (
    <div className="text-stroke">
      <section className="container px-6 py-24 text-center">
        <h1 className="mx-auto mb-5 max-w-[18ch] text-5xl leading-tight font-semibold">
          Share your screen with anyone, in seconds
        </h1>
        <p className="mx-auto mb-8 max-w-[50ch] text-lg text-stroke-muted">
          No downloads required. Viewers don&apos;t need an account — just send the link and go.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="primary" appearance="solid" size="lg">
            <Link href="/login" variant="unstyled">
              Get started
            </Link>
          </Button>
        </div>
      </section>
      <section
        id="how-it-works"
        className="container grid grid-cols-1 gap-5 px-6 pb-24 md:grid-cols-3"
      >
        {features.map(({ icon: Icon, title, description }) => (
          <div key={title} className={cardVariants({ padding: 'lg' })}>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15">
              <Icon className="text-accent" size="18" strokeWidth={2} />
            </div>
            <div className="mb-1.5 text-base font-semibold">{title}</div>
            <div className="text-sm text-stroke-muted">{description}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

const cardVariants = cva(['rounded-xl border bg-surface'], {
  variants: {
    variant: {
      default: 'border-border',
      interactive:
        'border-border hover:border-text-muted cursor-pointer transition-colors duration-100',
    },
    padding: {
      none: 'p-0',
      sm: 'p-4',
      default: 'p-5',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'default',
  },
});
