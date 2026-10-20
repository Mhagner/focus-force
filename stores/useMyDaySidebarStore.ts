'use client';

import { create } from 'zustand';

const STORAGE_KEY = 'focusforge/my-day-sidebar/collapsed';

interface MyDaySidebarStore {
  collapsed: boolean;
  hydrated: boolean;
  hydrate: () => void;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

function persist(collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  } catch {}
}

export const useMyDaySidebarStore = create<MyDaySidebarStore>((set, get) => ({
  collapsed: false,
  hydrated: false,

  hydrate: () => {
    let collapsed = false;
    try {
      collapsed = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {}
    set({ collapsed, hydrated: true });
  },

  toggle: () => {
    const next = !get().collapsed;
    set({ collapsed: next });
    persist(next);
  },

  setCollapsed: (collapsed) => {
    set({ collapsed });
    persist(collapsed);
  },
}));
