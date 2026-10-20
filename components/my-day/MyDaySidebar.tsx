'use client';

import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MyDay } from '@/components/my-day/MyDay';
import { useMyDayTasks } from '@/hooks/use-my-day-tasks';
import { useMyDaySidebarStore } from '@/stores/useMyDaySidebarStore';

export function MyDaySidebar() {
  const { collapsed, hydrate, setCollapsed } = useMyDaySidebarStore();
  const { pending } = useMyDayTasks();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <aside
      aria-label="Meu Dia"
      className={cn(
        'shrink-0 border-l border-border bg-surface flex flex-col h-full overflow-hidden rounded-r-2xl transition-all duration-300',
        collapsed ? 'w-14' : 'w-96 max-lg:w-14',
      )}
    >
      {collapsed ? (
        <CollapsedContent pendingCount={pending.length} onExpand={() => setCollapsed(false)} />
      ) : (
        <>
          {/* Below lg the sidebar is forced to the collapsed width. */}
          <div className="hidden lg:flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold text-ink">Painel do dia</span>
              <button
                type="button"
                aria-label="Recolher Meu Dia"
                title="Recolher Meu Dia"
                onClick={() => setCollapsed(true)}
                className="text-ink-muted transition-colors hover:text-ink"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MyDay />
            </div>
          </div>
          <div className="flex flex-1 flex-col lg:hidden">
            <CollapsedContent pendingCount={pending.length} onExpand={() => setCollapsed(false)} />
          </div>
        </>
      )}
    </aside>
  );
}

function CollapsedContent({ pendingCount, onExpand }: { pendingCount: number; onExpand: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <button
        type="button"
        aria-label="Expandir Meu Dia"
        title="Expandir Meu Dia"
        onClick={onExpand}
        className="text-ink-muted transition-colors hover:text-ink"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="relative text-ink-muted" title="Meu Dia">
        <Sun className="h-5 w-5" />
        {pendingCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </div>
    </div>
  );
}
