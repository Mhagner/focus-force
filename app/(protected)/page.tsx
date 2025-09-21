'use client';

import { StatsCards } from '@/components/dashboard/StatsCards';
import { Charts } from '@/components/dashboard/Charts';
import { RecentSessions } from '@/components/dashboard/RecentSessions';
import { TodayPlan } from '@/components/dashboard/TodayPlan';

export default function Dashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400">
          Visão geral da sua produtividade e foco
        </p>
      </div>

      <div className="space-y-8">
        {/* Stats Cards */}
        <StatsCards />

        {/* Charts */}
        <Charts />

        {/* Today Plan and Recent Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodayPlan />
          <RecentSessions />
        </div>
      </div>
    </div>
  );
}