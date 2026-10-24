import { HttpError } from '@/lib/auth/require-user';
import { prisma } from '@/lib/prisma';
import { DEFAULT_COLUMNS, DEFAULT_FOCUS, DEFAULT_PRESETS, validateColumns } from '@/lib/workspace/defaults';
import type { CreateWorkspaceInput } from '@/lib/workspace/schemas';

/**
 * Cria o workspace já configurado (colunas, foco e descrições de sessão) numa única transação.
 * Nada é copiado de outros workspaces: o que não vier no corpo usa os padrões do tipo escolhido.
 */
export async function createWorkspaceWithSetup(userId: string, input: CreateWorkspaceInput) {
  const columns = input.columns ?? DEFAULT_COLUMNS[input.mode];
  const problems = validateColumns(columns);
  if (problems.length > 0) {
    throw new HttpError(400, problems[0]);
  }

  const base = DEFAULT_FOCUS[input.mode];
  const focus = { ...base, ...(input.settings ?? {}) };
  const presets = input.presets ?? DEFAULT_PRESETS[input.mode];

  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { userId, name: input.name, mode: input.mode, onboardedAt: new Date() },
    });

    await tx.boardColumn.createMany({
      data: columns.map((column, index) => ({
        userId,
        workspaceId: workspace.id,
        title: column.title.trim(),
        position: index,
        isDone: column.isDone,
      })),
    });

    await tx.pomodoroSettings.create({
      data: {
        userId,
        workspaceId: workspace.id,
        workMin: focus.workMin,
        shortBreakMin: focus.shortBreakMin,
        longBreakMin: focus.longBreakMin,
        cyclesToLongBreak: focus.cyclesToLongBreak,
        autoStartNext: focus.autoStartNext,
        soundOn: focus.soundOn,
        defaultChecklist: focus.defaultChecklist,
        // valor/hora só existe em workspaces de trabalho
        defaultHourlyRate: input.mode === 'WORK' ? focus.defaultHourlyRate ?? 0 : null,
      },
    });

    if (presets.length > 0) {
      await tx.sessionDescriptionPreset.createMany({
        data: presets.map((label, index) => ({
          userId,
          workspaceId: workspace.id,
          label: label.trim(),
          order: index,
        })),
      });
    }

    return workspace;
  });
}
