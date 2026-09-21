import './globals.css';
import type { Metadata } from 'next';
import { Inter, Quicksand } from 'next/font/google';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-quicksand',
});

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
    <html lang="pt-BR" className={cn(inter.variable, quicksand.variable)}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
