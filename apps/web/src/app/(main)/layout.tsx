import { auth } from '@/lib/auth/auth';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div className="flex min-h-dvh flex-col">
      <Header user={session?.user} />
      <main className="flex min-h-93.25 grow flex-col">{children}</main>
      <Footer />
    </div>
  );
}
