'use client';

import { create } from 'zustand';
import { TimerState } from '@/types';
import { storage } from '@/lib/storage';
import { useAppStore } from '@/stores/useAppStore';

interface TimerStore extends TimerState {
  startTimer: (type: 'pomodoro' | 'manual', projectId: string, taskId?: string) => void;
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

  startTimer: (type, projectId, taskId) => {
    const pomodoroSettings = JSON.parse(
      localStorage.getItem('focusforge/pomodoro-settings') ||
        '{"workMin":50,"shortBreakMin":10,"longBreakMin":20,"cyclesToLongBreak":3,"autoStartNext":true,"soundOn":true}'
    );

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
      const durationSec = state.totalTime - state.timeRemaining;
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
    });

    storage.clearTimerState();
  },

  resetTimer: () => {
    const state = get();
    set({
      timeRemaining: state.totalTime,
      isPaused: false,
    });
    get().saveState();
  },

  nextPhase: () => {
    const state = get();
    const pomodoroSettings = JSON.parse(
      localStorage.getItem('focusforge/pomodoro-settings') ||
        '{"workMin":50,"shortBreakMin":10,"longBreakMin":20,"cyclesToLongBreak":3,"autoStartNext":true,"soundOn":true}'
    );

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
      });
    } else {
      const workTime = pomodoroSettings.workMin * 60;
      set({
        currentPhase: 'work',
        timeRemaining: workTime,
        totalTime: workTime,
        sessionStart: new Date().toISOString(),
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
        const pomodoroSettings = JSON.parse(
          localStorage.getItem('focusforge/pomodoro-settings') ||
            '{"workMin":50,"shortBreakMin":10,"longBreakMin":20,"cyclesToLongBreak":3,"autoStartNext":true,"soundOn":true}'
        );

        // Persist finished phase as a session (typically a work phase)
        if (state.selectedProjectId && state.sessionStart && state.currentPhase === 'work') {
          const endIso = new Date().toISOString();
          const durationSec = state.totalTime; // completed phase duration
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
          set({ isRunning: false });
          // reset sessionStart when stopping automatically at boundary
          set({ sessionStart: undefined });
          get().saveState();
        }
      } else {
        get().stopTimer();
      }
    }
  },

  restoreState: () => {
    const savedState = storage.getTimerState();
    if (savedState && savedState.sessionStart) {
      const now = Date.now();
      const sessionStart = new Date(savedState.sessionStart).getTime();
      const timePassed = Math.floor((now - sessionStart) / 1000);
      const adjustedTimeRemaining = Math.max(0, savedState.timeRemaining - timePassed);

      set({
        ...savedState,
        timeRemaining: adjustedTimeRemaining,
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
      });
    }
  },
}));
