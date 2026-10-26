'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  FolderKanban,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Sun,
  Timer,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { newColumnKey, SortableColumnList, type ColumnItem } from '@/components/onboarding/SortableColumnList';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { storage } from '@/lib/storage';
import { cn } from '@/lib/utils';
import {
  DEFAULT_COLUMNS,
  DEFAULT_FOCUS,
  DEFAULT_PRESETS,
  FOCUS_PRESETS,
  validateColumns,
  type FocusSettingsInput,
} from '@/lib/workspace/defaults';
import { MODE_DESCRIPTIONS, type WorkspaceMode } from '@/lib/workspace/labels';
import { useAppStore } from '@/stores/useAppStore';

type Step = 'welcome' | 'type' | 'focus' | 'columns' | 'presets' | 'summary';

interface PresetItem {
  label: string;
  enabled: boolean;
  custom: boolean;
}

const STEP_TITLES: Record<Step, string> = {
  welcome: 'Bem-vindo ao FocusForge',
  type: 'Que tipo de workspace você quer criar?',
  focus: 'Como você prefere focar?',
  columns: 'Colunas do seu quadro',
  presets: 'Descrições de sessão',
  summary: 'Tudo pronto?',
};

interface WorkspaceOnboardingProps {
  /** `first`: tela cheia, sem fechar (usuário sem workspace). `new`: diálogo para criar mais um workspace. */
  variant: 'first' | 'new';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function WorkspaceOnboarding({ variant, open = true, onOpenChange }: WorkspaceOnboardingProps) {
  const createWorkspace = useAppStore((state) => state.createWorkspace);
  const steps = useMemo<Step[]>(
    () =>
      variant === 'first'
        ? ['welcome', 'type', 'focus', 'columns', 'presets', 'summary']
        : ['type', 'focus', 'columns', 'presets', 'summary'],
    [variant],
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [mode, setMode] = useState<WorkspaceMode | null>(null);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [focus, setFocus] = useState<FocusSettingsInput>({ ...DEFAULT_FOCUS.STUDY });
  const [columns, setColumns] = useState<ColumnItem[]>([]);
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [newPreset, setNewPreset] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState<{ canCreate: boolean; max: number | null } | null>(null);

  const step = steps[stepIndex];

  // Cada abertura começa do zero: um workspace novo nunca herda a configuração do anterior.
  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setMode(null);
    setName('');
    setNameTouched(false);
    setColumns([]);
    setPresets([]);
    setNewPreset('');
    setError(null);
    setIsSaving(false);
    if (variant === 'new') {
      storage
        .getWorkspaceLimits()
        .then(setLimit)
        .catch(() => setLimit(null));
    }
  }, [open, variant]);

  const columnDrafts = columns.map(({ title, isDone }) => ({ title, isDone }));
  const columnProblems = validateColumns(columnDrafts);

  const resetFocus = (target: WorkspaceMode) => setFocus({ ...DEFAULT_FOCUS[target] });
  const resetColumns = (target: WorkspaceMode) =>
    setColumns(DEFAULT_COLUMNS[target].map((column) => ({ key: newColumnKey(), ...column })));
  const resetPresets = (target: WorkspaceMode) =>
    setPresets(DEFAULT_PRESETS[target].map((label) => ({ label, enabled: true, custom: false })));

  const chooseMode = (target: WorkspaceMode) => {
    if (target === mode) return;
    setMode(target);
    resetFocus(target);
    resetColumns(target);
    resetPresets(target);
    if (!nameTouched) setName(target === 'STUDY' ? 'Estudos' : 'Trabalho');
  };

  const limitBlocked = variant === 'new' && limit?.canCreate === false;
  const canNext: Record<Step, boolean> = {
    welcome: true,
    type: Boolean(mode) && name.trim().length > 0 && !limitBlocked,
    focus: true,
    columns: columnProblems.length === 0,
    presets: true,
    summary: true,
  };

  const enabledPresets = presets.filter((preset) => preset.enabled && preset.label.trim()).map((preset) => preset.label.trim());

  const addPreset = () => {
    const label = newPreset.trim();
    if (!label || presets.some((preset) => preset.label.toLowerCase() === label.toLowerCase())) return;
    setPresets((current) => [...current, { label: label.slice(0, 120), enabled: true, custom: true }]);
    setNewPreset('');
  };

  const handleCreate = async () => {
    if (!mode) return;
    setIsSaving(true);
    setError(null);
    try {
      await createWorkspace({
        name: name.trim(),
        mode,
        settings: {
          ...focus,
          defaultChecklist: [],
          defaultHourlyRate: mode === 'WORK' ? focus.defaultHourlyRate ?? 0 : undefined,
        },
        columns: columns.map((column) => ({ title: column.title.trim(), isDone: column.isDone })),
        presets: enabledPresets,
      });
      toast.success(`Workspace "${name.trim()}" criado.`);
      onOpenChange?.(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o workspace.');
    } finally {
      setIsSaving(false);
    }
  };

  const goNext = () => {
    if (!canNext[step]) return;
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };
  const goBack = () => setStepIndex((index) => Math.max(index - 1, 0));

  const focusSlider = (label: string, value: number, min: number, max: number, onChange: (next: number) => void, unit = 'min') => (
    <div>
      <Label className="mb-3 block">
        {label}: {value} {unit}
      </Label>
      <Slider value={[value]} min={min} max={max} step={1} onValueChange={([next]) => onChange(next)} />
    </div>
  );

  const body: Record<Step, ReactNode> = {
    welcome: (
      <div className="space-y-5">
        <p className="text-ink-muted">
          Organize seu tempo e acompanhe seu progresso em poucos passos. Veja o que você vai encontrar:
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: Timer, title: 'Sessões de foco', text: 'Pomodoro ou cronômetro livre, com o registro do que você fez em cada sessão.' },
            { icon: FolderKanban, title: 'Quadro kanban', text: 'Projetos (ou matérias) e tarefas (ou tópicos) em colunas que você controla.' },
            { icon: Sun, title: 'Meu Dia', text: 'Escolha o que fazer hoje e acompanhe o que já concluiu.' },
            { icon: Layers, title: 'Workspaces', text: 'Espaços separados para Estudos e Trabalho, cada um com as próprias configurações.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-lg border border-border bg-background p-4">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-ink">{title}</p>
                <p className="mt-1 text-sm text-ink-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-ink-muted">Agora vamos criar o seu primeiro workspace.</p>
      </div>
    ),

    type: (
      <div className="space-y-6">
        {limitBlocked && (
          <p className="rounded-lg border border-accent-orange/40 bg-accent-orange/[0.1] p-3 text-sm text-ink" role="alert">
            Seu plano permite {limit?.max} workspace{limit?.max === 1 ? '' : 's'} ativo{limit?.max === 1 ? '' : 's'}. Arquive um
            existente ou faça upgrade para criar outro.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {(['STUDY', 'WORK'] as const).map((option) => {
            const Icon = option === 'STUDY' ? GraduationCap : Briefcase;
            const selected = mode === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => chooseMode(option)}
                aria-pressed={selected}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors',
                  selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40',
                )}
              >
                <Icon className="h-6 w-6 text-primary" />
                <span className="font-semibold text-ink">{MODE_DESCRIPTIONS[option].title}</span>
                <span className="text-sm text-ink-muted">{MODE_DESCRIPTIONS[option].description}</span>
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <Label htmlFor="onboarding-name">Nome do workspace</Label>
          <Input
            id="onboarding-name"
            value={name}
            maxLength={60}
            placeholder={mode === 'WORK' ? 'Ex.: Trabalho, Freelas' : 'Ex.: Concurso TRF, ENEM 2026'}
            onChange={(event) => {
              setName(event.target.value);
              setNameTouched(true);
            }}
          />
        </div>
        <p className="text-xs text-ink-muted">O tipo não pode ser alterado depois de criado.</p>
      </div>
    ),

    focus: (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {Object.values(FOCUS_PRESETS).map((preset) => (
            <Button
              key={preset.label}
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setFocus((current) => ({
                  ...current,
                  workMin: preset.workMin,
                  shortBreakMin: preset.shortBreakMin,
                  longBreakMin: preset.longBreakMin,
                  cyclesToLongBreak: preset.cyclesToLongBreak,
                }))
              }
            >
              {preset.label} ({preset.workMin}/{preset.shortBreakMin}/{preset.longBreakMin})
            </Button>
          ))}
          {mode && (
            <Button type="button" size="sm" variant="ghost" onClick={() => resetFocus(mode)}>
              Usar padrão
            </Button>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {focusSlider('Tempo de foco', focus.workMin, 5, 120, (workMin) => setFocus({ ...focus, workMin }))}
          {focusSlider('Pausa curta', focus.shortBreakMin, 1, 30, (shortBreakMin) => setFocus({ ...focus, shortBreakMin }))}
          {focusSlider('Pausa longa', focus.longBreakMin, 5, 60, (longBreakMin) => setFocus({ ...focus, longBreakMin }))}
          {focusSlider('Ciclos até a pausa longa', focus.cyclesToLongBreak, 2, 8, (cyclesToLongBreak) => setFocus({ ...focus, cyclesToLongBreak }), '')}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="ob-auto">Iniciar a próxima fase automaticamente</Label>
            <Switch id="ob-auto" checked={focus.autoStartNext} onCheckedChange={(autoStartNext) => setFocus({ ...focus, autoStartNext })} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ob-sound">Notificações sonoras</Label>
            <Switch id="ob-sound" checked={focus.soundOn} onCheckedChange={(soundOn) => setFocus({ ...focus, soundOn })} />
          </div>
          {mode === 'WORK' && (
            <div className="space-y-2">
              <Label htmlFor="ob-rate">Valor/hora padrão (R$) — opcional</Label>
              <Input
                id="ob-rate"
                type="number"
                min="0"
                step="0.01"
                className="max-w-xs"
                value={focus.defaultHourlyRate ?? ''}
                onChange={(event) =>
                  setFocus({ ...focus, defaultHourlyRate: event.target.value === '' ? 0 : Math.max(0, parseFloat(event.target.value) || 0) })
                }
              />
            </div>
          )}
        </div>
      </div>
    ),

    columns: (
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Estas são as etapas do seu quadro. Renomeie, adicione, remova e arraste para a ordem que preferir. A coluna de{' '}
          <strong>conclusão</strong> marca como concluído tudo o que chegar nela.
        </p>
        <SortableColumnList items={columns} onChange={setColumns} />
        {columnProblems.length > 0 && (
          <ul className="space-y-1 text-sm text-danger" role="alert">
            {columnProblems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        )}
        {mode && (
          <Button type="button" variant="ghost" size="sm" onClick={() => resetColumns(mode)}>
            Usar colunas padrão
          </Button>
        )}
      </div>
    ),

    presets: (
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Sugestões rápidas para descrever o que você fez em cada sessão. Marque as que quiser manter e adicione as suas.
        </p>
        <ul className="space-y-2">
          {presets.map((preset) => (
            <li key={preset.label} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
              <Checkbox
                id={`preset-${preset.label}`}
                checked={preset.enabled}
                onCheckedChange={(checked) =>
                  setPresets((current) => current.map((item) => (item.label === preset.label ? { ...item, enabled: checked === true } : item)))
                }
              />
              <Label htmlFor={`preset-${preset.label}`} className="flex-1 font-normal">
                {preset.label}
              </Label>
              {preset.custom && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-ink-muted hover:text-danger"
                  aria-label={`Remover ${preset.label}`}
                  onClick={() => setPresets((current) => current.filter((item) => item.label !== preset.label))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input
            value={newPreset}
            maxLength={120}
            placeholder="Nova descrição"
            onChange={(event) => setNewPreset(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addPreset();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addPreset} disabled={!newPreset.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
        {mode && (
          <Button type="button" variant="ghost" size="sm" onClick={() => resetPresets(mode)}>
            Usar padrão
          </Button>
        )}
      </div>
    ),

    summary: (
      <div className="space-y-4 text-sm">
        <dl className="space-y-3">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Workspace</dt>
            <dd className="text-right font-medium text-ink">
              {name.trim()} · {mode ? MODE_DESCRIPTIONS[mode].title : ''}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Foco</dt>
            <dd className="text-right text-ink">
              {focus.workMin} min de foco · pausa {focus.shortBreakMin}/{focus.longBreakMin} min · {focus.cyclesToLongBreak} ciclos
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-ink-muted">Colunas</dt>
            <dd className="flex flex-wrap items-center gap-1 text-ink">
              {columns.map((column, index) => (
                <span key={column.key} className="flex items-center gap-1">
                  {index > 0 && <ArrowRight className="h-3 w-3 text-ink-muted" />}
                  <span className={cn('rounded-md bg-secondary px-2 py-0.5', column.isDone && 'font-semibold text-success')}>
                    {column.title.trim()}
                    {column.isDone ? ' ✔' : ''}
                  </span>
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-ink-muted">Descrições de sessão</dt>
            <dd className="text-ink">{enabledPresets.length > 0 ? enabledPresets.join(' · ') : 'Nenhuma'}</dd>
          </div>
        </dl>
        {error && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    ),
  };

  const isLast = stepIndex === steps.length - 1;

  const content = (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          Passo {stepIndex + 1} de {steps.length}
        </p>
        <Progress value={((stepIndex + 1) / steps.length) * 100} className="h-1.5" />
        <h2 className="font-display text-2xl font-bold text-ink">{STEP_TITLES[step]}</h2>
      </div>

      <div>{body[step]}</div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <div>
          {variant === 'new' && stepIndex === 0 ? (
            <Button type="button" variant="ghost" onClick={() => onOpenChange?.(false)}>
              Cancelar
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={goBack} disabled={stepIndex === 0 || isSaving}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          )}
        </div>

        {isLast ? (
          <Button type="button" onClick={handleCreate} disabled={isSaving || !mode || columnProblems.length > 0}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Criar workspace
              </>
            )}
          </Button>
        ) : (
          <Button type="button" onClick={goNext} disabled={!canNext[step]}>
            {step === 'welcome' ? 'Começar' : 'Continuar'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  if (variant === 'first') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configuração inicial"
        className="fixed inset-0 z-[100] overflow-y-auto bg-background"
      >
        <div className="mx-auto flex min-h-full max-w-2xl items-center px-4 py-10">
          <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogTitle className="sr-only">Novo workspace</DialogTitle>
        <DialogDescription className="sr-only">Assistente para criar e configurar um novo workspace.</DialogDescription>
        {content}
      </DialogContent>
    </Dialog>
  );
}
