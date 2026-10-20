import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
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
  applicationName: 'FocusForge',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: 'FocusForge',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#035578',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={cn(inter.variable, quicksand.variable)}>
      <body className={inter.className}>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
