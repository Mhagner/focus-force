import { cn, getPriorityColor } from '@/lib/utils';

interface PriorityTagProps {
  priority: 'alta' | 'media' | 'baixa';
  className?: string;
}

export function PriorityTag({ priority, className }: PriorityTagProps) {
  const priorityLabels = {
    alta: 'Alta',
    media: 'Média', 
    baixa: 'Baixa'
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
      getPriorityColor(priority),
      className
    )}>
      {priorityLabels[priority]}
    </span>
  );
}