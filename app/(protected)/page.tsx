'use client';

import { StatsCards } from '@/components/dashboard/StatsCards';
import { Charts } from '@/components/dashboard/Charts';
import { RecentSessions } from '@/components/dashboard/RecentSessions';

export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink mb-2">Dashboard</h1>
        <p className="text-ink-muted">
          Visão geral da sua produtividade e foco
        </p>
      </div>

      <div className="space-y-8">
        {/* Stats Cards */}
        <StatsCards />

        {/* Charts */}
        <Charts />

        {/* Recent Sessions */}
        <div className="grid grid-cols-1 gap-6">
          <RecentSessions />
        </div>
      </div>
    </div>
  );
}