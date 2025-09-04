import { Project, Task, FocusSession, PomodoroSettings, DailyPlan } from '@/types';

const STORAGE_KEYS = {
  projects: 'focusforge/projects',
  tasks: 'focusforge/tasks',
  sessions: 'focusforge/sessions',
  pomodoroSettings: 'focusforge/pomodoro-settings',
  dailyPlans: 'focusforge/daily-plans',
  timerState: 'focusforge/timer-state',
} as const;

export const storage = {
  // Projects
  getProjects: (): Project[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.projects);
    return data ? JSON.parse(data) : [];
  },
  setProjects: (projects: Project[]) => {
    localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(projects));
  },

  // Tasks
  getTasks: (): Task[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.tasks);
    return data ? JSON.parse(data) : [];
  },
  setTasks: (tasks: Task[]) => {
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks));
  },

  // Sessions
  getSessions: (): FocusSession[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.sessions);
    return data ? JSON.parse(data) : [];
  },
  setSessions: (sessions: FocusSession[]) => {
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
  },

  // Pomodoro Settings
  getPomodoroSettings: (): PomodoroSettings => {
    if (typeof window === 'undefined') return getDefaultPomodoroSettings();
    const data = localStorage.getItem(STORAGE_KEYS.pomodoroSettings);
    return data ? JSON.parse(data) : getDefaultPomodoroSettings();
  },
  setPomodoroSettings: (settings: PomodoroSettings) => {
    localStorage.setItem(STORAGE_KEYS.pomodoroSettings, JSON.stringify(settings));
  },

  // Daily Plans
  getDailyPlans: (): DailyPlan[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.dailyPlans);
    return data ? JSON.parse(data) : [];
  },
  setDailyPlans: (plans: DailyPlan[]) => {
    localStorage.setItem(STORAGE_KEYS.dailyPlans, JSON.stringify(plans));
  },

  // Timer State
  getTimerState: () => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_KEYS.timerState);
    return data ? JSON.parse(data) : null;
  },
  setTimerState: (state: any) => {
    localStorage.setItem(STORAGE_KEYS.timerState, JSON.stringify(state));
  },
  clearTimerState: () => {
    localStorage.removeItem(STORAGE_KEYS.timerState);
  },

  // Clear all data
  clearAll: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },

  // Export all data
  exportData: () => {
    const data = {
      projects: storage.getProjects(),
      tasks: storage.getTasks(),
      sessions: storage.getSessions(),
      pomodoroSettings: storage.getPomodoroSettings(),
      dailyPlans: storage.getDailyPlans(),
    };
    return JSON.stringify(data, null, 2);
  },

  // Import data
  importData: (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (data.projects) storage.setProjects(data.projects);
      if (data.tasks) storage.setTasks(data.tasks);
      if (data.sessions) storage.setSessions(data.sessions);
      if (data.pomodoroSettings) storage.setPomodoroSettings(data.pomodoroSettings);
      if (data.dailyPlans) storage.setDailyPlans(data.dailyPlans);
      return true;
    } catch {
      return false;
    }
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