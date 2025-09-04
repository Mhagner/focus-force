'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
import { ProjectBadge } from '@/components/ui/project-badge';
import { formatDuration, getProjectHoursToday } from '@/lib/utils';
import { format } from 'date-fns';
import { Play, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';

export function TodayPlan() {
  const { dailyPlans, projects, sessions } = useAppStore();
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayPlan = dailyPlans.find(plan => plan.dateISO === today);

  if (!todayPlan || todayPlan.blocks.length === 0) {
    return (
      <Card className="p-6 bg-gray-900/50 border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Plano de Hoje
          </h3>
          <Calendar className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">Nenhum plano definido para hoje</p>
          <Button asChild variant="outline">
            <Link href="/plan">Criar Plano Diário</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const totalPlanned = todayPlan.blocks.reduce((sum, block) => sum + block.targetMinutes, 0);
  const totalWorked = todayPlan.blocks.reduce((sum, block) => {
    const hoursWorked = getProjectHoursToday(sessions, block.projectId);
    return sum + (hoursWorked / 60);
  }, 0);

  return (
    <Card className="p-6 bg-gray-900/50 border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Plano de Hoje
        </h3>
        <Calendar className="h-5 w-5 text-gray-400" />
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progresso do Dia</span>
          <span className="text-white">
            {Math.round(totalWorked)}m / {totalPlanned}m
          </span>
        </div>
        <Progress 
          value={(totalWorked / totalPlanned) * 100} 
          className="h-2"
        />
      </div>

      <div className="space-y-3">
        {todayPlan.blocks.map((block) => {
          const project = projects.find(p => p.id === block.projectId);
          if (!project) return null;
          
          const workedMinutes = getProjectHoursToday(sessions, block.projectId) / 60;
          const progress = (workedMinutes / block.targetMinutes) * 100;
          
          return (
            <div 
              key={block.projectId}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/50"
            >
              <div className="flex items-center gap-3 flex-1">
                <ProjectBadge 
                  name={project.name} 
                  color={project.color} 
                  size="sm" 
                />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Meta: {block.targetMinutes}m</span>
                    <span className="text-white">
                      {Math.round(workedMinutes)}m trabalhados
                    </span>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-1.5" />
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-3 text-gray-400 hover:text-white"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {todayPlan.notes && (
        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <p className="text-sm text-gray-300">{todayPlan.notes}</p>
        </div>
      )}
    </Card>
  );
}