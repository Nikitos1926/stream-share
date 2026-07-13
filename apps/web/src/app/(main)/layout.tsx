import { Sidebar } from '../components/window/Sidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="min-h-full w-full">{children}</main>
    </>
  );
}
