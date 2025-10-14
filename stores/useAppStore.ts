'use client';

import { create } from 'zustand';
import { Project, Task, TaskInput, FocusSession, PomodoroSettings, DailyPlan, ClockfySettings } from '@/types';
import { storage } from '@/lib/storage';

interface TasksFilters {
  showOnlyToday: boolean;
}

interface AppStore {
  projects: Project[];
  tasks: Task[];
  sessions: FocusSession[];
  pomodoroSettings: PomodoroSettings;
  clockfySettings: ClockfySettings;
  dailyPlans: DailyPlan[];
  theme: 'dark' | 'light' | 'system';
  tasksFilters: TasksFilters;

  initializeData: () => Promise<void>;

  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addTask: (task: TaskInput) => Promise<void>;
  updateTask: (id: string, updates: Partial<TaskInput>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addTaskComment: (taskId: string, message: string) => Promise<void>;
  updateTaskComment: (taskId: string, commentId: string, message: string) => Promise<void>;
  deleteTaskComment: (taskId: string, commentId: string) => Promise<void>;

  addSession: (session: Omit<FocusSession, 'id'>) => Promise<void>;
  updateSession: (id: string, updates: Partial<FocusSession>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;

  updatePomodoroSettings: (settings: Partial<PomodoroSettings>) => Promise<void>;
  updateClockfySettings: (settings: Partial<ClockfySettings>) => Promise<void>;

  updateDailyPlan: (plan: DailyPlan) => Promise<void>;
  getDailyPlan: (dateISO: string) => DailyPlan | undefined;

  setTheme: (theme: 'dark' | 'light' | 'system') => void;

  exportData: () => string;
  importData: (jsonData: string) => boolean;
  clearAllData: () => void;

  setTasksFilters: (updates: Partial<TasksFilters>) => void;
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
  clockfySettings: {
    apiKey: '',
    workspaceId: '',
    updatedAt: null,
  },
  dailyPlans: [],
  theme: 'dark',
  tasksFilters: {
    showOnlyToday: false,
  },

  initializeData: async () => {
    const [projects, tasks, sessions, pomodoroSettings, clockfySettings, dailyPlans] = await Promise.all([
      storage.getProjects(),
      storage.getTasks(),
      storage.getSessions(),
      storage.getPomodoroSettings(),
      storage.getClockfySettings(),
      storage.getDailyPlans(),
    ]);
    set({
      projects,
      tasks: tasks.map(task => ({ ...task, comments: task.comments ?? [] })),
      sessions,
      pomodoroSettings,
      clockfySettings,
      dailyPlans,
    });
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
    set((state) => ({ tasks: [...state.tasks, { ...task, comments: task.comments ?? [] }] }));
  },
  updateTask: async (id, updates) => {
    const task = await storage.updateTask(id, updates);
    set((state) => ({
      tasks: state.tasks.map(t => (t.id === id ? { ...task, comments: task.comments ?? [] } : t)),
    }));
  },
  deleteTask: async (id) => {
    await storage.deleteTask(id);
    set((state) => ({
      tasks: state.tasks.filter(t => t.id !== id),
    }));
  },
  addTaskComment: async (taskId, message) => {
    const comment = await storage.addTaskComment(taskId, message);
    set((state) => ({
      tasks: state.tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              comments: [comment, ...(task.comments ?? [])],
            }
          : task
      ),
    }));
  },

  updateTaskComment: async (taskId, commentId, message) => {
    const updatedComment = await storage.updateTaskComment(taskId, commentId, message);
    set((state) => ({
      tasks: state.tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              comments: (task.comments ?? []).map(comment =>
                comment.id === commentId ? updatedComment : comment
              ),
            }
          : task
      ),
    }));
  },

  deleteTaskComment: async (taskId, commentId) => {
    await storage.deleteTaskComment(taskId, commentId);
    set((state) => ({
      tasks: state.tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              comments: (task.comments ?? []).filter(comment => comment.id !== commentId),
            }
          : task
      ),
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
  updatePomodoroSettings: async (settings) => {
    const newSettings = { ...get().pomodoroSettings, ...settings };
    await storage.setPomodoroSettings(newSettings);
    set({ pomodoroSettings: newSettings });
  },

  updateClockfySettings: async (settings) => {
    const current = get().clockfySettings;
    const payload = {
      apiKey: settings.apiKey ?? current.apiKey,
      workspaceId: settings.workspaceId ?? current.workspaceId,
    };
    const updated = await storage.updateClockfySettings(payload);
    set({ clockfySettings: updated });
  },

  // Daily Plans
  updateDailyPlan: async (plan) => {
    const savedPlan = await storage.saveDailyPlan(plan);
    set((state) => {
      const existingIndex = state.dailyPlans.findIndex(p => p.id === savedPlan.id || p.dateISO === savedPlan.dateISO);
      if (existingIndex >= 0) {
        const updatedPlans = [...state.dailyPlans];
        updatedPlans[existingIndex] = savedPlan;
        return { dailyPlans: updatedPlans };
      }
      return { dailyPlans: [...state.dailyPlans, savedPlan] };
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
      const importedProjects = Array.isArray(data.projects)
        ? data.projects.map((project: any) => ({
            ...project,
            syncWithClockfy: project?.syncWithClockfy ?? false,
          }))
        : [];
      set({
        projects: importedProjects,
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
      tasksFilters: {
        showOnlyToday: false,
      },
    });
  },

  setTasksFilters: (updates) => {
    set((state) => ({
      tasksFilters: {
        ...state.tasksFilters,
        ...updates,
      },
    }));
  },
}));
