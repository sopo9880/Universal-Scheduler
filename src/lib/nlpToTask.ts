import type { NLPResult, Task } from '../types/index.d';

const pad = (n: number) => String(n).padStart(2, '0');

// YYYY-MM-DD 포맷
const toYMD = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ── targetDate → YYYY-MM-DD ───────────────────────────────────
const resolveDate = (targetDate: string): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (targetDate === '오늘') return toYMD(today);

  if (targetDate === '내일') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return toYMD(d);
  }

  if (targetDate === '모레') {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return toYMD(d);
  }

  // YYYY-MM-DD 형식이면 그대로 사용
  if (/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return targetDate;

  // 그 외 폴백: 오늘
  return toYMD(today);
};

// ── 한국어 시간 → HH:mm ───────────────────────────────────────
// 지원 패턴: "오전/오후 H시", "오전/오후 H시 M분", "H시", "H시 M분", "H:MM"
export const parseKoreanTime = (timeStr: string): string | undefined => {
  if (!timeStr || timeStr === '시간 미정') return undefined;

  // "오전/오후 H시 M분" or "오전/오후 H시"
  const meridianMatch = timeStr.match(/([오전오후]{2})\s*(\d{1,2})시\s*(?:(\d{1,2})분)?/);
  if (meridianMatch) {
    let hour = Number(meridianMatch[2]);
    const min = Number(meridianMatch[3] ?? 0);
    const isPM = meridianMatch[1] === '오후';
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
    return `${pad(hour)}:${pad(min)}`;
  }

  // "H시 M분" or "H시"
  const simpleMatch = timeStr.match(/(\d{1,2})시\s*(?:(\d{1,2})분)?/);
  if (simpleMatch) {
    const hour = Number(simpleMatch[1]);
    const min = Number(simpleMatch[2] ?? 0);
    return `${pad(hour)}:${pad(min)}`;
  }

  // "HH:MM" 형식 그대로
  const colonMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    return `${pad(Number(colonMatch[1]))}:${colonMatch[2]}`;
  }

  return undefined;
};

// ── NLPResult → Task ─────────────────────────────────────────
export const nlpToTask = (nlp: NLPResult): Task => {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    title: nlp.title,
    scope: 'DAY',                    // 자연어 입력은 항상 일 단위
    target_period: resolveDate(nlp.targetDate),
    status: 'TODO',
    start_time: parseKoreanTime(nlp.timeStr),
    created_at: now,
    updated_at: now,
    is_deleted: false,
  };
};
