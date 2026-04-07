import { useState, useRef, useEffect } from 'react';
import { Plus, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { parseNaturalLanguage } from '../../services/gemini.service';
import { parseWithRules } from '../../lib/parser';
import { nlpToTask } from '../../lib/nlpToTask';

const SmartInputBar = () => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addTask = useAppStore((s) => s.addTask);

  // 열릴 때 포커스
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const close = () => {
    setOpen(false);
    setText('');
    setFeedback(null);
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setFeedback(null);

    try {
      const nlpResult = await parseNaturalLanguage(trimmed);
      const task = nlpToTask(nlpResult);
      addTask(task);
      setFeedback(`✅ "${task.title}" 추가됨 (${task.target_period})`);
      setText('');
      setTimeout(close, 1500);
    } catch {
      // API 실패 → Rule-based 파서로 폴백
      try {
        const nlpResult = parseWithRules(trimmed);
        const task = nlpToTask(nlpResult);
        addTask(task);
        setFeedback(`📋 오프라인 파싱: "${task.title}" (${task.target_period})`);
        setText('');
        setTimeout(close, 1800);
      } catch {
        setFeedback('❌ 파싱 실패 — 다시 시도해주세요');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') close();
  };

  return (
    <>
      {/* ── FAB 버튼 ──────────────────────────────────────────── */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="fab"
            onClick={() => setOpen(true)}
            aria-label="새 할 일 추가"
            className="fixed bottom-20 right-5 z-30 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            <Plus size={26} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── 배경 딤 ──────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="dim"
            className="fixed inset-0 z-30 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={close}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ── Smart Input Panel ──────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="input-bar"
            className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 px-4 pt-4 pb-safe shadow-2xl rounded-t-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-indigo-600">
                <Sparkles size={16} />
                <span className="text-sm font-semibold">AI 스마트 입력</span>
              </div>
              <button
                onClick={close}
                aria-label="닫기"
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* 입력 + 전송 */}
            <div className="flex items-center gap-2 mb-3">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="예) 내일 오후 3시에 팀 미팅"
                disabled={loading}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition disabled:opacity-50"
              />
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || loading}
                aria-label="전송"
                className="w-11 h-11 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 text-white rounded-xl transition-colors shrink-0"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            {/* 피드백 */}
            <AnimatePresence>
              {feedback && (
                <motion.p
                  key="fb"
                  className="text-xs text-gray-500 pb-2 text-center"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {feedback}
                </motion.p>
              )}
            </AnimatePresence>

            {/* 힌트 */}
            {!feedback && (
              <p className="text-[11px] text-gray-300 pb-2 text-center">
                자연어로 입력하면 AI가 날짜와 시간을 자동 파싱합니다 · Enter로 전송
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SmartInputBar;
