'use client';

import { create } from 'zustand';
import { Project, Task, FocusSession, PomodoroSettings, DailyPlan } from '@/types';
import { storage } from '@/lib/storage';
import { seedProjects, seedTasks, seedSessions, seedDailyPlan } from '@/data/seed';

interface AppStore {
  // Data
  projects: Project[];
  tasks: Task[];
  sessions: FocusSession[];
  pomodoroSettings: PomodoroSettings;
  dailyPlans: DailyPlan[];
  
  // UI State
  theme: 'dark' | 'light' | 'system';
  
  // Actions
  initializeData: () => void;
  
  // Projects
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // Tasks
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Sessions
  addSession: (session: Omit<FocusSession, 'id'>) => void;
  updateSession: (id: string, updates: Partial<FocusSession>) => void;
  deleteSession: (id: string) => void;
  
  // Settings
  updatePomodoroSettings: (settings: Partial<PomodoroSettings>) => void;
  
  // Daily Plans
  updateDailyPlan: (plan: DailyPlan) => void;
  getDailyPlan: (dateISO: string) => DailyPlan | undefined;
  
  // Theme
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  
  // Data Management
  exportData: () => string;
  importData: (jsonData: string) => boolean;
  clearAllData: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
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

  // Initialize data from localStorage or seed data
  initializeData: () => {
    const projects = storage.getProjects();
    const tasks = storage.getTasks();
    const sessions = storage.getSessions();
    const pomodoroSettings = storage.getPomodoroSettings();
    const dailyPlans = storage.getDailyPlans();

    // If no data exists, use seed data
    if (projects.length === 0) {
      storage.setProjects(seedProjects);
      storage.setTasks(seedTasks);
      storage.setSessions(seedSessions);
      storage.setDailyPlans([seedDailyPlan]);
      
      set({
        projects: seedProjects,
        tasks: seedTasks,
        sessions: seedSessions,
        pomodoroSettings,
        dailyPlans: [seedDailyPlan],
      });
    } else {
      set({
        projects,
        tasks,
        sessions,
        pomodoroSettings,
        dailyPlans,
      });
    }
  },

  // Projects
  addProject: (projectData) => {
    const newProject: Project = {
      ...projectData,
      id: `proj-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    
    set((state) => {
      const newProjects = [...state.projects, newProject];
      storage.setProjects(newProjects);
      return { projects: newProjects };
    });
  },

  updateProject: (id, updates) => {
    set((state) => {
      const newProjects = state.projects.map(p => 
        p.id === id ? { ...p, ...updates } : p
      );
      storage.setProjects(newProjects);
      return { projects: newProjects };
    });
  },

  deleteProject: (id) => {
    set((state) => {
      const newProjects = state.projects.filter(p => p.id !== id);
      // Also remove related tasks and sessions
      const newTasks = state.tasks.filter(t => t.projectId !== id);
      const newSessions = state.sessions.filter(s => s.projectId !== id);
      
      storage.setProjects(newProjects);
      storage.setTasks(newTasks);
      storage.setSessions(newSessions);
      
      return { 
        projects: newProjects,
        tasks: newTasks,
        sessions: newSessions 
      };
    });
  },

  // Tasks
  addTask: (taskData) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    
    set((state) => {
      const newTasks = [...state.tasks, newTask];
      storage.setTasks(newTasks);
      return { tasks: newTasks };
    });
  },

  updateTask: (id, updates) => {
    set((state) => {
      const newTasks = state.tasks.map(t => 
        t.id === id ? { ...t, ...updates } : t
      );
      storage.setTasks(newTasks);
      return { tasks: newTasks };
    });
  },

  deleteTask: (id) => {
    set((state) => {
      const newTasks = state.tasks.filter(t => t.id !== id);
      storage.setTasks(newTasks);
      return { tasks: newTasks };
    });
  },

  // Sessions
  addSession: (sessionData) => {
    const newSession: FocusSession = {
      ...sessionData,
      id: `session-${Date.now()}`,
    };
    
    set((state) => {
      const newSessions = [...state.sessions, newSession];
      storage.setSessions(newSessions);
      return { sessions: newSessions };
    });
  },

  updateSession: (id, updates) => {
    set((state) => {
      const newSessions = state.sessions.map(s => 
        s.id === id ? { ...s, ...updates } : s
      );
      storage.setSessions(newSessions);
      return { sessions: newSessions };
    });
  },

  deleteSession: (id) => {
    set((state) => {
      const newSessions = state.sessions.filter(s => s.id !== id);
      storage.setSessions(newSessions);
      return { sessions: newSessions };
    });
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

  // Data Management
  exportData: () => {
    return storage.exportData();
  },

  importData: (jsonData) => {
    const success = storage.importData(jsonData);
    if (success) {
      get().initializeData();
    }
    return success;
  },

  clearAllData: () => {
    storage.clearAll();
    set({
      projects: [],
      tasks: [],
      sessions: [],
      dailyPlans: [],
    });
  },
}));