// src/lib/storage.ts
import { Project, Task, TaskComment, TaskInput, FocusSession, PomodoroSettings, DailyPlan, ClockfySettings } from '@/types';

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
  async getProjects(): Promise<Project[]> {
    return request<Project[]>('/api/projects');
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
  async getTasks(): Promise<Task[]> {
    return request<Task[]>('/api/tasks');
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
  async getSessions(): Promise<FocusSession[]> {
    return request<FocusSession[]>('/api/sessions');
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

  /**
   * ---------------------------
   * Pomodoro (database)
   * ---------------------------
   */
  async getPomodoroSettings(): Promise<PomodoroSettings> {
    return request<PomodoroSettings>('/api/settings');
  },

  async setPomodoroSettings(settings: PomodoroSettings): Promise<void> {
    await request<PomodoroSettings>('/api/settings', {
      method: 'PATCH',
      body: settings,
    });
  },

  /**
   * ---------------------------
   * Clockfy integration
   * ---------------------------
   */
  async getClockfySettings(): Promise<ClockfySettings> {
    return request<ClockfySettings>('/api/integrations/clockfy');
  },

  async updateClockfySettings(settings: Partial<ClockfySettings>): Promise<ClockfySettings> {
    return request<ClockfySettings>('/api/integrations/clockfy', {
      method: 'PATCH',
      body: settings,
    });
  },

  /**
   * ---------------------------
   * Daily Plans (database)
   * ---------------------------
   */
  async getDailyPlans(): Promise<DailyPlan[]> {
    return request<DailyPlan[]>('/api/daily-plans');
  },

  async saveDailyPlan(plan: DailyPlan): Promise<DailyPlan> {
    return request<DailyPlan>('/api/daily-plans', {
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
