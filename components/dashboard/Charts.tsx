'use client';

import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppStore } from '@/stores/useAppStore';
import { getHoursByProject, getDailyHours } from '@/lib/utils';

export function Charts() {
  const { sessions, projects } = useAppStore();
  
  const projectData = getHoursByProject(sessions, projects).filter(p => p.hours > 0);
  const dailyData = getDailyHours(sessions, 7);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart - Horas por Projeto Hoje */}
      <Card className="p-6 bg-gray-900/50 border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">
          Distribuição por Projeto (Hoje)
        </h3>
        <div className="h-64">
          {projectData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="hours"
                >
                  {projectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toFixed(1)}h`, 'Horas']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Nenhuma sessão registrada hoje
            </div>
          )}
        </div>
      </Card>

      {/* Bar Chart - Horas por Dia */}
      <Card className="p-6 bg-gray-900/50 border-gray-800">
        <h3 className="text-lg font-semibold text-white mb-4">
          Horas por Dia (Últimos 7 dias)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px' 
                }}
                formatter={(value: number) => [`${value}h`, 'Horas']}
              />
              <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}