'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Zap, Target } from 'lucide-react';
import clsx from 'clsx';

export function PriorityRadar({ priorityQueue, projects, handleEdit }: any) {
    // Estado para controlar se está expandido ou não
    const [isExpanded, setIsExpanded] = useState(true);

    // Carrega a preferência do usuário ao montar o componente
    useEffect(() => {
        const savedState = localStorage.getItem('radar-expanded');
        if (savedState !== null) {
            setIsExpanded(savedState === 'true');
        }
    }, []);

    // Salva a preferência sempre que mudar
    const toggleExpand = () => {
        const newState = !isExpanded;
        setIsExpanded(newState);
        localStorage.setItem('radar-expanded', String(newState));
    };

    return (
        <div className={clsx(
            "mb-5 rounded-xl border border-border bg-card transition-all duration-300",
            !isExpanded ? "p-2" : "p-3"
        )}>
            {/* Header clicável para Toggle */}
            <div
                className="flex cursor-pointer items-center justify-between px-1"
                onClick={toggleExpand}
            >
                <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/[0.14] text-primary">
                        <Target className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-ink leading-none">Radar de Prioridade</h2>
                        {!isExpanded && (
                            <p className="text-[10px] text-ink-muted mt-1">
                                {priorityQueue.length} tarefas sugeridas agora
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isExpanded && (
                        <span className="rounded-full bg-primary/[0.1] px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                            Auto-Focus
                        </span>
                    )}
                    <button className="text-ink-muted hover:text-ink">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Lista Expandível */}
            <div className={clsx(
                "grid transition-all duration-300 ease-in-out",
                isExpanded ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0 overflow-hidden"
            )}>
                <div className="flex flex-col gap-1.5 overflow-hidden">
                    {priorityQueue.map(({ task, insight }: { task: any; insight: any }, index: number) => {
                        const project = projects.find((p: any) => p.id === task.projectId);

                        return (
                            <button
                                key={task.id}
                                type="button"
                                className="group relative flex items-center gap-3 rounded-lg border border-transparent bg-background p-2 pl-3 transition-all hover:border-border hover:bg-secondary/60"
                                onClick={() => handleEdit(task)}
                            >
                                {/* Indicador Lateral de Cor */}
                                <div
                                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-70"
                                    style={{ backgroundColor: project?.color || '#627381' }}
                                />

                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black text-ink-muted group-hover:text-primary">
                                    {index + 1}
                                </span>

                                <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                                    <div className="flex w-full items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <p className="truncate text-sm font-medium text-ink group-hover:text-primary">
                                                {task.title}
                                            </p>
                                            <span className="truncate text-[10px] font-medium text-ink-muted border-l border-border pl-2">
                                                {project?.name}
                                            </span>
                                        </div>
                                        <span className="shrink-0 font-mono text-[10px] font-bold text-primary">
                                            {insight.score}pt
                                        </span>
                                    </div>
                                    <p className="truncate text-[11px] text-ink-muted">
                                        {insight.reasons.join(' • ') || 'Estável'}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}