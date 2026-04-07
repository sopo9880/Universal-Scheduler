import { useState, useEffect, useMemo, useRef } from 'react';
import { Clock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

// ── 상수 ──────────────────────────────────────────────────────
const HOUR_HEIGHT = 64;            // 1시간 = 64px
const TOTAL_HEIGHT = HOUR_HEIGHT * 24; // 0~24시 전체 높이 (1536px)
const LEFT_GUTTER = 52;            // 시간 레이블 너비
const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0 ~ 24

// ── 헬퍼 ──────────────────────────────────────────────────────
const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m ?? 0);
};

const nowMinutes = (): number => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

// ── 컴포넌트 ──────────────────────────────────────────────────
const Timetable = () => {
  const tasks = useAppStore((s) => s.tasks);
  const openDetail = useAppStore((s) => s.openDetail);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // ── 현재 시각 (1분마다 갱신) ────────────────────────────────
  const [nowMin, setNowMin] = useState(nowMinutes);
  useEffect(() => {
    const id = setInterval(() => setNowMin(nowMinutes()), 60_000);
    return () => clearInterval(id);
  }, []);

  // ── 현재 시각 줄로 자동 스크롤 (최초 1회) ──────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const scrollTo = Math.max(0, (nowMin / (24 * 60)) * TOTAL_HEIGHT - 200);
    containerRef.current.scrollTop = scrollTo;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 오늘 & start_time 있는 Task만 필터 ─────────────────────
  const timedTasks = useMemo(
    () =>
      tasks.filter(
        (t) => !t.is_deleted && t.target_period === today && !!t.start_time,
      ),
    [tasks, today],
  );

  const nowTop = (nowMin / (24 * 60)) * TOTAL_HEIGHT;

  // ── 블록 색상 (category_id 없으면 기본 인디고) ──────────────
  const blockColor = (isDone: boolean) =>
    isDone
      ? 'bg-gray-100 border-gray-200 text-gray-400'
      : 'bg-indigo-50 border-indigo-200 text-indigo-700';

  return (
    <div className="flex flex-col h-full">
      {/* ── 날짜 헤더 ────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          {new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          })}
        </p>
        <p className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          <Clock size={11} />
          {timedTasks.length > 0
            ? `${timedTasks.length}개의 시간 블록`
            : '오늘 등록된 시간 블록 없음'}
        </p>
      </div>

      {/* ── 타임라인 스크롤 영역 ─────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950"
      >
        {/* 상하 여백 포함 래퍼 */}
        <div className="relative mx-4 my-4" style={{ height: TOTAL_HEIGHT }}>

          {/* ── 시간 눈금 + 가로선 ──────────────────────────── */}
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 flex items-center pointer-events-none"
              style={{ top: h * HOUR_HEIGHT }}
            >
              {/* 레이블 */}
              <span
                className="text-[10px] text-gray-400 dark:text-gray-600 select-none shrink-0 text-right pr-2"
                style={{ width: LEFT_GUTTER }}
              >
                {h < 24 ? `${String(h).padStart(2, '0')}:00` : ''}
              </span>
              {/* 가로선 */}
              <div
                className={`flex-1 ${
                  h % 6 === 0 ? 'h-px bg-gray-300' : 'h-px bg-gray-200'
                }`}
              />
            </div>
          ))}

          {/* ── 블록 렌더 영역 (gutter 오른쪽) ─────────────── */}
          <div
            className="absolute inset-y-0"
            style={{ left: LEFT_GUTTER, right: 0 }}
          >
            {/* ── 현재 시각 표시선 ──────────────────────────── */}
            <div
              className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
              style={{ top: nowTop }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0 shadow-sm" />
              <div className="flex-1 h-0.5 bg-red-500 shadow-sm" />
              {/* 현재 시각 텍스트 */}
              <span className="text-[9px] font-bold text-red-500 ml-1 shrink-0">
                {String(Math.floor(nowMin / 60)).padStart(2, '0')}:
                {String(nowMin % 60).padStart(2, '0')}
              </span>
            </div>

            {/* ── Task 블록들 ─────────────────────────────────── */}
            {timedTasks.map((task) => {
              const startMin = timeToMinutes(task.start_time!);
              const endMin = task.end_time
                ? timeToMinutes(task.end_time)
                : startMin + 45; // end_time 없으면 45분 기본
              const durationMin = Math.max(15, endMin - startMin);

              const top = (startMin / (24 * 60)) * TOTAL_HEIGHT;
              const height = Math.max(28, (durationMin / 60) * HOUR_HEIGHT);
              const isDone = task.status === 'DONE';

              return (
                <button
                  key={task.id}
                  onClick={() => openDetail(task.id)}
                  className={`absolute left-1 right-1 rounded-lg px-2.5 py-1 text-left border
                    shadow-sm hover:shadow-md active:scale-[0.98] transition-all
                    ${blockColor(isDone)} ${isDone ? 'opacity-60' : ''}`}
                  style={{ top, height }}
                >
                  <p className="text-[11px] font-semibold truncate leading-tight">
                    {task.title}
                  </p>
                  {height >= 36 && (
                    <p className="text-[10px] opacity-70 mt-0.5 leading-tight">
                      {task.start_time}
                      {task.end_time ? ` – ${task.end_time}` : ''}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 빈 상태 안내 (타임라인 위에 오버레이) ───────────── */}
      {timedTasks.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-sm text-gray-400 dark:text-gray-500">오늘 등록된 시간 블록이 없어요.</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
            Smart Input Bar에서 시간과 함께 할 일을 추가해 보세요.
          </p>
        </div>
      )}
    </div>
  );
};

export default Timetable;
