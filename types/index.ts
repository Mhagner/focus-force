export type WorkspaceMode = 'WORK' | 'STUDY';

export interface Workspace {
  id: string;
  name: string;
  mode: WorkspaceMode;
  archived: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId?: string | null;
  name: string;
  client?: string;
  color: string;
  hourlyRate?: number;
  active: boolean;
  createdAt: string;
  clockfyClientId?: string | null;
  clockfyProjectId?: string | null;
  clockfyWorkspaceId?: string | null;
  syncWithClockfy: boolean;
  salesforceOppUrl?: string | null;
  sharepointRepoUrl?: string | null;
  estimatedDeliveryDate?: string | Date | null;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  priority?: 'alta' | 'media' | 'baixa';
  plannedFor?: 'today' | string | null; // dateISO
  status?: 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done';
  estimateMin?: number;
  salesforceOppUrl?: string | null;
  repoUrl?: string | null;
  estimatedDeliveryDate?: string | Date | null;
  completedAt?: string | null;
  createdAt: string;
  comments?: TaskComment[];
  subtasks?: TaskSubtask[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  message: string;
  createdAt: string;
}

export interface TaskSubtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  completedAt?: string | Date | null;
  estimatedDeliveryDate?: string | Date | null;
  createdAt: string;
}

export type TaskInput = {
  projectId: string;
  title: string;
  description?: string | null;
  priority?: 'alta' | 'media' | 'baixa';
  plannedFor?: 'today' | string | null;
  status?: 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done';
  estimateMin?: number;
  salesforceOppUrl?: string | null;
  repoUrl?: string | null;
  estimatedDeliveryDate?: string | Date | null;
};

export interface FocusSession {
  id: string;
  projectId: string;
  taskId?: string;
  start: string; // ISO
  end?: string; // ISO
  durationSec: number;
  type: 'manual' | 'pomodoro';
  pomodoroCycles?: number;
  notes?: string;
  clockfyTimeEntryId?: string;
}

export interface PomodoroSettings {
  workMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  cyclesToLongBreak: number;
  autoStartNext: boolean;
  soundOn: boolean;
  defaultChecklist: string[];
  defaultHourlyRate?: number;
}

export interface DailyPlan {
  id: string;
  dateISO: string;
  blocks: Array<{ projectId: string; targetMinutes: number }>;
  notes?: string;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  currentPhase: 'work' | 'short-break' | 'long-break' | 'manual';
  timeRemaining: number;
  totalTime: number;
  cycles: number;
  currentCycle: number;
  selectedProjectId?: string;
  selectedTaskId?: string;
  sessionStart?: string;
  lastTickAt?: string;
  elapsedInCycle: number;
  pendingNotes?: string;
}

export interface SessionDescriptionPreset {
  id: string;
  label: string;
  active: boolean;
  order: number;
  createdAt: string;
}

export interface ClockfyWorkspace {
  id: string;
  description?: string | null;
}

export interface ClockfySettings {
  /** Sempre vazio nas respostas da API; só é preenchido ao digitar uma nova chave. */
  apiKey: string;
  /** Indica se já existe uma chave salva (armazenada criptografada). */
  hasApiKey?: boolean;
  workspaceId?: string;
  workspaces: ClockfyWorkspace[];
  updatedAt?: string | null;
}

export type TaskStatusKey = 'todo' | 'call_agendada' | 'pronta_elaboracao' | 'doing' | 'done';

/** Nomes personalizados das 5 colunas padrão do quadro, por modo de workspace. */
export interface StatusTitles {
  WORK: Partial<Record<TaskStatusKey, string>>;
  STUDY: Partial<Record<TaskStatusKey, string>>;
}

export interface TaskBoardSettings {
  columns: Array<{
    id: string;
    title: string;
  }>;
  taskColumnMap: Record<string, string>;
  statusTitles?: StatusTitles;
  updatedAt?: string | null;
}
