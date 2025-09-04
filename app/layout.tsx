import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopNav } from '@/components/layout/TopNav';
import { AppProvider } from '@/components/providers/AppProvider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FocusForge - Gestão de Foco entre Projetos',
  description: 'Aplicação para gerenciar foco e tempo entre múltiplos projetos de software',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        <AppProvider>
          <div className="flex h-screen bg-gray-950 text-white">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <TopNav />
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </div>
          <Toaster theme="dark" />
        </AppProvider>
      </body>
    </html>
  );
}