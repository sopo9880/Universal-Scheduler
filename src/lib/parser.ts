/**
 * src/lib/parser.ts
 *
 * 정규표현식 기반 Rule-based 파서 — Gemini API 오프라인/실패 시 폴백으로 사용.
 * 한국어 + 영어 날짜/시간 패턴을 지원합니다.
 */
import type { NLPResult } from '../types/index.d';

const pad = (n: number) => String(n).padStart(2, '0');

const toYMD = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ── 날짜 파싱 ─────────────────────────────────────────────────

/**
 * 입력 텍스트에서 날짜 표현을 추출하여 YYYY-MM-DD 또는 '오늘'|'내일'|'모레'로 반환.
 * 매칭 실패 시 '오늘' 반환.
 */
const parseDate = (text: string): string => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 오늘 / 내일 / 모레
  if (/오늘/.test(text)) return '오늘';
  if (/내일/.test(text)) return '내일';
  if (/모레/.test(text)) return '모레';

  // 이번 주 요일: "이번 월|화|수|목|금|토|일요일"
  const thisWeekMatch = text.match(/이번\s*([월화수목금토일])요일/);
  if (thisWeekMatch) {
    const DAY_MAP: Record<string, number> = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6, 일: 0 };
    const target = DAY_MAP[thisWeekMatch[1]];
    const d = new Date(now);
    const diff = (target - now.getDay() + 7) % 7 || 7; // 같은 요일이면 다음 주
    d.setDate(now.getDate() + diff);
    return toYMD(d);
  }

  // 다음 주 요일
  const nextWeekMatch = text.match(/다음\s*주?\s*([월화수목금토일])요일/);
  if (nextWeekMatch) {
    const DAY_MAP: Record<string, number> = { 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6, 일: 0 };
    const target = DAY_MAP[nextWeekMatch[1]];
    const d = new Date(now);
    const diff = (target - now.getDay() + 7) % 7 + 7;
    d.setDate(now.getDate() + diff);
    return toYMD(d);
  }

  // "M월 D일" 또는 "M/D"
  const mdMatch = text.match(/(\d{1,2})[월\/][\s]?(\d{1,2})일?/);
  if (mdMatch) {
    const month = Number(mdMatch[1]) - 1;
    const day = Number(mdMatch[2]);
    const d = new Date(now.getFullYear(), month, day);
    // 이미 지난 날짜면 내년으로
    if (d < now) d.setFullYear(d.getFullYear() + 1);
    return toYMD(d);
  }

  // "YYYY-MM-DD" 또는 "YYYY/MM/DD"
  const isoMatch = text.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${pad(Number(isoMatch[2]))}-${pad(Number(isoMatch[3]))}`;
  }

  // N일 후
  const daysLaterMatch = text.match(/(\d+)\s*일\s*후/);
  if (daysLaterMatch) {
    const d = new Date(now);
    d.setDate(now.getDate() + Number(daysLaterMatch[1]));
    return toYMD(d);
  }

  return '오늘';
};

// ── 시간 파싱 ─────────────────────────────────────────────────

/**
 * 입력 텍스트에서 시간 표현을 추출하여 "오전/오후 H시 M분" 형태 또는 "시간 미정" 반환.
 */
const parseTime = (text: string): string => {
  // "오전/오후 H시 M분" → 그대로 추출
  const meridianFull = text.match(/([오전오후]{2})\s*(\d{1,2})시\s*(\d{1,2})분/);
  if (meridianFull) return `${meridianFull[1]} ${meridianFull[2]}시 ${meridianFull[3]}분`;

  // "오전/오후 H시"
  const meridianHour = text.match(/([오전오후]{2})\s*(\d{1,2})시/);
  if (meridianHour) return `${meridianHour[1]} ${meridianHour[2]}시`;

  // "H시 M분"
  const hourMin = text.match(/(\d{1,2})시\s*(\d{1,2})분/);
  if (hourMin) return `${hourMin[1]}시 ${hourMin[2]}분`;

  // "H시"
  const hourOnly = text.match(/(\d{1,2})시/);
  if (hourOnly) return `${hourOnly[1]}시`;

  // "HH:MM"
  const colonTime = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (colonTime) return `${colonTime[1]}:${colonTime[2]}`;

  return '시간 미정';
};

// ── 제목 추출 ─────────────────────────────────────────────────

/**
 * 날짜/시간 표현을 제거한 핵심 제목을 반환.
 */
const extractTitle = (text: string): string => {
  let title = text
    // 날짜 표현 제거
    .replace(/((오늘|내일|모레|이번\s*[월화수목금토일]요일|다음\s*주?\s*[월화수목금토일]요일|\d+\s*일\s*후|\d{1,2}[월\/]\s*\d{1,2}일?|\d{4}[-\/]\d{1,2}[-\/]\d{1,2}))/g, '')
    // 시간 표현 제거
    .replace(/(오전|오후)\s*\d{1,2}시(\s*\d{1,2}분)?/g, '')
    .replace(/\d{1,2}시(\s*\d{1,2}분)?/g, '')
    .replace(/\d{1,2}:\d{2}/g, '')
    // 조사/접속사 정리
    .replace(/[에에는에다에서까지]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return title || text.trim();
};

// ── 메인 파서 ─────────────────────────────────────────────────

/**
 * 자연어 텍스트를 NLPResult로 변환하는 Rule-based 파서.
 * Gemini API 실패 시 폴백으로 사용됩니다.
 */
export const parseWithRules = (text: string): NLPResult => {
  return {
    title: extractTitle(text),
    targetDate: parseDate(text),
    timeStr: parseTime(text),
  };
};
