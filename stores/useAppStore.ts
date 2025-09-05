'use client';

import { create } from 'zustand';
import { Project, Task, FocusSession, PomodoroSettings, DailyPlan } from '@/types';
import { storage } from '@/lib/storage';

interface AppStore {
  projects: Project[];
  tasks: Task[];
  sessions: FocusSession[];
  pomodoroSettings: PomodoroSettings;
  dailyPlans: DailyPlan[];
  theme: 'dark' | 'light' | 'system';

  initializeData: () => Promise<void>;

  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addSession: (session: Omit<FocusSession, 'id'>) => Promise<void>;
  updateSession: (id: string, updates: Partial<FocusSession>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;

  updatePomodoroSettings: (settings: Partial<PomodoroSettings>) => void;

  updateDailyPlan: (plan: DailyPlan) => void;
  getDailyPlan: (dateISO: string) => DailyPlan | undefined;

  setTheme: (theme: 'dark' | 'light' | 'system') => void;

  exportData: () => string;
  importData: (jsonData: string) => boolean;
  clearAllData: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  projects: [],
  tasks: [],
  sessions: [],
  pomodoroSettings: {
    workMin: 50,
    shortBreakMin: 10,
    longBreakMin: 20,
    cyclesToLongBreak: 3,
    autoStartNext: true,
    soundOn: true,
  },
  dailyPlans: [],
  theme: 'dark',

  initializeData: async () => {
    const [projects, tasks, sessions] = await Promise.all([
      storage.getProjects(),
      storage.getTasks(),
      storage.getSessions(),
    ]);
    const pomodoroSettings = storage.getPomodoroSettings();
    const dailyPlans = storage.getDailyPlans();
    set({ projects, tasks, sessions, pomodoroSettings, dailyPlans });
  },

  // Projects
  addProject: async (projectData) => {
    const project = await storage.addProject(projectData);
    set((state) => ({ projects: [...state.projects, project] }));
  },
  updateProject: async (id, updates) => {
    const project = await storage.updateProject(id, updates);
    set((state) => ({
      projects: state.projects.map(p => (p.id === id ? project : p)),
    }));
  },
  deleteProject: async (id) => {
    await storage.deleteProject(id);
    set((state) => ({
      projects: state.projects.filter(p => p.id !== id),
    }));
  },

  // Tasks
  addTask: async (taskData) => {
    const task = await storage.addTask(taskData);
    set((state) => ({ tasks: [...state.tasks, task] }));
  },
  updateTask: async (id, updates) => {
    const task = await storage.updateTask(id, updates);
    set((state) => ({
      tasks: state.tasks.map(t => (t.id === id ? task : t)),
    }));
  },
  deleteTask: async (id) => {
    await storage.deleteTask(id);
    set((state) => ({
      tasks: state.tasks.filter(t => t.id !== id),
    }));
  },

  // Sessions
  addSession: async (sessionData) => {
    const session = await storage.addSession(sessionData);
    set((state) => ({ sessions: [...state.sessions, session] }));
  },
  updateSession: async (id, updates) => {
    const session = await storage.updateSession(id, updates);
    set((state) => ({
      sessions: state.sessions.map(s => (s.id === id ? session : s)),
    }));
  },
  deleteSession: async (id) => {
    await storage.deleteSession(id);
    set((state) => ({
      sessions: state.sessions.filter(s => s.id !== id),
    }));
  },

  // Settings
  updatePomodoroSettings: (settings) => {
    set((state) => {
      const newSettings = { ...state.pomodoroSettings, ...settings };
      storage.setPomodoroSettings(newSettings);
      return { pomodoroSettings: newSettings };
    });
  },

  // Daily Plans
  updateDailyPlan: (plan) => {
    set((state) => {
      const existingIndex = state.dailyPlans.findIndex(p => p.dateISO === plan.dateISO);
      let newPlans;
      if (existingIndex >= 0) {
        newPlans = [...state.dailyPlans];
        newPlans[existingIndex] = plan;
      } else {
        newPlans = [...state.dailyPlans, plan];
      }
      storage.setDailyPlans(newPlans);
      return { dailyPlans: newPlans };
    });
  },
  getDailyPlan: (dateISO) => {
    return get().dailyPlans.find(p => p.dateISO === dateISO);
  },

  // Theme
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('focusforge/theme', theme);
    }
  },

  exportData: () => {
    return JSON.stringify({
      projects: get().projects,
      tasks: get().tasks,
      sessions: get().sessions,
      pomodoroSettings: get().pomodoroSettings,
      dailyPlans: get().dailyPlans,
    }, null, 2);
  },
  importData: (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      set({
        projects: data.projects || [],
        tasks: data.tasks || [],
        sessions: data.sessions || [],
        pomodoroSettings: data.pomodoroSettings || get().pomodoroSettings,
        dailyPlans: data.dailyPlans || [],
      });
      return true;
    } catch {
      return false;
    }
  },
  clearAllData: () => {
    set({
      projects: [],
      tasks: [],
      sessions: [],
      dailyPlans: [],
    });
  },
}));
