import { auth } from '@/lib/auth/auth';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <div className="flex min-h-dvh flex-col">
      <Header user={session?.user} />
      <main className="flex min-h-0 grow flex-col">{children}</main>
      <Footer />
    </div>
  );
}
