import { create } from 'zustand';
import type { Task } from '../types/index.d';

export type TabName = 'home' | 'calendar' | 'timetable' | 'settings';

interface AppState {
  // 현재 활성 탭
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;

  // 선택된 날짜 (YYYY-MM-DD 형식)
  selectedDate: string;
  setSelectedDate: (date: string) => void;

  // Task 목록
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
}

const today = (): string => {
  return new Date().toISOString().slice(0, 10);
};

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedDate: today(),
  setSelectedDate: (date) => set({ selectedDate: date }),

  tasks: [],
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...patch, updated_at: Date.now() } : t
      ),
    })),
  deleteTask: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, is_deleted: true, updated_at: Date.now() } : t
      ),
    })),
}));
