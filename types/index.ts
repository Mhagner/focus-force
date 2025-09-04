export interface Project {
  id: string;
  name: string;
  client?: string;
  color: string;
  hourlyRate?: number;
  active: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  priority: 'alta' | 'media' | 'baixa';
  plannedFor?: 'today' | string; // dateISO
  status: 'todo' | 'doing' | 'done';
  estimateMin?: number;
  createdAt: string;
}

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
}

export interface PomodoroSettings {
  workMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  cyclesToLongBreak: number;
  autoStartNext: boolean;
  soundOn: boolean;
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
}