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
            "mb-5 rounded-xl border border-gray-800 bg-gray-900/40 transition-all duration-300",
            !isExpanded ? "p-2" : "p-3"
        )}>
            {/* Header clicável para Toggle */}
            <div
                className="flex cursor-pointer items-center justify-between px-1"
                onClick={toggleExpand}
            >
                <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                        <Target className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white leading-none">Radar de Prioridade</h2>
                        {!isExpanded && (
                            <p className="text-[10px] text-gray-500 mt-1">
                                {priorityQueue.length} tarefas sugeridas agora
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isExpanded && (
                        <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 border border-blue-500/20">
                            Auto-Focus
                        </span>
                    )}
                    <button className="text-gray-500 hover:text-white">
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
                                className="group relative flex items-center gap-3 rounded-lg border border-transparent bg-gray-800/40 p-2 pl-3 transition-all hover:border-gray-700 hover:bg-gray-800/60"
                                onClick={() => handleEdit(task)}
                            >
                                {/* Indicador Lateral de Cor */}
                                <div
                                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full opacity-70"
                                    style={{ backgroundColor: project?.color || '#4B5563' }}
                                />

                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black text-gray-500 group-hover:text-blue-400">
                                    {index + 1}
                                </span>

                                <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                                    <div className="flex w-full items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <p className="truncate text-sm font-medium text-gray-200 group-hover:text-white">
                                                {task.title}
                                            </p>
                                            <span className="truncate text-[10px] font-medium text-gray-500 border-l border-gray-700 pl-2">
                                                {project?.name}
                                            </span>
                                        </div>
                                        <span className="shrink-0 font-mono text-[10px] font-bold text-blue-300">
                                            {insight.score}pt
                                        </span>
                                    </div>
                                    <p className="truncate text-[11px] text-gray-500">
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