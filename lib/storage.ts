// src/lib/storage.ts
import { BoardColumn, Workspace, WorkspaceMode, Project, Task, TaskComment, TaskInput, FocusSession, PomodoroSettings, DailyPlan, ClockfySettings, TaskSubtask, SessionDescriptionPreset } from '@/types';

/**
 * ------------------------------------------------------------
 * Fetch helpers (tipado, com timeout e no-store em GET)
 * ------------------------------------------------------------
 */

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

const JSON_HEADERS: HeadersInit = { 'Content-Type': 'application/json' };

/** Timeout padrão (ms) para chamadas HTTP */
const DEFAULT_TIMEOUT_MS = 15_000;

/** Erro HTTP padronizado */
export class HttpError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.payload = payload;
  }
}

/** Util: aguarda com timeout */
function withTimeout<T>(p: Promise<T>, ms: number, controller: AbortController): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      controller.abort();
      reject(new Error(`Request timeout after ${ms}ms`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

function withWorkspace(path: string, workspaceId?: string): string {
  return workspaceId ? `${path}?workspaceId=${encodeURIComponent(workspaceId)}` : path;
}

/** Wrapper de fetch tipado e resiliente */
async function request<T>(
  input: string,
  options: {
    method?: HttpMethod;
    body?: unknown;
    headers?: HeadersInit;
    timeoutMs?: number;
    cache?: RequestCache; // sobrescreve se precisar
    next?: any;
    revalidate?: number;
  } = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cache,
    next,
    revalidate,
  } = options;

  const controller = new AbortController();

  // Por padrão, GET não deve ser pré-renderizado/SSG => no-store
  const computedInit: RequestInit & { next?: { revalidate?: number } } = {
    method,
    headers: { ...JSON_HEADERS, ...headers },
    signal: controller.signal,
  };

  if (body !== undefined) {
    computedInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // Controle de cache (prioridade: arg explicit > revalidate > default GET=no-store)
  if (cache) {
    computedInit.cache = cache;
  } else if (typeof revalidate === 'number') {
    computedInit.next = { revalidate, ...next };
  } else if (method === 'GET') {
    computedInit.cache = 'no-store';
  } else if (next) {
    computedInit.next = next;
  }

  const res = await withTimeout(fetch(input, computedInit), timeoutMs, controller);

  let payload: unknown = undefined;
  const contentType = res.headers.get('Content-Type') || '';

  if (contentType.includes('application/json')) {
    // Tenta JSON; se falhar, cai para texto
    try {
      payload = await res.json();
    } catch {
      payload = undefined;
    }
  } else {
    try {
      payload = await res.text();
    } catch {
      payload = undefined;
    }
  }

  if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    // Sessão expirada/invalidada: volta para o login preservando o destino.
    window.location.assign(`/login?from=${encodeURIComponent(window.location.pathname)}`);
  }

  if (!res.ok) {
    const msg =
      typeof payload === 'object' && payload && 'message' in (payload as any)
        ? String((payload as any).message)
        : `HTTP ${res.status} on ${input}`;
    throw new HttpError(msg, res.status, payload);
  }

  return payload as T;
}

/**
 * ------------------------------------------------------------
 * Safe localStorage helpers (SSR-safe)
 * ------------------------------------------------------------
 */
const isBrowser = typeof window !== 'undefined';

function readLS<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS<T>(key: string, value: T): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // noop
  }
}

function removeLS(key: string): void {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // noop
  }
}

/**
 * ------------------------------------------------------------
 * Domínio: Pomodoro (defaults)
 * ------------------------------------------------------------
 */
function getDefaultPomodoroSettings(): PomodoroSettings {
  return {
    workMin: 50,
    shortBreakMin: 10,
    longBreakMin: 20,
    cyclesToLongBreak: 3,
    autoStartNext: true,
    soundOn: true,
    defaultChecklist: [],
  };
}

/**
 * ------------------------------------------------------------
 * API pública do módulo
 * ------------------------------------------------------------
 */
const LS_KEYS = {
  pomo: 'focusforge/pomodoro-settings',
  timer: 'focusforge/timer-state',
} as const;

export const storage = {
  /**
   * ---------------------------
   * Projects
   * ---------------------------
   */
  async getWorkspaces(): Promise<Workspace[]> {
    return request<Workspace[]>('/api/workspaces');
  },

  /** Cria o workspace já configurado (o que o onboarding coletou); o que faltar usa os padrões do tipo. */
  async createWorkspace(input: {
    name: string;
    mode: WorkspaceMode;
    settings?: Omit<PomodoroSettings, 'defaultHourlyRate'> & { defaultHourlyRate?: number };
    columns?: Array<{ title: string; isDone: boolean }>;
    presets?: string[];
  }): Promise<Workspace> {
    return request<Workspace>('/api/workspaces', { method: 'POST', body: input });
  },

  async getWorkspaceLimits(): Promise<{ max: number | null; used: number; canCreate: boolean }> {
    return request('/api/workspaces/limits');
  },

  /** Colunas do quadro (por workspace). */
  async getColumns(workspaceId: string): Promise<BoardColumn[]> {
    return request<BoardColumn[]>(withWorkspace('/api/columns', workspaceId));
  },

  async addColumn(workspaceId: string, title: string): Promise<BoardColumn> {
    return request<BoardColumn>('/api/columns', { method: 'POST', body: { workspaceId, title } });
  },

  async renameColumn(id: string, title: string): Promise<BoardColumn> {
    return request<BoardColumn>(`/api/columns/${id}`, { method: 'PATCH', body: { title } });
  },

  async reorderColumns(workspaceId: string, orderedIds: string[]): Promise<BoardColumn[]> {
    return request<BoardColumn[]>('/api/columns/reorder', { method: 'PATCH', body: { workspaceId, orderedIds } });
  },

  async deleteColumn(id: string, moveTo?: string): Promise<void> {
    const query = moveTo ? `?moveTo=${encodeURIComponent(moveTo)}` : '';
    await request<unknown>(`/api/columns/${id}${query}`, { method: 'DELETE' });
  },

  async deleteWorkspace(id: string, confirmName: string): Promise<void> {
    await request<{ ok: boolean }>(`/api/workspaces/${id}`, { method: 'DELETE', body: { confirmName } });
  },

  async updateWorkspace(id: string, updates: { name?: string; archived?: boolean }): Promise<Workspace> {
    return request<Workspace>(`/api/workspaces/${id}`, { method: 'PATCH', body: updates });
  },

  async getProjects(workspaceId?: string): Promise<Project[]> {
    return request<Project[]>(withWorkspace('/api/projects', workspaceId));
  },

  async addProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    return request<Project>('/api/projects', {
      method: 'POST',
      body: project,
    });
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    return request<Project>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: updates,
    });
  },

  async deleteProject(id: string): Promise<void> {
    await request<unknown>(`/api/projects/${id}`, { method: 'DELETE' });
  },

  /**
   * ---------------------------
   * Tasks
   * ---------------------------
   */
  async getTasks(workspaceId?: string): Promise<Task[]> {
    return request<Task[]>(withWorkspace('/api/tasks', workspaceId));
  },

  async addTask(task: TaskInput): Promise<Task> {
    const payload: TaskInput & { priority?: Task['priority']; status?: Task['status'] } =
      { priority: 'media', status: 'todo', ...task };
    return request<Task>('/api/tasks', {
      method: 'POST',
      body: payload,
    });
  },

  async updateTask(id: string, updates: Partial<TaskInput>): Promise<Task> {
    return request<Task>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: updates,
    });
  },

  async deleteTask(id: string): Promise<void> {
    await request<unknown>(`/api/tasks/${id}`, { method: 'DELETE' });
  },

  async addTaskComment(taskId: string, message: string): Promise<TaskComment> {
    return request<TaskComment>(`/api/tasks/${taskId}/comments`, {
      method: 'POST',
      body: { message },
    });
  },

  async syncTaskCommentWithClockfy(taskId: string): Promise<{ updated: number; failed: number }> {
    return request<{ updated: number; failed: number }>(`/api/tasks/${taskId}/sync-clockfy`, { method: 'POST' });
  },

  async addTaskSubtask(taskId: string, title: string): Promise<TaskSubtask> {
    return request<TaskSubtask>(`/api/tasks/${taskId}/subtasks`, {
      method: 'POST',
      body: { title },
    });
  },

  async updateTaskSubtask(
    taskId: string,
    subtaskId: string,
    updates: Partial<Pick<TaskSubtask, 'title' | 'completed' | 'completedAt' | 'estimatedDeliveryDate'>>,
  ): Promise<TaskSubtask> {
    return request<TaskSubtask>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PATCH',
      body: updates,
    });
  },

  async deleteTaskSubtask(taskId: string, subtaskId: string): Promise<void> {
    await request<unknown>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
    });
  },

  async updateTaskComment(taskId: string, commentId: string, message: string): Promise<TaskComment> {
    return request<TaskComment>(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'PATCH',
      body: { message },
    });
  },

  async deleteTaskComment(taskId: string, commentId: string): Promise<void> {
    await request<unknown>(`/api/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  /**
   * ---------------------------
   * Focus Sessions
   * ---------------------------
   */
  async getSessions(workspaceId?: string): Promise<FocusSession[]> {
    return request<FocusSession[]>(withWorkspace('/api/sessions', workspaceId));
  },

  async addSession(session: Omit<FocusSession, 'id'>): Promise<FocusSession> {
    return request<FocusSession>('/api/sessions', {
      method: 'POST',
      body: session,
    });
  },

  async updateSession(id: string, updates: Partial<FocusSession>): Promise<FocusSession> {
    return request<FocusSession>(`/api/sessions/${id}`, {
      method: 'PATCH',
      body: updates,
    });
  },

  async deleteSession(id: string): Promise<void> {
    await request<unknown>(`/api/sessions/${id}`, { method: 'DELETE' });
  },

  async syncSessionWithClockfy(id: string): Promise<FocusSession> {
    return request<FocusSession>(`/api/sessions/${id}/sync-clockfy`, {
      method: 'POST',
    });
  },

  /**
   * ---------------------------
   * Session Description Presets
   * ---------------------------
   */
  async getSessionDescriptionPresets(workspaceId: string): Promise<SessionDescriptionPreset[]> {
    return request<SessionDescriptionPreset[]>(withWorkspace('/api/session-description-presets', workspaceId));
  },

  async addSessionDescriptionPreset(workspaceId: string, label: string): Promise<SessionDescriptionPreset> {
    return request<SessionDescriptionPreset>('/api/session-description-presets', {
      method: 'POST',
      body: { workspaceId, label },
    });
  },

  async updateSessionDescriptionPreset(
    id: string,
    updates: Partial<Pick<SessionDescriptionPreset, 'label' | 'active' | 'order'>>
  ): Promise<SessionDescriptionPreset> {
    return request<SessionDescriptionPreset>(`/api/session-description-presets/${id}`, {
      method: 'PATCH',
      body: updates,
    });
  },

  async deleteSessionDescriptionPreset(id: string): Promise<void> {
    await request<unknown>(`/api/session-description-presets/${id}`, { method: 'DELETE' });
  },

  /**
   * ---------------------------
   * Pomodoro (database)
   * ---------------------------
   */
  async getPomodoroSettings(workspaceId: string): Promise<PomodoroSettings> {
    return request<PomodoroSettings>(withWorkspace('/api/settings', workspaceId));
  },

  async setPomodoroSettings(settings: PomodoroSettings, workspaceId: string): Promise<void> {
    await request<PomodoroSettings>(withWorkspace('/api/settings', workspaceId), {
      method: 'PATCH',
      body: settings,
    });
  },

  /**
   * ---------------------------
   * Clockfy integration
   * ---------------------------
   */
  async getClockfySettings(workspaceId: string): Promise<ClockfySettings> {
    return request<ClockfySettings>(withWorkspace('/api/integrations/clockfy', workspaceId));
  },

  async updateClockfySettings(settings: Partial<ClockfySettings>, workspaceId: string): Promise<ClockfySettings> {
    return request<ClockfySettings>(withWorkspace('/api/integrations/clockfy', workspaceId), {
      method: 'PATCH',
      body: settings,
    });
  },

  /**
   * ---------------------------
   * Daily Plans (database)
   * ---------------------------
   */
  async getDailyPlans(workspaceId?: string): Promise<DailyPlan[]> {
    return request<DailyPlan[]>(withWorkspace('/api/daily-plans', workspaceId));
  },

  async saveDailyPlan(plan: DailyPlan, workspaceId?: string): Promise<DailyPlan> {
    return request<DailyPlan>(withWorkspace('/api/daily-plans', workspaceId), {
      method: 'POST',
      body: plan,
    });
  },

  /**
   * ---------------------------
   * Timer state (local)
   * ---------------------------
   */
  getTimerState<T = any>(): T | null {
    return readLS<T | null>(LS_KEYS.timer, null);
  },

  setTimerState<T = any>(state: T): void {
    writeLS(LS_KEYS.timer, state);
  },

  clearTimerState(): void {
    removeLS(LS_KEYS.timer);
  },
};
