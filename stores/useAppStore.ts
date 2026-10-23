'use client';

import { create } from 'zustand';
import { TaskBoardSettings, StatusTitles, TaskStatusKey, Workspace, WorkspaceMode, Project, Task, TaskInput, FocusSession, PomodoroSettings, DailyPlan, ClockfySettings, TaskSubtask, SessionDescriptionPreset } from '@/types';
import { storage } from '@/lib/storage';

interface TasksFilters {
  showOnlyToday: boolean;
}

const ACTIVE_WORKSPACE_KEY = 'focusforge/active-workspace';

function readActiveWorkspaceId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  } catch {
    return null;
  }
}

function writeActiveWorkspaceId(id: string) {
  try {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  } catch {
    // storage indisponível: o workspace ativo só não é lembrado
  }
}

interface AppStore {
  /** Mensagem quando o carregamento inicial falhou, total ou parcialmente; null se tudo carregou. */
  initError: string | null;
  statusTitles: StatusTitles;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  projects: Project[];
  tasks: Task[];
  sessions: FocusSession[];
  pomodoroSettings: PomodoroSettings;
  clockfySettings: ClockfySettings;
  dailyPlans: DailyPlan[];
  sessionDescriptionPresets: SessionDescriptionPreset[];
  theme: 'dark' | 'light' | 'system';
  tasksFilters: TasksFilters;
  isDataInitialized: boolean;

  initializeData: () => Promise<void>;

  /** Renomeia uma coluna padrão do quadro no modo informado. `null` restaura o nome padrão. */
  setStatusTitle: (mode: WorkspaceMode, status: TaskStatusKey, title: string | null) => Promise<void>;
  setActiveWorkspace: (id: string) => Promise<void>;
  addWorkspace: (input: { name: string; mode: WorkspaceMode }) => Promise<Workspace>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  setWorkspaceArchived: (id: string, archived: boolean) => Promise<void>;

  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addTask: (task: TaskInput) => Promise<void>;
  updateTask: (id: string, updates: Partial<TaskInput>) => Promise<void>;
  refreshTasks: () => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addTaskComment: (taskId: string, message: string) => Promise<void>;
  syncTaskCommentWithClockfy: (taskId: string) => Promise<{ updated: number; failed: number }>;
  updateTaskComment: (taskId: string, commentId: string, message: string) => Promise<void>;
  deleteTaskComment: (taskId: string, commentId: string) => Promise<void>;
  addTaskSubtask: (taskId: string, title: string) => Promise<void>;
  updateTaskSubtask: (
    taskId: string,
    subtaskId: string,
    updates: Partial<Pick<TaskSubtask, 'title' | 'completed' | 'completedAt' | 'estimatedDeliveryDate'>>,
  ) => Promise<void>;
  deleteTaskSubtask: (taskId: string, subtaskId: string) => Promise<void>;

  addSession: (session: Omit<FocusSession, 'id'>) => Promise<void>;
  updateSession: (id: string, updates: Partial<FocusSession>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  syncSessionWithClockfy: (id: string) => Promise<FocusSession>;

  updatePomodoroSettings: (settings: Partial<PomodoroSettings>) => Promise<void>;
  updateClockfySettings: (settings: Partial<ClockfySettings>) => Promise<void>;

  updateDailyPlan: (plan: DailyPlan) => Promise<void>;
  getDailyPlan: (dateISO: string) => DailyPlan | undefined;

  addSessionDescriptionPreset: (label: string) => Promise<void>;
  updateSessionDescriptionPreset: (id: string, updates: Partial<Pick<SessionDescriptionPreset, 'label' | 'active' | 'order'>>) => Promise<void>;
  deleteSessionDescriptionPreset: (id: string) => Promise<void>;

  setTheme: (theme: 'dark' | 'light' | 'system') => void;

  exportData: () => string;
  importData: (jsonData: string) => boolean;
  clearAllData: () => void;

  setTasksFilters: (updates: Partial<TasksFilters>) => void;
}

const TASKS_CHANNEL = 'focusforge-tasks';

// Lets other windows (e.g. the detached "Meu Dia" popup) know they should refetch tasks.
function notifyTasksChanged() {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(TASKS_CHANNEL);
  channel.postMessage('changed');
  channel.close();
}

export function subscribeToTasksChanges(onChange: () => void) {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(TASKS_CHANNEL);
  channel.onmessage = onChange;
  return () => channel.close();
}

export const useAppStore = create<AppStore>((set, get) => ({
  initError: null,
  statusTitles: { WORK: {}, STUDY: {} },
  workspaces: [],
  activeWorkspaceId: null,
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
    defaultChecklist: [],
    defaultHourlyRate: 0,
  },
  clockfySettings: {
    apiKey: '',
    hasApiKey: false,
    workspaceId: '',
    workspaces: [],
    updatedAt: null,
  },
  dailyPlans: [],
  sessionDescriptionPresets: [],
  theme: 'dark',
  tasksFilters: {
    showOnlyToday: false,
  },
  isDataInitialized: false,

  initializeData: async () => {
    // Workspaces são pré-requisito de tudo: sem eles não há o que carregar.
    let workspaces: Workspace[];
    try {
      workspaces = await storage.getWorkspaces();
    } catch (error) {
      console.error('[init] falha ao carregar os workspaces', error);
      set({
        initError: error instanceof Error ? error.message : 'Não foi possível carregar seus workspaces.',
        isDataInitialized: true,
      });
      return;
    }

    const usable = workspaces.filter((workspace) => !workspace.archived);
    // O id salvo no navegador só vale se ainda for um workspace ativo deste usuário.
    const active = usable.find((workspace) => workspace.id === readActiveWorkspaceId()) ?? usable[0];
    const workspaceId = active?.id;

    // allSettled: uma requisição que falhe não impede o restante de carregar.
    const results = await Promise.allSettled([
      storage.getProjects(workspaceId),
      storage.getTasks(workspaceId),
      storage.getSessions(workspaceId),
      storage.getPomodoroSettings(),
      storage.getClockfySettings(),
      storage.getDailyPlans(workspaceId),
      storage.getSessionDescriptionPresets(),
      storage.getTasksBoardSettings(),
    ]);

    let failures = 0;
    const pick = <T,>(index: number, fallback: T): T => {
      const result = results[index];
      if (result.status === 'fulfilled') return result.value as T;
      failures += 1;
      console.error(`[init] falha na requisição #${index}`, result.reason);
      return fallback;
    };

    const projects = pick<Project[]>(0, []);
    const tasks = pick<Task[]>(1, []);
    const sessions = pick<FocusSession[]>(2, []);
    const pomodoroSettings = pick<PomodoroSettings>(3, get().pomodoroSettings);
    const clockfySettings = pick<ClockfySettings>(4, get().clockfySettings);
    const dailyPlans = pick<DailyPlan[]>(5, []);
    const sessionDescriptionPresets = pick<SessionDescriptionPreset[]>(6, []);
    // O quadro é opcional aqui (só traz nomes personalizados de colunas): falha não conta como erro.
    const boardResult = results[7];
    const board = boardResult.status === 'fulfilled' ? (boardResult.value as TaskBoardSettings) : null;

    if (workspaceId) writeActiveWorkspaceId(workspaceId);
    set({
      initError: failures > 0 ? 'Alguns dados não puderam ser carregados. Tente novamente.' : null,
      statusTitles: { WORK: board?.statusTitles?.WORK ?? {}, STUDY: board?.statusTitles?.STUDY ?? {} },
      workspaces,
      activeWorkspaceId: workspaceId ?? null,
      projects,
      tasks: tasks.map(task => ({ ...task, comments: task.comments ?? [], subtasks: task.subtasks ?? [] })),
      sessions,
      pomodoroSettings: {
        ...pomodoroSettings,
        defaultChecklist: pomodoroSettings.defaultChecklist ?? [],
        defaultHourlyRate: pomodoroSettings.defaultHourlyRate ?? 0,
      },
      clockfySettings: { ...clockfySettings, workspaces: clockfySettings.workspaces ?? [] },
      dailyPlans,
      sessionDescriptionPresets,
      isDataInitialized: true,
    });
  },

  // Workspaces
  setStatusTitle: async (mode, status, title) => {
    const previous = get().statusTitles;
    const nextForMode = { ...previous[mode] };
    const trimmed = title?.trim().slice(0, 40);
    if (trimmed) nextForMode[status] = trimmed;
    else delete nextForMode[status];

    const next: StatusTitles = { ...previous, [mode]: nextForMode };
    set({ statusTitles: next });
    try {
      await storage.setTasksBoardSettings({ statusTitles: next });
    } catch (error) {
      set({ statusTitles: previous });
      throw error;
    }
  },
  setActiveWorkspace: async (id) => {
    const target = get().workspaces.find((workspace) => workspace.id === id && !workspace.archived);
    if (!target || get().activeWorkspaceId === id) return;

    writeActiveWorkspaceId(id);
    set({ activeWorkspaceId: id, projects: [], tasks: [], sessions: [], dailyPlans: [] });

    const [projects, tasks, sessions, dailyPlans] = await Promise.all([
      storage.getProjects(id),
      storage.getTasks(id),
      storage.getSessions(id),
      storage.getDailyPlans(id),
    ]);
    // Se o usuário trocou de novo enquanto carregava, descarta esta resposta.
    if (get().activeWorkspaceId !== id) return;
    set({
      projects,
      tasks: tasks.map(task => ({ ...task, comments: task.comments ?? [], subtasks: task.subtasks ?? [] })),
      sessions,
      dailyPlans,
    });
  },
  addWorkspace: async (input) => {
    const workspace = await storage.addWorkspace(input);
    set((state) => ({ workspaces: [...state.workspaces, workspace] }));
    return workspace;
  },
  renameWorkspace: async (id, name) => {
    const workspace = await storage.updateWorkspace(id, { name });
    set((state) => ({ workspaces: state.workspaces.map((w) => (w.id === id ? workspace : w)) }));
  },
  setWorkspaceArchived: async (id, archived) => {
    const workspace = await storage.updateWorkspace(id, { archived });
    set((state) => ({ workspaces: state.workspaces.map((w) => (w.id === id ? workspace : w)) }));
    if (archived && get().activeWorkspaceId === id) {
      const next = get().workspaces.find((w) => !w.archived);
      if (next) await get().setActiveWorkspace(next.id);
    }
  },

  // Projects
  addProject: async (projectData) => {
    const project = await storage.addProject({
      ...projectData,
      workspaceId: projectData.workspaceId ?? get().activeWorkspaceId,
    });
    set((state) => ({ projects: [...state.projects, project] }));
    return project;
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
    set((state) => ({ tasks: [...state.tasks, { ...task, comments: task.comments ?? [], subtasks: task.subtasks ?? [] }] }));
  },
  updateTask: async (id, updates) => {
    const task = await storage.updateTask(id, updates);
    set((state) => ({
      tasks: state.tasks.map(t => (t.id === id ? { ...task, comments: task.comments ?? [], subtasks: task.subtasks ?? [] } : t)),
    }));
    notifyTasksChanged();
  },
  refreshTasks: async () => {
    const tasks = await storage.getTasks(get().activeWorkspaceId ?? undefined);
    set({
      tasks: tasks.map(task => ({ ...task, comments: task.comments ?? [], subtasks: task.subtasks ?? [] })),
    });
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

  syncTaskCommentWithClockfy: async (taskId) => {
    return storage.syncTaskCommentWithClockfy(taskId);
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

  addTaskSubtask: async (taskId, title) => {
    const subtask = await storage.addTaskSubtask(taskId, title);
    set((state) => ({
      tasks: state.tasks.map(task =>
        task.id === taskId
          ? { ...task, subtasks: [...(task.subtasks ?? []), subtask] }
          : task
      ),
    }));
  },

  updateTaskSubtask: async (taskId, subtaskId, updates) => {
    const updated = await storage.updateTaskSubtask(taskId, subtaskId, updates);
    set((state) => ({
      tasks: state.tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              subtasks: (task.subtasks ?? []).map(subtask =>
                subtask.id === subtaskId ? updated : subtask
              ),
            }
          : task
      ),
    }));
  },

  deleteTaskSubtask: async (taskId, subtaskId) => {
    await storage.deleteTaskSubtask(taskId, subtaskId);
    set((state) => ({
      tasks: state.tasks.map(task =>
        task.id === taskId
          ? {
              ...task,
              subtasks: (task.subtasks ?? []).filter(subtask => subtask.id !== subtaskId),
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

  syncSessionWithClockfy: async (id) => {
    const session = await storage.syncSessionWithClockfy(id);
    set((state) => ({
      sessions: state.sessions.map(s => (s.id === id ? session : s)),
    }));
    return session;
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
      workspaces: settings.workspaces ?? current.workspaces ?? [],
    };
    const updated = await storage.updateClockfySettings(payload);
    set({ clockfySettings: updated });
  },

  // Daily Plans
  updateDailyPlan: async (plan) => {
    const savedPlan = await storage.saveDailyPlan(plan, get().activeWorkspaceId ?? undefined);
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

  // Session Description Presets
  addSessionDescriptionPreset: async (label) => {
    const preset = await storage.addSessionDescriptionPreset(label);
    set((state) => ({ sessionDescriptionPresets: [...state.sessionDescriptionPresets, preset] }));
  },
  updateSessionDescriptionPreset: async (id, updates) => {
    const preset = await storage.updateSessionDescriptionPreset(id, updates);
    set((state) => ({
      sessionDescriptionPresets: preset.active
        ? state.sessionDescriptionPresets.map(p => (p.id === id ? preset : p))
        : state.sessionDescriptionPresets.filter(p => p.id !== id),
    }));
  },
  deleteSessionDescriptionPreset: async (id) => {
    await storage.deleteSessionDescriptionPreset(id);
    set((state) => ({
      sessionDescriptionPresets: state.sessionDescriptionPresets.filter(p => p.id !== id),
    }));
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
