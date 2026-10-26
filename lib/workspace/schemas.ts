import { z } from 'zod';

import { MAX_COLUMN_TITLE, MAX_COLUMNS } from '@/lib/workspace/defaults';

/** Validação compartilhada entre a criação de workspace e as configurações de foco. */
export const focusSettingsSchema = z.object({
  workMin: z.number().int().min(1).max(240),
  shortBreakMin: z.number().int().min(1).max(120),
  longBreakMin: z.number().int().min(1).max(240),
  cyclesToLongBreak: z.number().int().min(1).max(20),
  autoStartNext: z.boolean(),
  soundOn: z.boolean(),
  defaultChecklist: z.array(z.string().min(1).max(200)).max(50).default([]),
  defaultHourlyRate: z.number().min(0).max(1_000_000).optional(),
});

export const columnDraftSchema = z.object({
  title: z.string().trim().min(1, 'Informe o nome da coluna.').max(MAX_COLUMN_TITLE),
  isDone: z.boolean(),
});

export const columnsSchema = z.array(columnDraftSchema).max(MAX_COLUMNS);

export const presetLabelSchema = z.string().trim().min(1).max(120);

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome.').max(60),
  mode: z.enum(['WORK', 'STUDY']),
  settings: focusSettingsSchema.optional(),
  columns: columnsSchema.optional(),
  presets: z.array(presetLabelSchema).max(20).optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
