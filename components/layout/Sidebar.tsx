'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  CalendarDays,
  Timer,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projetos', href: '/projects', icon: FolderKanban },
  { name: 'Tarefas', href: '/tasks', icon: CheckSquare },
  { name: 'Planejamento', href: '/plan', icon: Calendar },
  { name: 'Calendário', href: '/calendar', icon: CalendarDays },
  { name: 'Foco', href: '/focus', icon: Timer },
  { name: 'Relatórios', href: '/reports', icon: BarChart3 },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem('focusforge/sidebar/collapsed') === 'true');
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    window.localStorage.setItem('focusforge/sidebar/collapsed', String(isCollapsed));
  }, [isCollapsed, isHydrated]);

  return (
    <div className={cn(
      "bg-primary flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 border-b border-white/15">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h1 className="font-display text-xl font-bold text-white">FocusForge</h1>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200",
                    "hover:bg-white/10 hover:text-white",
                    isActive
                      ? "bg-white/[0.14] text-white font-semibold"
                      : "text-white/75",
                    isCollapsed && "justify-center"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-white/15">
        <div className={cn(
          "flex items-center gap-3 text-sm text-white/60",
          isCollapsed && "justify-center"
        )}>
          <Timer className="h-4 w-4" />
          {!isCollapsed && <span>v1.0.0</span>}
        </div>
      </div>
    </div>
  );
}