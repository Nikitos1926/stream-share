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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-dvh">
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
