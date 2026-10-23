'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const { initializeData, initError } = useAppStore();

  useEffect(() => {
    // Falhas já são tratadas dentro do store (initError); aqui só evitamos rejeição não tratada.
    initializeData().catch(() => {});
  }, [initializeData]);

  return (
    <>
      {initError && (
        <div
          role="alert"
          className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-3 bg-danger px-4 py-2 text-sm text-white"
        >
          <span>{initError}</span>
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => initializeData().catch(() => {})}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {children}
    </>
  );
}
