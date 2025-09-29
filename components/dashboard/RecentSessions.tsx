'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
import { formatDuration } from '@/lib/utils';
import { ProjectBadge } from '@/components/ui/project-badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function RecentSessions() {
  const { sessions, projects, tasks, deleteSession } = useAppStore();
  const { toast } = useToast();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteSession(id);
      toast({ title: 'Sessão excluída' });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao excluir sessão',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  };

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

            const startTime = format(new Date(session.start), "dd/MM 'às' HH:mm", { locale: ptBR });
            const endTime = session.end ? format(new Date(session.end), 'HH:mm', { locale: ptBR }) : '...';

            const isTargetSession = pendingDeleteId === session.id;

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
                      {startTime} - {endTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {formatDuration(session.durationSec)}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {session.type}
                    </p>
                  </div>

                  <AlertDialog
                    open={isTargetSession}
                    onOpenChange={(open) => setPendingDeleteId(open ? session.id : null)}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-400 hover:text-red-400"
                        aria-label="Excluir sessão"
                        onClick={() => setPendingDeleteId(session.id)}
                      >
                        {isDeleting && isTargetSession ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-900 border border-gray-700 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir sessão</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-300">
                          Tem certeza que deseja remover esta sessão? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-gray-800 border border-gray-700 text-white">
                          Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleDelete(session.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting && isTargetSession ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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