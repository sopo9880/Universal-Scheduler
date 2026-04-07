import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import BottomSheet from '../components/shared/BottomSheet';
import TaskItem from '../components/task/TaskItem';
import type { Task, TaskScope } from '../types/index.d';

// ── 날짜 유틸 ─────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');

const toYMD = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토', '일'];
const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

// ── 뷰 타입 ───────────────────────────────────────────────────
type CalView = 'YEAR' | 'MONTH' | 'WEEK' | 'DAY';

const VIEW_LABELS: { id: CalView; label: string }[] = [
  { id: 'YEAR', label: '연' },
  { id: 'MONTH', label: '월' },
  { id: 'WEEK', label: '주' },
  { id: 'DAY', label: '일' },
];

// ── 공통: BottomSheet Task 목록 ────────────────────────────────
const SheetTaskList = ({
  tasks,
  period,
  scope,
}: {
  tasks: Task[];
  period: string;
  scope: TaskScope;
}) => {
  const list = tasks.filter(
    (t) => !t.is_deleted && t.scope === scope && t.target_period === period
  );
  if (list.length === 0)
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        이 기간에 등록된 Task가 없습니다
      </p>
    );
  return (
    <div className="flex flex-col gap-2">
      {list.map((t) => (
        <TaskItem key={t.id} task={t} />
      ))}
    </div>
  );
};

// ── YEAR 뷰 ───────────────────────────────────────────────────
const YearView = ({
  year,
  tasks,
  onSelectMonth,
}: {
  year: number;
  tasks: Task[];
  onSelectMonth: (ym: string) => void;
}) => {
  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {Array.from({ length: 12 }, (_, i) => {
        const ym = `${year}-${pad(i + 1)}`;
        const count = tasks.filter(
          (t) => !t.is_deleted && t.scope === 'MONTH' && t.target_period === ym
        ).length;
        const done = tasks.filter(
          (t) =>
            !t.is_deleted &&
            t.scope === 'MONTH' &&
            t.target_period === ym &&
            t.status === 'DONE'
        ).length;
        const pct = count === 0 ? 0 : Math.round((done / count) * 100);
        const isCurrentMonth =
          new Date().getFullYear() === year && new Date().getMonth() === i;
        return (
          <button
            key={i}
            onClick={() => onSelectMonth(ym)}
            className={`flex flex-col items-center p-3 rounded-xl border transition-colors
              ${isCurrentMonth
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
              }`}
          >
            <span
              className={`text-sm font-semibold ${
                isCurrentMonth ? 'text-indigo-600' : 'text-gray-700'
              }`}
            >
              {MONTHS[i]}
            </span>
            {count > 0 && (
              <>
                <div className="w-full mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1">
                  {done}/{count}
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
};

// ── MONTH 뷰 ─────────────────────────────────────────────────
const MonthView = ({
  year,
  month,
  tasks,
  onSelectDay,
}: {
  year: number;
  month: number; // 0-indexed
  tasks: Task[];
  onSelectDay: (ymd: string) => void;
}) => {
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // 월요일 시작
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toYMD(new Date());

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // 6행 맞추기
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="px-4">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-2 ${
              i === 5 ? 'text-blue-400' : i === 6 ? 'text-red-400' : 'text-gray-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>
      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (day === null)
            return <div key={`e-${idx}`} />;
          const ymd = `${year}-${pad(month + 1)}-${pad(day)}`;
          const dayTasks = tasks.filter(
            (t) => !t.is_deleted && t.scope === 'DAY' && t.target_period === ymd
          );
          const isToday = ymd === todayStr;
          const col = idx % 7;
          return (
            <button
              key={ymd}
              onClick={() => onSelectDay(ymd)}
              className="flex flex-col items-center py-1 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <span
                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium
                  ${isToday
                    ? 'bg-indigo-600 text-white'
                    : col === 5
                    ? 'text-blue-500'
                    : col === 6
                    ? 'text-red-500'
                    : 'text-gray-700'
                  }`}
              >
                {day}
              </span>
              {/* Task 점 표시 (최대 3개) */}
              <div className="flex gap-0.5 mt-0.5 min-h-[6px]">
                {dayTasks.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    className={`w-1 h-1 rounded-full ${
                      t.status === 'DONE' ? 'bg-gray-300' : 'bg-indigo-400'
                    }`}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── WEEK 뷰 ───────────────────────────────────────────────────
const WeekView = ({
  mondayDate,
  tasks,
  onSelectDay,
}: {
  mondayDate: Date;
  tasks: Task[];
  onSelectDay: (ymd: string) => void;
}) => {
  const todayStr = toYMD(new Date());

  return (
    <div className="px-4">
      <div className="grid grid-cols-7 gap-1">
        {WEEK_DAYS.map((label, i) => {
          const d = new Date(mondayDate);
          d.setDate(mondayDate.getDate() + i);
          const ymd = toYMD(d);
          const dayTasks = tasks.filter(
            (t) => !t.is_deleted && t.scope === 'DAY' && t.target_period === ymd
          );
          const isToday = ymd === todayStr;
          return (
            <button
              key={ymd}
              onClick={() => onSelectDay(ymd)}
              className="flex flex-col items-center gap-1 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              <span
                className={`text-[11px] font-medium ${
                  i === 5 ? 'text-blue-400' : i === 6 ? 'text-red-400' : 'text-gray-400'
                }`}
              >
                {label}
              </span>
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors
                  ${isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'}`}
              >
                {d.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 w-full px-1">
                {dayTasks.slice(0, 2).map((t) => (
                  <div
                    key={t.id}
                    className={`w-full h-1 rounded-full ${
                      t.status === 'DONE' ? 'bg-gray-200' : 'bg-indigo-300'
                    }`}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* 주간 Task 목록 전체 */}
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date(mondayDate);
          d.setDate(mondayDate.getDate() + i);
          const ymd = toYMD(d);
          const dayTasks = tasks.filter(
            (t) => !t.is_deleted && t.scope === 'DAY' && t.target_period === ymd
          );
          if (dayTasks.length === 0) return null;
          return (
            <div key={ymd}>
              <p className="text-xs text-gray-400 font-medium mb-1 ml-1">
                {d.getMonth() + 1}/{d.getDate()} ({WEEK_DAYS[i]})
              </p>
              <div className="flex flex-col gap-1.5">
                {dayTasks.map((t) => (
                  <TaskItem key={t.id} task={t} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── DAY 뷰 ────────────────────────────────────────────────────
const DayView = ({
  dateStr,
  tasks,
}: {
  dateStr: string;
  tasks: Task[];
}) => {
  const dayTasks = tasks
    .filter((t) => !t.is_deleted && t.scope === 'DAY' && t.target_period === dateStr)
    .sort((a, b) => {
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
      if (a.start_time) return -1;
      if (b.start_time) return 1;
      return a.created_at - b.created_at;
    });

  if (dayTasks.length === 0)
    return (
      <p className="text-sm text-gray-400 text-center py-10">
        이 날의 Task가 없습니다
      </p>
    );

  return (
    <div className="px-4 flex flex-col gap-2">
      {dayTasks.map((t) => (
        <TaskItem key={t.id} task={t} />
      ))}
    </div>
  );
};

// ── Calendar 페이지 ────────────────────────────────────────────
const Calendar = () => {
  const tasks = useAppStore((s) => s.tasks);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);

  const [view, setView] = useState<CalView>('MONTH');

  // 각 뷰의 "현재 커서"
  const [cursorYear, setCursorYear] = useState(new Date().getFullYear());
  const [cursorMonth, setCursorMonth] = useState(new Date().getMonth()); // 0-indexed
  const [cursorMonday, setCursorMonday] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [cursorDay, setCursorDay] = useState(toYMD(new Date()));

  // BottomSheet 상태
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDate, setSheetDate] = useState('');
  const [sheetScope, setSheetScope] = useState<TaskScope>('DAY');

  const openSheet = useCallback((period: string, scope: TaskScope) => {
    setSheetDate(period);
    setSheetScope(scope);
    setSelectedDate(scope === 'DAY' ? period : selectedDate);
    setSheetOpen(true);
  }, [selectedDate, setSelectedDate]);

  // ── 헤더 타이틀 & 네비 ─────────────────────────────────────
  const navTitle = (() => {
    if (view === 'YEAR') return `${cursorYear}년`;
    if (view === 'MONTH') return `${cursorYear}년 ${cursorMonth + 1}월`;
    if (view === 'WEEK') {
      const end = new Date(cursorMonday);
      end.setDate(cursorMonday.getDate() + 6);
      return `${cursorMonday.getMonth() + 1}/${cursorMonday.getDate()} – ${end.getMonth() + 1}/${end.getDate()}`;
    }
    return cursorDay.replace(/-/g, '.');
  })();

  const prev = () => {
    if (view === 'YEAR') setCursorYear((y) => y - 1);
    if (view === 'MONTH') {
      if (cursorMonth === 0) { setCursorYear((y) => y - 1); setCursorMonth(11); }
      else setCursorMonth((m) => m - 1);
    }
    if (view === 'WEEK') {
      const d = new Date(cursorMonday);
      d.setDate(d.getDate() - 7);
      setCursorMonday(d);
    }
    if (view === 'DAY') {
      const d = new Date(cursorDay);
      d.setDate(d.getDate() - 1);
      setCursorDay(toYMD(d));
    }
  };

  const next = () => {
    if (view === 'YEAR') setCursorYear((y) => y + 1);
    if (view === 'MONTH') {
      if (cursorMonth === 11) { setCursorYear((y) => y + 1); setCursorMonth(0); }
      else setCursorMonth((m) => m + 1);
    }
    if (view === 'WEEK') {
      const d = new Date(cursorMonday);
      d.setDate(d.getDate() + 7);
      setCursorMonday(d);
    }
    if (view === 'DAY') {
      const d = new Date(cursorDay);
      d.setDate(d.getDate() + 1);
      setCursorDay(toYMD(d));
    }
  };

  const goToday = () => {
    const now = new Date();
    setCursorYear(now.getFullYear());
    setCursorMonth(now.getMonth());
    const mon = new Date(now);
    mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    mon.setHours(0, 0, 0, 0);
    setCursorMonday(mon);
    setCursorDay(toYMD(now));
  };

  // 월 클릭 → MONTH 뷰로 드릴다운
  const handleSelectMonth = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    setCursorYear(y);
    setCursorMonth(m - 1);
    setView('MONTH');
  };

  // BottomSheet 타이틀
  const sheetTitle = (() => {
    if (sheetScope === 'DAY') {
      const [y, m, d] = sheetDate.split('-');
      return `${y}년 ${Number(m)}월 ${Number(d)}일`;
    }
    if (sheetScope === 'MONTH') {
      const [y, m] = sheetDate.split('-');
      return `${y}년 ${Number(m)}월`;
    }
    return sheetDate;
  })();

  return (
    <div className="flex flex-col h-full">
      {/* ── 뷰 토글 탭 ─────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1 px-4 pt-3 pb-2">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {VIEW_LABELS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors
                ${view === id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 네비게이션 헤더 ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={prev}
          aria-label="이전"
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={goToday}
          className="text-base font-bold text-gray-800 hover:text-indigo-600 transition-colors"
        >
          {navTitle}
        </button>
        <button
          onClick={next}
          aria-label="다음"
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* ── 뷰 콘텐츠 (애니) ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {view === 'YEAR' && (
              <YearView
                year={cursorYear}
                tasks={tasks}
                onSelectMonth={handleSelectMonth}
              />
            )}
            {view === 'MONTH' && (
              <MonthView
                year={cursorYear}
                month={cursorMonth}
                tasks={tasks}
                onSelectDay={(ymd) => openSheet(ymd, 'DAY')}
              />
            )}
            {view === 'WEEK' && (
              <WeekView
                mondayDate={cursorMonday}
                tasks={tasks}
                onSelectDay={(ymd) => {
                  setCursorDay(ymd);
                  openSheet(ymd, 'DAY');
                }}
              />
            )}
            {view === 'DAY' && (
              <DayView dateStr={cursorDay} tasks={tasks} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── BottomSheet ──────────────────────────────────────── */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle}
      >
        <SheetTaskList tasks={tasks} period={sheetDate} scope={sheetScope} />
      </BottomSheet>
    </div>
  );
};

export default Calendar;
