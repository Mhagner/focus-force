'use client';

import { create } from 'zustand';
import { BoardColumn, Workspace, WorkspaceMode, Project, Task, TaskInput, FocusSession, PomodoroSettings, DailyPlan, ClockfySettings, TaskSubtask, SessionDescriptionPreset } from '@/types';
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
  columns: BoardColumn[];
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
  /** true enquanto os dados de outro workspace estão sendo carregados após a troca. */
  isWorkspaceLoading: boolean;

  initializeData: () => Promise<void>;

  setActiveWorkspace: (id: string) => Promise<void>;
  /** Cria o workspace já configurado (onboarding) e o torna o ativo. */
  createWorkspace: (input: Parameters<typeof storage.createWorkspace>[0]) => Promise<Workspace>;

  /** Colunas do quadro do workspace ativo. */
  addColumn: (title: string) => Promise<void>;
  renameColumn: (id: string, title: string) => Promise<void>;
  reorderColumns: (orderedIds: string[]) => Promise<void>;
  /** `moveTo` é obrigatório quando a coluna tem itens. */
  deleteColumn: (id: string, moveTo?: string) => Promise<void>;
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

interface WorkspaceData {
  projects: Project[];
  tasks: Task[];
  sessions: FocusSession[];
  dailyPlans: DailyPlan[];
  columns: BoardColumn[];
  pomodoroSettings?: PomodoroSettings;
  sessionDescriptionPresets: SessionDescriptionPreset[];
}

/** Tudo o que pertence a um workspace. allSettled: uma requisição que falhe não impede o restante. */
async function fetchWorkspaceData(workspaceId: string): Promise<{ data: WorkspaceData; failures: number }> {
  const results = await Promise.allSettled([
    storage.getProjects(workspaceId),
    storage.getTasks(workspaceId),
    storage.getSessions(workspaceId),
    storage.getDailyPlans(workspaceId),
    storage.getColumns(workspaceId),
    storage.getPomodoroSettings(workspaceId),
    storage.getSessionDescriptionPresets(workspaceId),
  ]);

  let failures = 0;
  const pick = <T,>(index: number, fallback: T): T => {
    const result = results[index];
    if (result.status === 'fulfilled') return result.value as T;
    failures += 1;
    console.error(`[init] falha na requisição #${index}`, result.reason);
    return fallback;
  };

  const settings = pick<PomodoroSettings | undefined>(5, undefined);
  return {
    failures,
    data: {
      projects: pick<Project[]>(0, []),
      tasks: pick<Task[]>(1, []).map((task) => ({ ...task, comments: task.comments ?? [], subtasks: task.subtasks ?? [] })),
      sessions: pick<FocusSession[]>(2, []),
      dailyPlans: pick<DailyPlan[]>(3, []),
      columns: pick<BoardColumn[]>(4, []),
      pomodoroSettings: settings && {
        ...settings,
        defaultChecklist: settings.defaultChecklist ?? [],
        defaultHourlyRate: settings.defaultHourlyRate ?? 0,
      },
      sessionDescriptionPresets: pick<SessionDescriptionPreset[]>(6, []),
    },
  };
}

export const useAppStore = create<AppStore>((set, get) => ({
  initError: null,
  columns: [],
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
  isWorkspaceLoading: false,

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

    // Sem workspace ativo: usuário novo. O app abre o onboarding para criar o primeiro.
    if (!active) {
      set({ workspaces, activeWorkspaceId: null, initError: null, isDataInitialized: true });
      return;
    }

    const [clockfy, workspaceData] = await Promise.all([
      storage.getClockfySettings().catch((error) => {
        console.error('[init] falha ao carregar o Clockfy', error);
        return null;
      }),
      fetchWorkspaceData(active.id),
    ]);
    const { data, failures } = workspaceData;

    writeActiveWorkspaceId(active.id);
    set({
      initError: failures > 0 || !clockfy ? 'Alguns dados não puderam ser carregados. Tente novamente.' : null,
      workspaces,
      activeWorkspaceId: active.id,
      projects: data.projects,
      tasks: data.tasks,
      sessions: data.sessions,
      dailyPlans: data.dailyPlans,
      columns: data.columns,
      sessionDescriptionPresets: data.sessionDescriptionPresets,
      ...(data.pomodoroSettings ? { pomodoroSettings: data.pomodoroSettings } : {}),
      ...(clockfy ? { clockfySettings: { ...clockfy, workspaces: clockfy.workspaces ?? [] } } : {}),
      isDataInitialized: true,
    });
  },

  // Workspaces
  setActiveWorkspace: async (id) => {
    const target = get().workspaces.find((workspace) => workspace.id === id && !workspace.archived);
    if (!target || get().activeWorkspaceId === id) return;

    writeActiveWorkspaceId(id);
    set({
      activeWorkspaceId: id,
      projects: [],
      tasks: [],
      sessions: [],
      dailyPlans: [],
      columns: [],
      sessionDescriptionPresets: [],
      isWorkspaceLoading: true,
    });

    let result: Awaited<ReturnType<typeof fetchWorkspaceData>>;
    try {
      result = await fetchWorkspaceData(id);
    } catch (error) {
      if (get().activeWorkspaceId === id) set({ isWorkspaceLoading: false });
      throw error;
    }
    const { data, failures } = result;
    // Se o usuário trocou de novo enquanto carregava, descarta esta resposta
    // (a troca mais recente é quem encerra o carregamento).
    if (get().activeWorkspaceId !== id) return;
    set({
      isWorkspaceLoading: false,
      projects: data.projects,
      tasks: data.tasks,
      sessions: data.sessions,
      dailyPlans: data.dailyPlans,
      columns: data.columns,
      sessionDescriptionPresets: data.sessionDescriptionPresets,
      ...(data.pomodoroSettings ? { pomodoroSettings: data.pomodoroSettings } : {}),
      initError: failures > 0 ? 'Alguns dados não puderam ser carregados. Tente novamente.' : null,
    });
  },
  createWorkspace: async (input) => {
    const workspace = await storage.createWorkspace(input);
    set((state) => ({ workspaces: [...state.workspaces, workspace] }));
    await get().setActiveWorkspace(workspace.id);
    return workspace;
  },

  // Colunas do quadro (workspace ativo). O status das tarefas é derivado delas no servidor,
  // então depois de mudar a estrutura recarregamos as tarefas.
  addColumn: async (title) => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) return;
    await storage.addColumn(workspaceId, title);
    set({ columns: await storage.getColumns(workspaceId) });
    await get().refreshTasks();
  },
  renameColumn: async (id, title) => {
    const previous = get().columns;
    set({ columns: previous.map((column) => (column.id === id ? { ...column, title } : column)) });
    try {
      await storage.renameColumn(id, title);
    } catch (error) {
      set({ columns: previous });
      throw error;
    }
  },
  reorderColumns: async (orderedIds) => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) return;
    const previous = get().columns;
    const byId = new Map(previous.map((column) => [column.id, column]));
    set({
      columns: orderedIds.flatMap((id, index) => {
        const column = byId.get(id);
        return column ? [{ ...column, position: index }] : [];
      }),
    });
    try {
      set({ columns: await storage.reorderColumns(workspaceId, orderedIds) });
      await get().refreshTasks();
    } catch (error) {
      set({ columns: previous });
      throw error;
    }
  },
  deleteColumn: async (id, moveTo) => {
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) return;
    await storage.deleteColumn(id, moveTo);
    set({ columns: await storage.getColumns(workspaceId) });
    await get().refreshTasks();
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
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) throw new Error('Nenhum workspace ativo.');
    const newSettings = { ...get().pomodoroSettings, ...settings };
    await storage.setPomodoroSettings(newSettings, workspaceId);
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
    const workspaceId = get().activeWorkspaceId;
    if (!workspaceId) throw new Error('Nenhum workspace ativo.');
    const preset = await storage.addSessionDescriptionPreset(workspaceId, label);
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
