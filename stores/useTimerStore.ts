'use client';

import { create } from 'zustand';
import { PomodoroSettings, TimerState } from '@/types';
import { storage } from '@/lib/storage';
import { useAppStore } from '@/stores/useAppStore';

interface TimerStore extends TimerState {
  startTimer: (type: 'pomodoro' | 'manual', projectId: string, taskId?: string) => void;
  switchTask: (projectId: string, taskId?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  nextPhase: () => void;
  tick: () => void;
  restoreState: () => void;
  saveState: () => void;
}

type SessionPayload = Parameters<(typeof storage)['addSession']>[0];

interface AdvanceTimerResult {
  updatedFields: Partial<TimerState>;
  sessions: SessionPayload[];
  manualStop: boolean;
  consumedSeconds: number;
}

const initialTimerState: TimerState = {
  isRunning: false,
  isPaused: false,
  currentPhase: 'work',
  timeRemaining: 0,
  totalTime: 0,
  cycles: 0,
  currentCycle: 0,
  selectedProjectId: undefined,
  selectedTaskId: undefined,
  sessionStart: undefined,
  lastTickAt: undefined,
  elapsedInCycle: 0,
};

function advanceTimerState(
  state: TimerState,
  now: Date,
  pomodoroSettings: PomodoroSettings
): AdvanceTimerResult {
  const referenceIso = state.lastTickAt ?? state.sessionStart;
  if (!referenceIso) {
    const updatedFields: Partial<TimerState> = {};
    if (state.isRunning) {
      updatedFields.lastTickAt = now.toISOString();
    }
    return { updatedFields, sessions: [], manualStop: false, consumedSeconds: 0 };
  }

  const referenceMs = Date.parse(referenceIso);
  if (Number.isNaN(referenceMs)) {
    const updatedFields: Partial<TimerState> = {};
    if (state.isRunning) {
      updatedFields.lastTickAt = now.toISOString();
    }
    return { updatedFields, sessions: [], manualStop: false, consumedSeconds: 0 };
  }

  const elapsedSeconds = Math.floor((now.getTime() - referenceMs) / 1000);
  if (elapsedSeconds <= 0) {
    return { updatedFields: {}, sessions: [], manualStop: false, consumedSeconds: 0 };
  }

  const sessions: SessionPayload[] = [];
  let currentPhase = state.currentPhase;
  let timeRemaining = state.timeRemaining;
  let totalTime = state.totalTime;
  const cycles = state.cycles;
  let currentCycle = state.currentCycle;
  let sessionStart = state.sessionStart;
  let elapsedInCycle = state.elapsedInCycle;
  let isRunning = state.isRunning;
  const selectedProjectId = state.selectedProjectId;
  const selectedTaskId = state.selectedTaskId;
  let cursorMs = referenceMs;
  let remaining = elapsedSeconds;
  let manualStop = false;

  while (remaining > 0 && isRunning) {
    const available = timeRemaining > 0 ? timeRemaining : 0;

    if (available > remaining) {
      timeRemaining = available - remaining;
      cursorMs += remaining * 1000;
      remaining = 0;
      break;
    }

    cursorMs += available * 1000;
    remaining -= available;

    if (currentPhase === 'manual') {
      manualStop = true;
      isRunning = false;
      timeRemaining = 0;
      break;
    }

    if (currentPhase === 'work' && sessionStart && selectedProjectId) {
      const durationSec = totalTime - elapsedInCycle;
      if (durationSec > 0) {
        sessions.push({
          projectId: selectedProjectId,
          taskId: selectedTaskId,
          start: sessionStart,
          end: new Date(cursorMs).toISOString(),
          durationSec,
          type: 'pomodoro',
          pomodoroCycles: currentCycle,
        });
      }
    }

    if (!pomodoroSettings.autoStartNext) {
      isRunning = false;
      sessionStart = undefined;
      elapsedInCycle = 0;
      timeRemaining = 0;
      break;
    }

    if (currentPhase === 'work') {
      const isLongBreak = currentCycle >= cycles;
      const nextTime = isLongBreak
        ? pomodoroSettings.longBreakMin * 60
        : pomodoroSettings.shortBreakMin * 60;
      currentPhase = isLongBreak ? 'long-break' : 'short-break';
      totalTime = nextTime;
      timeRemaining = nextTime;
      currentCycle = isLongBreak ? 1 : currentCycle + 1;
      sessionStart = new Date(cursorMs).toISOString();
      elapsedInCycle = 0;
    } else {
      const workTime = pomodoroSettings.workMin * 60;
      currentPhase = 'work';
      totalTime = workTime;
      timeRemaining = workTime;
      sessionStart = new Date(cursorMs).toISOString();
      elapsedInCycle = 0;
    }
  }

  const updatedFields: Partial<TimerState> = {
    currentPhase,
    timeRemaining: Math.max(timeRemaining, 0),
    totalTime,
    currentCycle,
    sessionStart,
    elapsedInCycle,
    isRunning,
    lastTickAt: isRunning ? new Date(cursorMs).toISOString() : undefined,
  };

  const consumedSeconds = elapsedSeconds - remaining;

  return { updatedFields, sessions, manualStop, consumedSeconds };
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  ...initialTimerState,

  startTimer: (type, projectId, taskId) => {
    const pomodoroSettings = useAppStore.getState().pomodoroSettings;

    const totalTime = type === 'pomodoro' ? pomodoroSettings.workMin * 60 : 25 * 60;
    const nowIso = new Date().toISOString();

    set({
      isRunning: true,
      isPaused: false,
      currentPhase: type === 'pomodoro' ? 'work' : 'manual',
      timeRemaining: totalTime,
      totalTime,
      cycles: type === 'pomodoro' ? pomodoroSettings.cyclesToLongBreak : 0,
      currentCycle: type === 'pomodoro' ? 1 : 0,
      selectedProjectId: projectId,
      selectedTaskId: taskId,
      sessionStart: nowIso,
      lastTickAt: nowIso,
      elapsedInCycle: 0,
    });

    get().saveState();
  },

  switchTask: (projectId, taskId) => {
    const state = get();

    const elapsed = state.totalTime - state.timeRemaining;
    const durationSec = elapsed - state.elapsedInCycle;

    if (state.sessionStart && state.selectedProjectId && durationSec > 0) {
      const newSession = {
        projectId: state.selectedProjectId,
        taskId: state.selectedTaskId,
        start: state.sessionStart,
        end: new Date().toISOString(),
        durationSec,
        type: state.currentPhase === 'manual' ? ('manual' as const) : ('pomodoro' as const),
        pomodoroCycles: state.currentPhase === 'manual' ? undefined : state.currentCycle,
      };
      storage.addSession(newSession).then((created) => {
        try {
          useAppStore.setState((prev) => ({ sessions: [...prev.sessions, created] }));
        } catch {}
      });
    }

    const nowIso = new Date().toISOString();

    set({
      selectedProjectId: projectId,
      selectedTaskId: taskId,
      sessionStart: nowIso,
      lastTickAt: nowIso,
      elapsedInCycle: elapsed,
    });

    get().saveState();
  },

  pauseTimer: () => {
    set({ isPaused: true, lastTickAt: undefined });
    get().saveState();
  },

  resumeTimer: () => {
    const nowIso = new Date().toISOString();
    set({ isPaused: false, lastTickAt: nowIso });
    get().saveState();
  },

  stopTimer: () => {
    const state = get();

    if (state.sessionStart && state.selectedProjectId) {
      const elapsed = state.totalTime - state.timeRemaining;
      const durationSec = elapsed - state.elapsedInCycle;
      if (durationSec > 0) {
        const newSession = {
          projectId: state.selectedProjectId,
          taskId: state.selectedTaskId,
          start: state.sessionStart,
          end: new Date().toISOString(),
          durationSec,
          type: state.currentPhase === 'manual' ? ('manual' as const) : ('pomodoro' as const),
          pomodoroCycles: state.currentPhase === 'manual' ? undefined : state.currentCycle,
        };
        storage.addSession(newSession).then((created) => {
          try {
            useAppStore.setState((prev) => ({ sessions: [...prev.sessions, created] }));
          } catch {}
        });
      }
    }

    set({ ...initialTimerState });

    storage.clearTimerState();
  },

  resetTimer: () => {
    const state = get();
    const nowIso = new Date().toISOString();
    set({
      timeRemaining: state.totalTime,
      isPaused: false,
      lastTickAt: nowIso,
      elapsedInCycle: 0,
    });
    get().saveState();
  },

  nextPhase: () => {
    const state = get();
    const pomodoroSettings = useAppStore.getState().pomodoroSettings;
    const nowIso = new Date().toISOString();

    if (state.currentPhase === 'work') {
      const isLongBreak = state.currentCycle >= state.cycles;
      const nextPhase = isLongBreak ? 'long-break' : 'short-break';
      const nextTime = isLongBreak ? pomodoroSettings.longBreakMin * 60 : pomodoroSettings.shortBreakMin * 60;

      set({
        currentPhase: nextPhase,
        timeRemaining: nextTime,
        totalTime: nextTime,
        currentCycle: isLongBreak ? 1 : state.currentCycle + 1,
        sessionStart: nowIso,
        lastTickAt: nowIso,
        elapsedInCycle: 0,
      });
    } else {
      const workTime = pomodoroSettings.workMin * 60;
      set({
        currentPhase: 'work',
        timeRemaining: workTime,
        totalTime: workTime,
        sessionStart: nowIso,
        lastTickAt: nowIso,
        elapsedInCycle: 0,
      });
    }

    get().saveState();
  },

  tick: () => {
    const state = get();
    if (!state.isRunning || state.isPaused) return;

    const now = new Date();
    const pomodoroSettings = useAppStore.getState().pomodoroSettings;
    const { updatedFields, sessions, manualStop, consumedSeconds } = advanceTimerState(
      state,
      now,
      pomodoroSettings
    );

    const shouldPersist = consumedSeconds > 0 || sessions.length > 0 || manualStop;

    if (manualStop) {
      if (Object.keys(updatedFields).length > 0) {
        set(updatedFields);
      }
      get().stopTimer();
      return;
    }

    if (Object.keys(updatedFields).length > 0) {
      set(updatedFields);
    }

    sessions.forEach((session) => {
      storage.addSession(session).then((created) => {
        try {
          useAppStore.setState((prev) => ({ sessions: [...prev.sessions, created] }));
        } catch {}
      });
    });

    if (shouldPersist) {
      get().saveState();
    }
  },

  restoreState: () => {
    const savedState = storage.getTimerState<Partial<TimerState>>();
    if (!savedState) return;

    const normalized: TimerState = {
      ...initialTimerState,
      ...savedState,
      elapsedInCycle: savedState.elapsedInCycle ?? 0,
      lastTickAt: savedState.lastTickAt ?? savedState.sessionStart,
    };

    if (normalized.isRunning && !normalized.isPaused) {
      const now = new Date();
      const pomodoroSettings = useAppStore.getState().pomodoroSettings;
      const { updatedFields, sessions, manualStop, consumedSeconds } = advanceTimerState(
        normalized,
        now,
        pomodoroSettings
      );

      const finalState = { ...normalized, ...updatedFields };
      set(finalState);

      if (manualStop) {
        get().stopTimer();
        return;
      }

      sessions.forEach((session) => {
        storage.addSession(session).then((created) => {
          try {
            useAppStore.setState((prev) => ({ sessions: [...prev.sessions, created] }));
          } catch {}
        });
      });

      if (consumedSeconds > 0 || sessions.length > 0) {
        get().saveState();
      }
    } else {
      set(normalized);
    }
  },

  saveState: () => {
    const state = get();
    if (state.isRunning || state.sessionStart) {
      storage.setTimerState({
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        currentPhase: state.currentPhase,
        timeRemaining: state.timeRemaining,
        totalTime: state.totalTime,
        cycles: state.cycles,
        currentCycle: state.currentCycle,
        selectedProjectId: state.selectedProjectId,
        selectedTaskId: state.selectedTaskId,
        sessionStart: state.sessionStart,
        lastTickAt: state.lastTickAt,
        elapsedInCycle: state.elapsedInCycle,
      });
    }
  },
}));
