import type { WorkspaceMode } from '@/lib/workspace/labels';

/**
 * Fonte única dos valores iniciais de um workspace novo, por tipo.
 * Usada pela API (quando o corpo omite algo) e pelo assistente de onboarding.
 */

export interface ColumnDraft {
  title: string;
  /** Coluna de conclusão: todo workspace tem exatamente uma. */
  isDone: boolean;
}

export interface FocusSettingsInput {
  workMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  cyclesToLongBreak: number;
  autoStartNext: boolean;
  soundOn: boolean;
  defaultChecklist: string[];
  /** Só faz sentido em workspaces de trabalho. */
  defaultHourlyRate?: number;
}

export const DEFAULT_COLUMNS: Record<WorkspaceMode, ColumnDraft[]> = {
  WORK: [
    { title: 'Backlog', isDone: false },
    { title: 'Em andamento', isDone: false },
    { title: 'Concluído', isDone: true },
  ],
  STUDY: [
    { title: 'A estudar', isDone: false },
    { title: 'Teoria', isDone: false },
    { title: 'Exercícios', isDone: false },
    { title: 'Revisão', isDone: false },
    { title: 'Dominado', isDone: true },
  ],
};

export const FOCUS_PRESETS = {
  classic: { label: 'Pomodoro clássico', workMin: 25, shortBreakMin: 5, longBreakMin: 15, cyclesToLongBreak: 4 },
  deep: { label: 'Foco profundo', workMin: 50, shortBreakMin: 10, longBreakMin: 20, cyclesToLongBreak: 3 },
} as const;

export const DEFAULT_FOCUS: Record<WorkspaceMode, FocusSettingsInput> = {
  WORK: {
    workMin: FOCUS_PRESETS.deep.workMin,
    shortBreakMin: FOCUS_PRESETS.deep.shortBreakMin,
    longBreakMin: FOCUS_PRESETS.deep.longBreakMin,
    cyclesToLongBreak: FOCUS_PRESETS.deep.cyclesToLongBreak,
    autoStartNext: true,
    soundOn: true,
    defaultChecklist: [],
    defaultHourlyRate: 0,
  },
  STUDY: {
    workMin: FOCUS_PRESETS.classic.workMin,
    shortBreakMin: FOCUS_PRESETS.classic.shortBreakMin,
    longBreakMin: FOCUS_PRESETS.classic.longBreakMin,
    cyclesToLongBreak: FOCUS_PRESETS.classic.cyclesToLongBreak,
    autoStartNext: true,
    soundOn: true,
    defaultChecklist: [],
  },
};

/** Descrições de sessão sugeridas (3 por tipo). */
export const DEFAULT_PRESETS: Record<WorkspaceMode, string[]> = {
  WORK: ['Reunião e alinhamento', 'Desenvolvimento e execução', 'Planejamento e documentação'],
  STUDY: ['Aula e leitura teórica', 'Resolução de questões', 'Revisão e resumos'],
};

export const MAX_COLUMNS = 30;
export const MAX_COLUMN_TITLE = 40;

/** Retorna a lista de problemas (vazia = válida). Regras: 2–30 colunas, títulos 1–40, exatamente uma de conclusão. */
export function validateColumns(columns: ColumnDraft[]): string[] {
  const problems: string[] = [];

  if (columns.length < 2) problems.push('Mantenha pelo menos 2 colunas.');
  if (columns.length > MAX_COLUMNS) problems.push(`No máximo ${MAX_COLUMNS} colunas.`);

  columns.forEach((column, index) => {
    const title = column.title.trim();
    if (!title) problems.push(`A coluna ${index + 1} está sem nome.`);
    if (title.length > MAX_COLUMN_TITLE) problems.push(`A coluna ${index + 1} passa de ${MAX_COLUMN_TITLE} caracteres.`);
  });

  const doneCount = columns.filter((column) => column.isDone).length;
  if (doneCount !== 1) problems.push('É preciso ter exatamente uma coluna de conclusão.');

  return problems;
}
