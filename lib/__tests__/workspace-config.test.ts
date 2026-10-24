import { describe, expect, it } from 'vitest';

import {
  columnForLegacyStatus,
  doneColumn,
  firstOpenColumn,
  statusForColumn,
  transitionData,
  type ColumnLite,
} from '@/lib/tasks/column-status';
import {
  DEFAULT_COLUMNS,
  DEFAULT_FOCUS,
  DEFAULT_PRESETS,
  validateColumns,
} from '@/lib/workspace/defaults';

const cols = (...flags: boolean[]): ColumnLite[] => flags.map((isDone, i) => ({ id: `c${i}`, position: i, isDone }));

describe('defaults por tipo', () => {
  it('colunas padrão são válidas e têm exatamente uma de conclusão', () => {
    for (const mode of ['WORK', 'STUDY'] as const) {
      expect(validateColumns(DEFAULT_COLUMNS[mode])).toEqual([]);
      expect(DEFAULT_COLUMNS[mode].filter((c) => c.isDone)).toHaveLength(1);
    }
  });

  it('nomes e ordem pedidos', () => {
    expect(DEFAULT_COLUMNS.WORK.map((c) => c.title)).toEqual(['Backlog', 'Em andamento', 'Concluído']);
    expect(DEFAULT_COLUMNS.STUDY.map((c) => c.title)).toEqual(['A estudar', 'Teoria', 'Exercícios', 'Revisão', 'Dominado']);
    expect(DEFAULT_COLUMNS.WORK.at(-1)?.isDone).toBe(true);
    expect(DEFAULT_COLUMNS.STUDY.at(-1)?.isDone).toBe(true);
  });

  it('3 descrições de sessão por tipo e configurações de foco coerentes', () => {
    expect(DEFAULT_PRESETS.WORK).toHaveLength(3);
    expect(DEFAULT_PRESETS.STUDY).toHaveLength(3);
    for (const mode of ['WORK', 'STUDY'] as const) {
      const focus = DEFAULT_FOCUS[mode];
      expect(focus.workMin).toBeGreaterThan(0);
      expect(focus.longBreakMin).toBeGreaterThanOrEqual(focus.shortBreakMin);
    }
  });
});

describe('validateColumns', () => {
  it('rejeita menos de 2 colunas, nome vazio/longo e conclusão ausente ou duplicada', () => {
    expect(validateColumns([{ title: 'Só uma', isDone: true }])).not.toEqual([]);
    expect(validateColumns([{ title: ' ', isDone: false }, { title: 'x', isDone: true }])).not.toEqual([]);
    expect(validateColumns([{ title: 'x'.repeat(41), isDone: false }, { title: 'y', isDone: true }])).not.toEqual([]);
    expect(validateColumns([{ title: 'a', isDone: false }, { title: 'b', isDone: false }])).not.toEqual([]);
    expect(validateColumns([{ title: 'a', isDone: true }, { title: 'b', isDone: true }])).not.toEqual([]);
  });
});

describe('status derivado da coluna', () => {
  const columns = cols(false, false, false, true); // A, B, C, Concluído

  it('1ª aberta = todo, intermediárias = doing, conclusão = done', () => {
    expect(statusForColumn(columns[0], columns)).toBe('todo');
    expect(statusForColumn(columns[1], columns)).toBe('doing');
    expect(statusForColumn(columns[2], columns)).toBe('doing');
    expect(statusForColumn(columns[3], columns)).toBe('done');
  });

  it('conclusão arrastada para o início continua sendo done e a 1ª aberta passa a ser a seguinte', () => {
    const moved = cols(true, false, false);
    expect(statusForColumn(moved[0], moved)).toBe('done');
    expect(firstOpenColumn(moved)?.id).toBe('c1');
    expect(statusForColumn(moved[1], moved)).toBe('todo');
  });

  it('status legado é traduzido para uma coluna', () => {
    expect(columnForLegacyStatus('done', columns)?.id).toBe('c3');
    expect(columnForLegacyStatus('todo', columns)?.id).toBe('c0');
    expect(columnForLegacyStatus('doing', columns)?.id).toBe('c1');
    expect(columnForLegacyStatus('pronta_elaboracao', columns)?.id).toBe('c1');
    expect(columnForLegacyStatus('doing', cols(false, true))?.id).toBe('c0'); // só uma aberta
    expect(doneColumn(columns)?.id).toBe('c3');
  });
});

describe('transição ao mover tarefa', () => {
  const columns = cols(false, false, true);

  it('entrar na conclusão carimba completedAt e limpa plannedFor', () => {
    const result = transitionData({ completedAt: null, plannedFor: 'today' }, false, columns[2], columns);
    expect(result.status).toBe('done');
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.plannedFor).toBeNull();
  });

  it('já concluída movida para outra conclusão não recarimba', () => {
    const result = transitionData({ completedAt: new Date(), plannedFor: null }, true, columns[2], columns);
    expect(result.completedAt).toBeUndefined();
  });

  it('sair da conclusão limpa completedAt', () => {
    const result = transitionData({ completedAt: new Date(), plannedFor: null }, true, columns[0], columns);
    expect(result.status).toBe('todo');
    expect(result.completedAt).toBeNull();
  });

  it('mover entre colunas abertas não mexe em completedAt', () => {
    const result = transitionData({ completedAt: null, plannedFor: 'today' }, false, columns[1], columns);
    expect(result.status).toBe('doing');
    expect('completedAt' in result).toBe(false);
    expect('plannedFor' in result).toBe(false);
  });
});
