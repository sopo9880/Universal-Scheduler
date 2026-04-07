import { create } from 'zustand';
import type { Task } from '../types/index.d';
import { getDatabase } from '../db/database';

export type TabName = 'home' | 'calendar' | 'timetable' | 'settings';

interface AppState {
  // 현재 활성 탭
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;

  // 선택된 날짜 (YYYY-MM-DD 형식)
  selectedDate: string;
  setSelectedDate: (date: string) => void;

  // Task 목록 (RxDB에서 동기화된 인메모리 미러)
  tasks: Task[];
  _setTasks: (tasks: Task[]) => void;

  // DB-connected CRUD (RxDB에 쓰고 구독을 통해 tasks 갱신)
  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

const today = (): string => new Date().toISOString().slice(0, 10);

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedDate: today(),
  setSelectedDate: (date) => set({ selectedDate: date }),

  tasks: [],
  _setTasks: (tasks) => set({ tasks }),

  addTask: async (task) => {
    const db = await getDatabase();
    await db.tasks.upsert(task);
  },

  updateTask: async (id, patch) => {
    const db = await getDatabase();
    const doc = await db.tasks.findOne(id).exec();
    if (!doc) return;
    await doc.patch({ ...patch, updated_at: Date.now() });
  },

  deleteTask: async (id) => {
    const db = await getDatabase();
    const doc = await db.tasks.findOne(id).exec();
    if (!doc) return;
    await doc.patch({ is_deleted: true, updated_at: Date.now() });
  },
}));

// ── RxDB → Zustand 실시간 동기화 (앱 시작 시 1회 호출) ────────
let _subscribed = false;

export const initDbSync = async (): Promise<void> => {
  if (_subscribed) return;
  _subscribed = true;

  const db = await getDatabase();

  // 전체 tasks 초기 로드 + 변경 구독
  db.tasks
    .find()
    .$ // RxDB observable
    .subscribe((docs) => {
      const tasks: Task[] = docs.map((d) => d.toJSON() as Task);
      useAppStore.getState()._setTasks(tasks);
    });
};
