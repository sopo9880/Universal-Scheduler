import type { NLPResult } from '../types/index.d';

const GEMINI_MODEL = 'gemini-2.5-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const LS_API_KEY = 'gemini_api_key';

const getApiKey = (): string => {
  // 1순위: localStorage (Settings 페이지에서 저장한 키)
  const lsKey = localStorage.getItem(LS_API_KEY);
  if (lsKey && lsKey.trim()) return lsKey.trim();
  // 2순위: 환경변수
  const envKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (envKey && envKey.trim()) return envKey.trim();
  throw new Error('Gemini API Key가 설정되지 않았습니다. Settings에서 입력해 주세요.');
};

export const LS_GEMINI_KEY = LS_API_KEY;

// ── 공통 fetch 헬퍼 ──────────────────────────────────────────
async function callGemini<T>(
  systemInstruction: string,
  userText: string,
  responseSchema: object
): Promise<T> {
  const key = getApiKey();
  const url = `${BASE_URL}/${GEMINI_MODEL}:generateContent?key=${key}`;

  const body = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userText }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API 오류 (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const raw: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return JSON.parse(raw) as T;
}

// ── 4.1 스마트 파싱 ───────────────────────────────────────────
const PARSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: {
      type: 'STRING',
      description: '시간/날짜를 제외한 핵심 할 일',
    },
    targetDate: {
      type: 'STRING',
      description: "'오늘', '내일', '모레' 중 하나로 출력",
    },
    timeStr: {
      type: 'STRING',
      description: "예: '오후 3시 30분', 명시되지 않았다면 '시간 미정'",
    },
  },
  required: ['title', 'targetDate', 'timeStr'],
};

export async function parseNaturalLanguage(input: string): Promise<NLPResult> {
  const today = new Date().toLocaleDateString('ko-KR');
  const system = `오늘 날짜는 ${today} 입니다.\n사용자의 일상적인 텍스트 입력을 분석하여 스케줄러에 등록할 수 있도록 핵심 제목, 목표 날짜, 시간을 추출하세요.`;
  return callGemini<NLPResult>(system, input, PARSE_SCHEMA);
}

// ── 4.2 WBS (작업 쪼개기) ────────────────────────────────────
const WBS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    subtasks: {
      type: 'ARRAY',
      items: {
        type: 'STRING',
        description: '하위 작업 제목',
      },
    },
  },
  required: ['subtasks'],
};

export async function generateSubtasks(
  parentTaskTitle: string
): Promise<string[]> {
  const system = `사용자가 입력한 '${parentTaskTitle}' 작업을 완료하기 위해 필요한 구체적인 하위 작업들을 3~5개 생성하세요.`;
  const result = await callGemini<{ subtasks: string[] }>(
    system,
    parentTaskTitle,
    WBS_SCHEMA
  );
  return result.subtasks ?? [];
}
