import { useState, useEffect } from 'react';
import { Sun, Moon, Key, Tag, Trash2, Plus, Check, X, Eye, EyeOff, AlertTriangle, LogIn, LogOut, User as UserIcon, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getDatabase } from '../db/database';
import { LS_GEMINI_KEY } from '../services/gemini.service';
import { supabase } from '../lib/supabase';
import type { Category } from '../types/index.d';

// ── 카테고리 CRUD 훅 ──────────────────────────────────────────
const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let sub: { unsubscribe: () => void } | null = null;

    getDatabase().then((db) => {
      sub = db.categories
        .find()
        .$
        .subscribe((docs) => {
          setCategories(docs.map((d) => d.toJSON() as Category));
        });
    });

    return () => sub?.unsubscribe();
  }, []);

  const addCategory = async (name: string, color: string) => {
    const db = await getDatabase();
    await db.categories.upsert({
      id: crypto.randomUUID(),
      name: name.trim(),
      color,
    });
  };

  const updateCategory = async (id: string, patch: Partial<Omit<Category, 'id'>>) => {
    const db = await getDatabase();
    const doc = await db.categories.findOne(id).exec();
    if (doc) await doc.patch(patch);
  };

  const deleteCategory = async (id: string) => {
    const db = await getDatabase();
    const doc = await db.categories.findOne(id).exec();
    if (doc) await doc.remove();
  };

  return { categories, addCategory, updateCategory, deleteCategory };
};

// ── 섹션 래퍼 ────────────────────────────────────────────────
const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-5 py-4">
    <div className="flex items-center gap-2 mb-4">
      <span className="text-indigo-500">{icon}</span>
      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">{title}</h2>
    </div>
    {children}
  </section>
);

// ── Settings 페이지 ───────────────────────────────────────────
const Settings = () => {
  const isDarkMode = useAppStore((s) => s.isDarkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const user = useAppStore((s) => s.user);
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();

  // ── 로그인 폼 상태 ───────────────────────────────────────────
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const handleAuth = async () => {
    if (!authEmail.trim() || !authPassword.trim()) return;
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        setAuthSuccess('가입 확인 이메일을 발송했습니다. 메일함을 확인해 주세요.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
      }
      setAuthEmail('');
      setAuthPassword('');
    } catch (e: unknown) {
      setAuthError(e instanceof Error ? e.message : '인증 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ── AI API Key ───────────────────────────────────────────────
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_GEMINI_KEY) ?? '');
  const [showKey, setShowKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const handleSaveKey = () => {
    localStorage.setItem(LS_GEMINI_KEY, apiKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleClearKey = () => {
    localStorage.removeItem(LS_GEMINI_KEY);
    setApiKey('');
  };

  // ── 카테고리 신규 입력 상태 ──────────────────────────────────
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  const handleAddCategory = () => {
    if (!newName.trim()) return;
    addCategory(newName, newColor);
    setNewName('');
    setNewColor('#6366f1');
  };

  // ── 카테고리 인라인 편집 상태 ────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const confirmEdit = () => {
    if (!editingId) return;
    updateCategory(editingId, { name: editName.trim() || '이름 없음', color: editColor });
    setEditingId(null);
  };

  // ── 전체 데이터 초기화 ───────────────────────────────────────
  const handleReset = async () => {
    const confirmed = window.confirm(
      '⚠️ 모든 Task와 카테고리 데이터가 영구 삭제됩니다.\n정말 초기화하시겠습니까?',
    );
    if (!confirmed) return;

    const db = await getDatabase();
    // 전체 tasks 논리 삭제 (is_deleted 플래그)
    const taskDocs = await db.tasks.find().exec();
    await Promise.all(
      taskDocs.map((doc) =>
        doc.patch({ is_deleted: true, updated_at: Date.now() }),
      ),
    );
    // 카테고리는 물리 삭제
    const catDocs = await db.categories.find().exec();
    await Promise.all(catDocs.map((doc) => doc.remove()));
  };

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto">
      {/* ── 0. 계정 및 동기화 ──────────────────────────────────── */}
      <Section icon={<UserIcon size={16} />} title="계정 및 동기화">
        {user ? (
          // 로그인 상태
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user.email?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{user.email}</p>
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">Supabase 동기화 활성화됨</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                         text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
            >
              <LogOut size={14} />
              로그아웃
            </button>
          </div>
        ) : (
          // 비로그인 상태
          <div className="flex flex-col gap-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              로그인하면 여러 기기 간 데이터가 Supabase를 통해 자동 동기화됩니다.
            </p>
            {/* 탭: 로그인 / 회원가입 */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setAuthMode(m); setAuthError(null); setAuthSuccess(null); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${authMode === m
                      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                    }`}
                >
                  {m === 'login' ? '로그인' : '회원가입'}
                </button>
              ))}
            </div>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="이메일"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm
                         bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              placeholder="비밀번호 (최소 6자)"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm
                         bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
            {authError && (
              <p className="text-xs text-red-400 dark:text-red-400">{authError}</p>
            )}
            {authSuccess && (
              <p className="text-xs text-green-500 dark:text-green-400">{authSuccess}</p>
            )}
            <button
              onClick={handleAuth}
              disabled={authLoading || !authEmail.trim() || !authPassword.trim()}
              className="flex items-center justify-center gap-2 py-2.5 bg-indigo-500 hover:bg-indigo-600
                         disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {authLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              {authMode === 'login' ? '로그인' : '회원가입'}
            </button>
          </div>
        )}
      </Section>
      <Section icon={isDarkMode ? <Moon size={16} /> : <Sun size={16} />} title="테마 설정">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {isDarkMode ? '다크 모드' : '라이트 모드'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              화면 테마를 변경합니다.
            </p>
          </div>
          {/* 토글 스위치 */}
          <button
            onClick={toggleDarkMode}
            aria-label="테마 전환"
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isDarkMode ? 'bg-indigo-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isDarkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </Section>

      {/* ── 2. AI 설정 ────────────────────────────────────────── */}
      <Section icon={<Key size={16} />} title="AI 설정">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          여기서 입력한 키가 환경변수보다 우선 사용됩니다.{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 underline"
          >
            Google AI Studio
          </a>
          에서 발급하세요.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy…"
              className="w-full pr-10 pl-3 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
                         rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showKey ? '키 숨기기' : '키 표시'}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button
            onClick={handleSaveKey}
            className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              keySaved
                ? 'bg-green-500 text-white'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white'
            }`}
          >
            {keySaved ? <Check size={14} /> : <Key size={14} />}
            {keySaved ? '저장됨' : '저장'}
          </button>
          {apiKey && (
            <button
              onClick={handleClearKey}
              className="shrink-0 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              aria-label="API Key 삭제"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </Section>

      {/* ── 3. 카테고리 관리 ──────────────────────────────────── */}
      <Section icon={<Tag size={16} />} title="카테고리 관리">
        {/* 카테고리 목록 */}
        <div className="space-y-2 mb-4">
          {categories.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              등록된 카테고리가 없습니다.
            </p>
          )}
          {categories.map((cat) =>
            editingId === cat.id ? (
              // 인라인 편집 행
              <div key={cat.id} className="flex items-center gap-2">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmEdit();
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  className="flex-1 px-2 py-1.5 border border-indigo-300 dark:border-indigo-600 dark:bg-gray-700 dark:text-gray-100
                             rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  onClick={confirmEdit}
                  className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                  aria-label="확인"
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  aria-label="취소"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              // 일반 행
              <div
                key={cat.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 group"
              >
                <span
                  className="shrink-0 w-4 h-4 rounded-full border border-white dark:border-gray-600 shadow-sm"
                  style={{ background: cat.color }}
                />
                <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                  {cat.name}
                </span>
                <button
                  onClick={() => startEdit(cat)}
                  className="p-1.5 text-gray-300 hover:text-indigo-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="수정"
                >
                  <Tag size={13} />
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="삭제"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ),
          )}
        </div>

        {/* 신규 카테고리 추가 */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0 shrink-0"
            aria-label="카테고리 색상"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder="새 카테고리 이름"
            className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100
                       rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
          <button
            onClick={handleAddCategory}
            disabled={!newName.trim()}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600
                       disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={14} />
            추가
          </button>
        </div>
      </Section>

      {/* ── 4. 데이터 관리 ────────────────────────────────────── */}
      <Section icon={<AlertTriangle size={16} />} title="데이터 관리">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          모든 Task와 카테고리 데이터를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-red-200 hover:border-red-400
                     text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-semibold transition-colors"
        >
          <Trash2 size={15} />
          모든 데이터 초기화
        </button>
      </Section>
    </div>
  );
};

export default Settings;
