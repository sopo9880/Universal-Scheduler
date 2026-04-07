import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import TaskItem from '../components/task/TaskItem';
import type { Task } from '../types/index.d';

// ── 날짜 유틸 ──────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');

const getISOWeek = (d: Date): string => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNo =
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  return `${date.getFullYear()}-W${pad(weekNo)}`;
};

const getDayOfWeek = (d: Date) => (d.getDay() + 6) % 7; // 월=0 … 일=6

// ── 연간 진행률 카드 ───────────────────────────────────────────
const YearProgress = ({ tasks }: { tasks: Task[] }) => {
  const year = String(new Date().getFullYear());
  const yearTasks = tasks.filter(
    (t) => !t.is_deleted && t.scope === 'YEAR' && t.target_period === year
  );
  const done = yearTasks.filter((t) => t.status === 'DONE').length;
  const total = yearTasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  // 올해 경과 일수 비율 (진행 바 보조용)
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
  const dayPct = Math.round(
    ((now.getTime() - startOfYear.getTime()) /
      (endOfYear.getTime() - startOfYear.getTime())) *
      100
  );

  return (
    <section className="mx-4 mt-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-xs text-gray-400 font-medium">연간 목표 달성률</p>
          <p className="text-3xl font-bold text-indigo-600 leading-none mt-1">
            {pct}
            <span className="text-base font-semibold text-indigo-400">%</span>
          </p>
        </div>
        <p className="text-xs text-gray-400">
          {done} / {total}개 완료
        </p>
      </div>
      {/* Task 달성 바 */}
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        {/* 올해 경과 마커 */}
        <div
          className="absolute top-0 h-full w-0.5 bg-amber-400 opacity-70"
          style={{ left: `${dayPct}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-300 mt-1 text-right">
        올해 {dayPct}% 경과
      </p>
    </section>
  );
};

// ── 이번 주 Task 섹션 ─────────────────────────────────────────
const WeekSection = ({ tasks }: { tasks: Task[] }) => {
  const thisWeek = getISOWeek(new Date());
  const weekTasks = tasks.filter(
    (t) => !t.is_deleted && t.scope === 'WEEK' && t.target_period === thisWeek
  );

  // 요일 레이블
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - getDayOfWeek(today));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { label: ['월', '화', '수', '목', '금', '토', '일'][i], date: d };
  });
  const todayIdx = getDayOfWeek(today);

  return (
    <section className="mx-4 mt-4">
      <h2 className="text-sm font-semibold text-gray-500 mb-2 px-1">이번 주</h2>
      {/* 요일 바 */}
      <div className="flex justify-between mb-3">
        {days.map(({ label }, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-400">{label}</span>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i === todayIdx
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {days[i].date.getDate()}
            </div>
          </div>
        ))}
      </div>
      {/* 이번 주 Task 목록 */}
      {weekTasks.length === 0 ? (
        <p className="text-xs text-gray-300 text-center py-3">
          이번 주 등록된 목표가 없습니다
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {weekTasks.map((t) => (
            <TaskItem key={t.id} task={t} />
          ))}
        </div>
      )}
    </section>
  );
};

// ── 오늘 Task 섹션 ─────────────────────────────────────────────
const TodaySection = ({ tasks }: { tasks: Task[] }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks
    .filter(
      (t) => !t.is_deleted && t.scope === 'DAY' && t.target_period === todayStr
    )
    .sort((a, b) => {
      if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
      if (a.start_time) return -1;
      if (b.start_time) return 1;
      return a.created_at - b.created_at;
    });

  const done = todayTasks.filter((t) => t.status === 'DONE').length;

  return (
    <section className="mx-4 mt-5 mb-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-sm font-semibold text-gray-500">오늘 할 일</h2>
        <span className="text-xs text-gray-400">
          {done}/{todayTasks.length}
        </span>
      </div>
      {todayTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-300">
          <p className="text-sm">오늘 등록된 할 일이 없어요</p>
          <p className="text-xs mt-1">+ 버튼을 눌러 추가해보세요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {todayTasks.map((t) => (
            <TaskItem key={t.id} task={t} />
          ))}
        </div>
      )}
    </section>
  );
};

// ── Home 페이지 ───────────────────────────────────────────────
const Home = () => {
  const tasks = useAppStore((s) => s.tasks);

  // 목업 데이터 — DB 연동 전 UI 확인용 (빈 상태일 때만 삽입)
  const addTask = useAppStore((s) => s.addTask);
  useMemo(() => {
    if (tasks.length > 0) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisWeek = getISOWeek(new Date());
    const year = String(new Date().getFullYear());
    const seed: Task[] = [
      {
        id: crypto.randomUUID(),
        title: '포트폴리오 완성하기',
        scope: 'YEAR',
        target_period: year,
        status: 'IN_PROGRESS',
        created_at: Date.now(),
        updated_at: Date.now(),
        is_deleted: false,
      },
      {
        id: crypto.randomUUID(),
        title: '운동 루틴 만들기',
        scope: 'YEAR',
        target_period: year,
        status: 'DONE',
        created_at: Date.now(),
        updated_at: Date.now(),
        is_deleted: false,
      },
      {
        id: crypto.randomUUID(),
        title: '주간 계획 세우기',
        scope: 'WEEK',
        target_period: thisWeek,
        status: 'TODO',
        created_at: Date.now(),
        updated_at: Date.now(),
        is_deleted: false,
      },
      {
        id: crypto.randomUUID(),
        title: '스케줄러 UI 완성',
        scope: 'WEEK',
        target_period: thisWeek,
        status: 'IN_PROGRESS',
        created_at: Date.now(),
        updated_at: Date.now(),
        is_deleted: false,
      },
      {
        id: crypto.randomUUID(),
        title: '아침 운동',
        scope: 'DAY',
        target_period: todayStr,
        status: 'DONE',
        start_time: '07:00',
        end_time: '08:00',
        created_at: Date.now(),
        updated_at: Date.now(),
        is_deleted: false,
      },
      {
        id: crypto.randomUUID(),
        title: '프로젝트 PR 리뷰',
        scope: 'DAY',
        target_period: todayStr,
        status: 'TODO',
        start_time: '14:00',
        created_at: Date.now(),
        updated_at: Date.now(),
        is_deleted: false,
      },
      {
        id: crypto.randomUUID(),
        title: '저녁 독서 30분',
        scope: 'DAY',
        target_period: todayStr,
        status: 'TODO',
        created_at: Date.now(),
        updated_at: Date.now(),
        is_deleted: false,
      },
    ];
    seed.forEach(addTask);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pb-4">
      <YearProgress tasks={tasks} />
      <WeekSection tasks={tasks} />
      <TodaySection tasks={tasks} />
    </div>
  );
};

export default Home;
