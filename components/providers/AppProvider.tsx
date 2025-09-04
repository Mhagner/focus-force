'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const { initializeData } = useAppStore();

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  return <>{children}</>;
}