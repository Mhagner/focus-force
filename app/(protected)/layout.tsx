import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { AppProvider } from '@/components/providers/AppProvider';
import { Toaster } from '@/components/ui/sonner';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <div className="flex h-screen bg-gray-950 text-white">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
      <Toaster theme="dark" />
    </AppProvider>
  );
}
