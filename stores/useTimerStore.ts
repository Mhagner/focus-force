'use client';

import { create } from 'zustand';
import { TimerState } from '@/types';
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

export const useTimerStore = create<TimerStore>((set, get) => ({
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
  elapsedInCycle: 0,

  startTimer: (type, projectId, taskId) => {
    const pomodoroSettings = useAppStore.getState().pomodoroSettings;

    const totalTime = type === 'pomodoro' ? pomodoroSettings.workMin * 60 : 25 * 60;

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
      sessionStart: new Date().toISOString(),
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

    set({
      selectedProjectId: projectId,
      selectedTaskId: taskId,
      sessionStart: new Date().toISOString(),
      elapsedInCycle: elapsed,
    });

    get().saveState();
  },

  pauseTimer: () => {
    set({ isPaused: true });
    get().saveState();
  },

  resumeTimer: () => {
    set({ isPaused: false });
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
          type: state.currentPhase === 'manual' ? 'manual' as const : 'pomodoro' as const,
          pomodoroCycles: state.currentPhase === 'manual' ? undefined : state.currentCycle,
        };
        storage.addSession(newSession).then((created) => {
          try {
            useAppStore.setState((prev) => ({ sessions: [...prev.sessions, created] }));
          } catch {}
        });
      }
    }

    set({
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
      elapsedInCycle: 0,
    });

    storage.clearTimerState();
  },

  resetTimer: () => {
    const state = get();
    set({
      timeRemaining: state.totalTime,
      isPaused: false,
      elapsedInCycle: 0,
    });
    get().saveState();
  },

  nextPhase: () => {
    const state = get();
    const pomodoroSettings = useAppStore.getState().pomodoroSettings;

    if (state.currentPhase === 'work') {
      const isLongBreak = state.currentCycle >= state.cycles;
      const nextPhase = isLongBreak ? 'long-break' : 'short-break';
      const nextTime = isLongBreak ? pomodoroSettings.longBreakMin * 60 : pomodoroSettings.shortBreakMin * 60;

      set({
        currentPhase: nextPhase,
        timeRemaining: nextTime,
        totalTime: nextTime,
        currentCycle: isLongBreak ? 1 : state.currentCycle + 1,
        sessionStart: new Date().toISOString(),
        elapsedInCycle: 0,
      });
    } else {
      const workTime = pomodoroSettings.workMin * 60;
      set({
        currentPhase: 'work',
        timeRemaining: workTime,
        totalTime: workTime,
        sessionStart: new Date().toISOString(),
        elapsedInCycle: 0,
      });
    }

    get().saveState();
  },

  tick: () => {
    const state = get();
    if (!state.isRunning || state.isPaused) return;

    if (state.timeRemaining > 0) {
      set({ timeRemaining: state.timeRemaining - 1 });
      get().saveState();
    } else {
      if (state.currentPhase !== 'manual') {
        const pomodoroSettings = useAppStore.getState().pomodoroSettings;

        // Persist finished phase as a session (typically a work phase)
        if (state.selectedProjectId && state.sessionStart && state.currentPhase === 'work') {
          const endIso = new Date().toISOString();
          const durationSec = state.totalTime - state.elapsedInCycle;
          const newSession = {
            projectId: state.selectedProjectId,
            taskId: state.selectedTaskId,
            start: state.sessionStart,
            end: endIso,
            durationSec,
            type: 'pomodoro' as const,
            pomodoroCycles: state.currentCycle,
          };
          storage.addSession(newSession).then((created) => {
            try {
              useAppStore.setState((prev) => ({ sessions: [...prev.sessions, created] }));
            } catch {}
          });
        }

        if (pomodoroSettings.autoStartNext) {
          get().nextPhase();
        } else {
          set({ isRunning: false, sessionStart: undefined, elapsedInCycle: 0 });
          get().saveState();
        }
      } else {
        get().stopTimer();
      }
    }
  },

  restoreState: () => {
    const savedState = storage.getTimerState();
    if (savedState) {
      set({
        ...savedState,
        elapsedInCycle: savedState.elapsedInCycle || 0,
        // Reset session start to now so elapsed time while away isn't counted
        sessionStart:
          savedState.isRunning && !savedState.isPaused
            ? new Date().toISOString()
            : savedState.sessionStart,
      });
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
        elapsedInCycle: state.elapsedInCycle,
      });
    }
  },
}));
