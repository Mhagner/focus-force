'use client';

import { Card } from '@/components/ui/card';
import { useAppStore } from '@/stores/useAppStore';
import { formatDuration } from '@/lib/utils';
import { ProjectBadge } from '@/components/ui/project-badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function RecentSessions() {
  const { sessions, projects, tasks } = useAppStore();
  
  const recentSessions = sessions
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
    .slice(0, 8);

  return (
    <Card className="p-6 bg-gray-900/50 border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-4">
        Sessões Recentes
      </h3>
      
      {recentSessions.length > 0 ? (
        <div className="space-y-3">
          {recentSessions.map((session) => {
            const project = projects.find(p => p.id === session.projectId);
            const task = session.taskId ? tasks.find(t => t.id === session.taskId) : null;
            
            if (!project) return null;
            
            return (
              <div 
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-800/30 border border-gray-700/50 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ProjectBadge name={project.name} color={project.color} size="sm" />
                  <div>
                    {task && (
                      <p className="text-sm font-medium text-white">{task.title}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {format(new Date(session.start), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {formatDuration(session.durationSec)}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {session.type}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Nenhuma sessão registrada ainda
        </div>
      )}
    </Card>
  );
}