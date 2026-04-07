import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Task, Category } from '../types/index.d';
import { getDatabase } from '../db/database';
import { supabase } from '../lib/supabase';
import { startReplication, stopReplication } from './supabaseSync';

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

  // 카테고리 목록 (RxDB에서 동기화된 인메모리 미러)
  categories: Category[];
  _setCategories: (cats: Category[]) => void;

  // DB-connected CRUD (RxDB에 쓰고 구독을 통해 tasks 갱신)
  addTask: (task: Task) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Task 상세/수정 패널 (전역 — TaskItem 및 Timetable 블록에서 공유)
  detailTaskId: string | null;
  openDetail: (id: string) => void;
  closeDetail: () => void;

  // 다크모드
  isDarkMode: boolean;
  toggleDarkMode: () => void;

  // Supabase 로그인 사용자
  user: User | null;
  setUser: (user: User | null) => void;
}

const today = (): string => new Date().toISOString().slice(0, 10);

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedDate: today(),
  setSelectedDate: (date) => set({ selectedDate: date }),

  tasks: [],
  _setTasks: (tasks) => set({ tasks }),

  categories: [],
  _setCategories: (categories) => set({ categories }),

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

  detailTaskId: null,
  openDetail: (id) => set({ detailTaskId: id }),
  closeDetail: () => set({ detailTaskId: null }),

  isDarkMode: localStorage.getItem('darkMode') === 'true',
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.isDarkMode;
      localStorage.setItem('darkMode', String(next));
      document.documentElement.classList.toggle('dark', next);
      return { isDarkMode: next };
    }),

  user: null,
  setUser: (user) => set({ user }),
}));

// ── 앱 시작 시 저장된 다크모드 복원 ──────────────────────────
(function applyInitialDarkMode() {
  if (localStorage.getItem('darkMode') === 'true') {
    document.documentElement.classList.add('dark');
  }
})();

// ── RxDB → Zustand 실시간 동기화 (앱 시작 시 1회 호출) ────────
let _subscribed = false;

export const initDbSync = async (): Promise<void> => {
  if (_subscribed) return;
  _subscribed = true;

  const db = await getDatabase();

  // 전체 tasks 초기 로드 + 변경 구독
  db.tasks
    .find()
    .$
    .subscribe((docs) => {
      const tasks: Task[] = docs.map((d) => d.toJSON() as Task);
      useAppStore.getState()._setTasks(tasks);
    });

  // 카테고리 초기 로드 + 변경 구독
  db.categories
    .find()
    .$
    .subscribe((docs) => {
      const categories: Category[] = docs.map((d) => d.toJSON() as Category);
      useAppStore.getState()._setCategories(categories);
    });

  // ── Supabase 세션 감지 + Replication ────────────────────────
  // 초기 세션 확인
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    useAppStore.getState().setUser(session.user);
    startReplication(db, session.user.id);
  }

  // 세션 변경 구독 (로그인/로그아웃 시 자동 처리)
  supabase.auth.onAuthStateChange(async (event, session) => {
    const user = session?.user ?? null;
    useAppStore.getState().setUser(user);

    if (event === 'SIGNED_IN' && user) {
      startReplication(db, user.id);
    } else if (event === 'SIGNED_OUT') {
      stopReplication();
      // 로컬 DB 사용자 데이터 초기화 (논리 삭제)
      const taskDocs = await db.tasks.find().exec();
      await Promise.all(
        taskDocs.map((doc) =>
          doc.patch({ is_deleted: true, updated_at: Date.now() }),
        ),
      );
    }
  });
};
