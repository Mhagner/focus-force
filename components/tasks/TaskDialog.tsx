'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/stores/useAppStore';
import { Task } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface TaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task?: Task;
    defaultProjectId?: string;
}

export function TaskDialog({ open, onOpenChange, task, defaultProjectId }: TaskDialogProps) {
    const { projects, addTask, updateTask } = useAppStore();
    const { toast } = useToast();

    const activeProjects = useMemo(() => projects.filter(p => p.active), [projects]);

    const [projectId, setProjectId] = useState<string>('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'alta' | 'media' | 'baixa'>('media');
    const [estimateMin, setEstimateMin] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (task) {
            setProjectId(task.projectId);
            setTitle(task.title);
            setDescription(task.description || '');
            setPriority((task.priority as any) || 'media');
            setEstimateMin(task.estimateMin?.toString() || '');
        } else {
            setProjectId(defaultProjectId || activeProjects[0]?.id || '');
            setTitle('');
            setDescription('');
            setPriority('media');
            setEstimateMin('');
        }
    }, [task, open, defaultProjectId, activeProjects]);

    const canSubmit = Boolean(projectId && title.trim());

    const handleSubmit = async () => {
        if (!canSubmit || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const trimmedTitle = title.trim();
            const trimmedDescription = description.trim();

            const payload: Omit<Task, 'id' | 'createdAt'> = {
                projectId,
                title: trimmedTitle,
                priority,
            };

            payload.description = trimmedDescription === '' ? null : trimmedDescription;

            if (estimateMin) {
                payload.estimateMin = parseInt(estimateMin, 10);
            }



            if (task) {
                await updateTask(task.id, payload as Partial<Task>);
                toast({ title: 'Tarefa atualizada' });
            } else {
                await addTask(payload);
                toast({ title: 'Tarefa criada' });
            }

            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-900 border-gray-800">
                <DialogHeader>
                    <DialogTitle className="text-white">
                        {task ? 'Editar Tarefa' : 'Nova Tarefa'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div>
                        <Label htmlFor="project" className="text-gray-300">Projeto *</Label>
                        <Select value={projectId} onValueChange={setProjectId}>
                            <SelectTrigger id="project" className="w-full bg-gray-800 border-gray-700 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700">
                                {activeProjects.map((p) => (
                                    <SelectItem value={p.id} key={p.id}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                                            {p.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="title" className="text-gray-300">Título *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Defina o título da tarefa"
                            className="bg-gray-800 border-gray-700 text-white"
                        />
                    </div>

                    <div>
                        <Label htmlFor="description" className="text-gray-300">Descrição</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detalhes da tarefa"
                            className="bg-gray-800 border-gray-700 text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-gray-300">Prioridade</Label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                                <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                    <SelectItem value="alta">Alta</SelectItem>
                                    <SelectItem value="media">Média</SelectItem>
                                    <SelectItem value="baixa">Baixa</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="estimate" className="text-gray-300">Estimativa (min)</Label>
                            <Input
                                id="estimate"
                                type="number"
                                min={0}
                                value={estimateMin}
                                onChange={(e) => setEstimateMin(e.target.value)}
                                placeholder="30"
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSubmitting}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {task ? 'Atualizando...' : 'Criando...'}
                                </>
                            ) : (
                                task ? 'Atualizar' : 'Criar'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}


