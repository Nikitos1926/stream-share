import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers/providers';
import { Toaster } from 'react-hot-toast';

export const viewport: Viewport = {
  width: 425,
  initialScale: 1,
  viewportFit: 'contain',
};

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Stream Share',
  description: 'Low-latency media streaming',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/*
        Browser extensions inject attributes into `<html>` and `<body>` before React
        hydrates — ColorZilla's `cz-shortcut-listen`, Grammarly's `data-gr-*`, dark-mode
        and translate extensions — and React reports each one as an attribute mismatch we
        cannot fix from here. `suppressHydrationWarning` silences that on these two
        elements only; it does not reach their descendants, so a real mismatch inside the
        app is still reported. Do not copy it into a component that renders app content:
        there, a mismatch is our bug (see apps/web/CLAUDE.md).
      */}
      <body className="min-h-dvh" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <Toaster
          toastOptions={{
            style: {
              background: 'var(--surface)',
              color: 'var(--stroke)',
              border: '1px solid var(--line)',
            },
            duration: 2000,
          }}
        />
      </body>
    </html>
  );
}
