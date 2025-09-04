import { Project, Task, FocusSession, PomodoroSettings, DailyPlan } from '@/types';

const headers = { 'Content-Type': 'application/json' };

export const storage = {
  // Projects
  getProjects: async (): Promise<Project[]> => {
    const res = await fetch('/api/projects');
    return res.json();
  },
  addProject: async (project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers,
      body: JSON.stringify(project),
    });
    return res.json();
  },
  updateProject: async (id: string, updates: Partial<Project>): Promise<Project> => {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    return res.json();
  },
  deleteProject: async (id: string): Promise<void> => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  },

  // Tasks
  getTasks: async (): Promise<Task[]> => {
    const res = await fetch('/api/tasks');
    return res.json();
  },
  addTask: async (task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
    const payload = { priority: 'media', status: 'todo', ...task };
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return res.json();
  },
  updateTask: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    return res.json();
  },
  deleteTask: async (id: string): Promise<void> => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  },

  // Sessions
  getSessions: async (): Promise<FocusSession[]> => {
    const res = await fetch('/api/sessions');
    return res.json();
  },
  addSession: async (session: Omit<FocusSession, 'id'>): Promise<FocusSession> => {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers,
      body: JSON.stringify(session),
    });
    return res.json();
  },
  updateSession: async (id: string, updates: Partial<FocusSession>): Promise<FocusSession> => {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });
    return res.json();
  },
  deleteSession: async (id: string): Promise<void> => {
    await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
  },

  // Pomodoro Settings (local for now)
  getPomodoroSettings: (): PomodoroSettings => {
    if (typeof window === 'undefined') return getDefaultPomodoroSettings();
    const data = localStorage.getItem('focusforge/pomodoro-settings');
    return data ? JSON.parse(data) : getDefaultPomodoroSettings();
  },
  setPomodoroSettings: (settings: PomodoroSettings) => {
    localStorage.setItem('focusforge/pomodoro-settings', JSON.stringify(settings));
  },

  // Daily Plans (local for now)
  getDailyPlans: (): DailyPlan[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('focusforge/daily-plans');
    return data ? JSON.parse(data) : [];
  },
  setDailyPlans: (plans: DailyPlan[]) => {
    localStorage.setItem('focusforge/daily-plans', JSON.stringify(plans));
  },

  // Timer state
  getTimerState: () => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem('focusforge/timer-state');
    return data ? JSON.parse(data) : null;
  },
  setTimerState: (state: any) => {
    localStorage.setItem('focusforge/timer-state', JSON.stringify(state));
  },
  clearTimerState: () => {
    localStorage.removeItem('focusforge/timer-state');
  },
};

function getDefaultPomodoroSettings(): PomodoroSettings {
  return {
    workMin: 50,
    shortBreakMin: 10,
    longBreakMin: 20,
    cyclesToLongBreak: 3,
    autoStartNext: true,
    soundOn: true,
  };
}
