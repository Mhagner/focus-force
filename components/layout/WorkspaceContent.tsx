'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/stores/useAppStore';

function WorkspaceSkeleton() {
  return (
    <div className="space-y-6 p-6" role="status" aria-busy="true" aria-label="Carregando workspace">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="w-[310px] shrink-0 space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mostra um skeleton no lugar da página enquanto os dados do novo workspace carregam. */
export function WorkspaceContent({ children }: { children: React.ReactNode }) {
  const isWorkspaceLoading = useAppStore((state) => state.isWorkspaceLoading);
  return isWorkspaceLoading ? <WorkspaceSkeleton /> : <>{children}</>;
}
