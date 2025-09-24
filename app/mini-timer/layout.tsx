import { AppProvider } from '@/components/providers/AppProvider';
import { Toaster } from '@/components/ui/sonner';

export default function MiniTimerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      {children}
      <Toaster theme="dark" />
    </AppProvider>
  );
}
