import { Project, Task, FocusSession, DailyPlan } from '@/types';
import { format, subDays } from 'date-fns';

export const seedProjects: any[] = [
  { },
];

export const seedTasks: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Implementar checkout com pagamento',
    description: 'Integração com gateway de pagamento e validações',
    priority: 'alta',
    plannedFor: 'today',
    status: 'doing',
    estimateMin: 180,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    title: 'Otimizar performance da home',
    description: 'Code splitting e lazy loading',
    priority: 'media',
    plannedFor: format(new Date(), 'yyyy-MM-dd'),
    status: 'todo',
    estimateMin: 120,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-3',
    projectId: 'proj-2',
    title: 'Dashboard de analytics',
    description: 'Gráficos de uso e métricas',
    priority: 'alta',
    plannedFor: 'today',
    status: 'todo',
    estimateMin: 240,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-4',
    projectId: 'proj-2',
    title: 'Refatorar sistema de notificações',
    priority: 'media',
    status: 'todo',
    estimateMin: 90,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-5',
    projectId: 'proj-3',
    title: 'Sistema de sorteios',
    description: 'Algoritmo justo e auditável',
    priority: 'alta',
    status: 'todo',
    estimateMin: 300,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'task-6',
    projectId: 'proj-3',
    title: 'Testes unitários core',
    priority: 'baixa',
    status: 'done',
    estimateMin: 120,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

export const seedSessions: FocusSession[] = [
  {
    id: 'session-1',
    projectId: 'proj-1',
    taskId: 'task-1',
    start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    durationSec: 4200, // 70 min
    type: 'pomodoro',
    pomodoroCycles: 1,
    notes: 'Focado na integração Stripe',
  },
  {
    id: 'session-2',
    projectId: 'proj-2',
    taskId: 'task-3',
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    durationSec: 3000, // 50 min
    type: 'pomodoro',
    pomodoroCycles: 1,
  },
  {
    id: 'session-3',
    projectId: 'proj-1',
    start: subDays(new Date(), 1).toISOString(),
    end: new Date(subDays(new Date(), 1).getTime() + 2 * 60 * 60 * 1000).toISOString(),
    durationSec: 7200, // 120 min
    type: 'manual',
  },
  {
    id: 'session-4',
    projectId: 'proj-3',
    taskId: 'task-6',
    start: subDays(new Date(), 2).toISOString(),
    end: new Date(subDays(new Date(), 2).getTime() + 1.5 * 60 * 60 * 1000).toISOString(),
    durationSec: 5400, // 90 min
    type: 'pomodoro',
    pomodoroCycles: 2,
  },
  {
    id: 'session-5',
    projectId: 'proj-2',
    start: subDays(new Date(), 3).toISOString(),
    end: new Date(subDays(new Date(), 3).getTime() + 3 * 60 * 60 * 1000).toISOString(),
    durationSec: 10800, // 180 min
    type: 'manual',
  },
];

export const seedDailyPlan: DailyPlan = {
  id: 'plan-today',
  dateISO: format(new Date(), 'yyyy-MM-dd'),
  blocks: [
    { projectId: 'proj-1', targetMinutes: 120 },
    { projectId: 'proj-2', targetMinutes: 120 },
    { projectId: 'proj-3', targetMinutes: 120 },
  ],
  notes: 'Foco em finalizar implementações críticas',
};