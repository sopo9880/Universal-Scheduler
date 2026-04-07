# 유니버설 스케줄러 — 기술 명세서 (AI Agent Prompt-Ready)

> **[AI 지침]** 이 문서는 스케줄러 애플리케이션 구현을 위한 핵심 기술 명세서입니다.
> 코드를 생성할 때 반드시 이 문서의 기술 스택, 디렉토리 구조, 데이터 모델(TypeScript 인터페이스), 그리고 단계별 지침(Phases)을 **엄격하게 준수**하십시오.

---

## 1. 기술 스택 (Tech Stack)

| 분류 | 기술 |
|---|---|
| Frontend / UI | React 18, TypeScript, Vite, Tailwind CSS (반응형 모바일 우선 설계) |
| Icons / UI Components | lucide-react, framer-motion (바텀 시트 및 탭 전환 애니메이션용) |
| State Management | Zustand (글로벌 상태 및 UI 상태 관리) |
| Local Database (Offline-First) | RxDB (IndexedDB 어댑터 사용) |
| Cross-platform Packaging | Capacitor (차후 iOS/Android 빌드용, 현재는 웹 뷰 최적화에 집중) |
| AI Integration | Google Gemini API (REST) 및 정규표현식 파서 |
| Routing | React Router v6 |

---

## 2. 디렉토리 구조 (Directory Structure)

```
src/
├── assets/          # 이미지, 아이콘 등 정적 파일
├── components/      # 재사용 가능한 UI 컴포넌트
│   ├── layout/      # BottomNav, Header, Sidebar
│   ├── calendar/    # CalendarView, DateIndicator
│   ├── task/        # TaskItem, TaskList, WbsGenerator
│   └── shared/      # BottomSheet, Modal, FAB
├── hooks/           # 커스텀 훅 (useTasks, useNLP 등)
├── lib/             # 유틸리티 (날짜 계산, 정규식 등)
├── store/           # Zustand 스토어 (useAppStore.ts)
├── db/              # RxDB 스키마 및 초기화 로직 (database.ts)
├── services/        # 외부 API 연동 (gemini.service.ts)
├── pages/           # 라우트별 페이지 컴포넌트 (Home, Calendar, Timetable, Settings)
├── types/           # TypeScript 전역 인터페이스 선언 (index.d.ts)
├── App.tsx          # 메인 라우터 및 글로벌 레이아웃
└── main.tsx         # 진입점 및 DB 초기화
```

---

## 3. 데이터 모델 (TypeScript Interfaces)

> **[AI 지침]** 컴포넌트 및 DB 스키마 생성 시 아래의 인터페이스를 반드시 사용해야 합니다.

```typescript
// types/index.d.ts

export type TaskScope = 'YEAR' | 'MONTH' | 'WEEK' | 'DAY';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface Task {
  id: string;              // UUID
  title: string;           // 할 일 내용
  scope: TaskScope;        // Task의 범위
  target_period: string;   // 형식: YYYY (연), YYYY-MM (월), YYYY-Www (주), YYYY-MM-DD (일)
  status: TaskStatus;      // 진행 상태
  parent_task_id?: string; // 하위 작업일 경우 부모 ID (최대 1단계, 옵션)
  start_time?: string;     // HH:mm 형식 (옵션, Time Blocking용)
  end_time?: string;       // HH:mm 형식 (옵션, Time Blocking용)
  category_id?: string;    // 카테고리 분류 (옵션)
  created_at: number;      // Unix Timestamp (생성 시각, 정렬용)
  updated_at: number;      // Unix Timestamp (LWW 동기화용)
  is_deleted: boolean;     // 논리적 삭제 플래그
}

export interface NLPResult {
  title: string;
  targetDate: '오늘' | '내일' | '모레' | string; // YYYY-MM-DD 폴백
  timeStr: string;
}

export interface Category {
  id: string;    // UUID
  name: string;  // 카테고리 이름
  color: string; // HEX 색상 코드 (예: '#FF5733')
}
```

---

## 4. 핵심 서비스 로직 (Core Services)

### 4.1. Gemini 기반 스마트 파싱 로직

**파일 경로:** `src/services/gemini.service.ts`

자연어를 `Task` 객체로 변환하는 서비스입니다.

> **[보안]** API Key는 `.env` 파일의 `VITE_GEMINI_API_KEY` 환경변수로 관리하고 `.gitignore`에 포함하십시오. 절대 소스코드에 하드코딩하지 마십시오.

**API Endpoint**
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${VITE_GEMINI_API_KEY}
```

**System Prompt**
```
오늘 날짜는 ${new Date().toLocaleDateString()} 입니다.
사용자의 일상적인 텍스트 입력을 분석하여 스케줄러에 등록할 수 있도록 핵심 제목, 목표 날짜, 시간을 추출하세요.
```

**Response Schema (JSON)**
```json
{
  "type": "OBJECT",
  "properties": {
    "title":      { "type": "STRING", "description": "시간/날짜를 제외한 핵심 할 일" },
    "targetDate": { "type": "STRING", "description": "'오늘', '내일', '모레' 중 하나로 출력" },
    "timeStr":    { "type": "STRING", "description": "예: '오후 3시 30분', 명시되지 않았다면 '시간 미정'" }
  },
  "required": ["title", "targetDate", "timeStr"]
}
```

---

### 4.2. WBS (작업 쪼개기) 로직

**파일 경로:** `src/services/gemini.service.ts` (4.1과 동일 파일)

부모 Task의 제목을 받아 하위 Sub-task 제목 문자열 배열을 반환하는 함수입니다. 반환된 각 항목은 `parent_task_id`를 부모의 `id`로 설정하여 `Task`로 저장합니다.

**API Endpoint**
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${VITE_GEMINI_API_KEY}
```

**System Prompt**
```
사용자가 입력한 '${parentTaskTitle}' 작업을 완료하기 위해 필요한 구체적인 하위 작업들을 3~5개 생성하세요.
```

**Response Schema (JSON)**
```json
{
  "type": "OBJECT",
  "properties": {
    "subtasks": {
      "type": "ARRAY",
      "items": { "type": "STRING", "description": "하위 작업 제목" }
    }
  },
  "required": ["subtasks"]
}
```

---

### 4.3. NLPResult → Task 변환 로직

**파일 경로:** `src/lib/nlpToTask.ts`

`gemini.service.ts`에서 반환된 `NLPResult`를 실제 `Task` 객체로 변환합니다.

| NLPResult 필드 | Task 필드 | 변환 규칙 |
|---|---|---|
| `targetDate` = `'오늘'` | `target_period` | `new Date()` → `YYYY-MM-DD` |
| `targetDate` = `'내일'` | `target_period` | `new Date() + 1일` → `YYYY-MM-DD` |
| `targetDate` = `'모레'` | `target_period` | `new Date() + 2일` → `YYYY-MM-DD` |
| `targetDate` = YYYY-MM-DD | `target_period` | 그대로 사용 |
| `timeStr` ≠ `'시간 미정'` | `start_time` | 한국어 시간 → `HH:mm` 파싱 |
| `timeStr` = `'시간 미정'` | `start_time` | `undefined` |
| — | `scope` | `'DAY'` 고정 (자연어 입력은 항상 일 단위) |
| — | `status` | `'TODO'` 고정 |
| — | `id` | `crypto.randomUUID()` |
| — | `created_at` / `updated_at` | `Date.now()` |
| — | `is_deleted` | `false` |

---

## 5. 단계별 구현 지침 (Implementation Phases)

> **[AI 지침]** 사용자가 지시하는 Phase 번호에 맞춰 코드를 구현하십시오.
> 한 번에 모든 것을 구현하지 말고, **각 Phase가 끝날 때마다 작동 여부를 확인**하십시오.

---

### Phase 1 — 프로젝트 세팅 및 상태/DB 구축

- [ ] Vite + React + TS 환경 및 Tailwind 설정
- [ ] React Router v6 설정 (`App.tsx` 라우트 정의 — Home, Calendar, Timetable, Settings)
- [ ] `types/index.d.ts` 에 제공된 인터페이스 작성
- [ ] RxDB 로컬 데이터베이스 초기화 및 `tasks`, `categories` 컬렉션 스키마 생성 (`src/db/database.ts`)
- [ ] Zustand 스토어 세팅 (현재 탭 상태, 선택된 날짜 관리 등)

---

### Phase 2 — 코어 UI 및 레이아웃 구현 (모바일 퍼스트)

- [ ] 글로벌 레이아웃 구현 (상단 `Header`, 하단 `BottomNav`)
- [ ] `pages/Home.tsx` 구현
  - 상단: 연간 진행률
  - 중단: 이번 주 Task
  - 하단: 오늘 Task 리스트
- [ ] `components/task/TaskItem.tsx` 구현 — 체크박스, 제목, 시간 표시, 완료 시 취소선 디자인 적용

---

### Phase 3 — 인터랙션 및 다차원 달력

- [ ] `pages/Calendar.tsx` 구현 — 연/월/주/일 토글 기능 및 달력 그리드 렌더링
- [ ] `components/shared/BottomSheet.tsx` 구현 — 달력에서 특정 날짜 클릭 시 부드럽게 올라오는 하단 팝업 (framer-motion 활용 추천)

---

### Phase 4 — AI 스마트 파싱 (NLP) 연동

- [ ] `src/services/gemini.service.ts` 작성 (Section 4.1 참조)
- [ ] 화면 하단의 FAB(`+` 버튼) 클릭 시 나타나는 텍스트 입력창(Smart Input Bar) 구현
- [ ] 사용자가 텍스트 입력 후 엔터 시, Gemini API를 호출하여 파싱하고 RxDB에 저장하는 흐름 연결
- [ ] `TaskItem`에 "✨ AI로 작업 쪼개기" 버튼 추가 및 하위 작업 생성 기능 연결

---

### Phase 5 — 데스크톱 반응형 처리 및 폴백(Fallback)

- [ ] 화면 너비(`MD` 이상)에 따라 하단 `BottomNav`를 좌측 `Sidebar`로 자동 전환하는 미디어 쿼리(Tailwind) 적용
- [ ] 오프라인 환경을 대비하여 정규표현식 기반의 Rule-based 파서(`src/lib/parser.ts`) 구현 및 API 실패 시 폴백 처리

---

### Phase 6 — Timetable (Time Blocking) 구현

- [ ] `pages/Timetable.tsx` 구현 — `start_time` / `end_time`이 있는 Task를 세로 타임라인 형식으로 렌더링
- [ ] 시간 블록 클릭 시 `BottomSheet`로 Task 상세/수정 패널 표시
- [ ] Smart Input Bar에서 시간이 파싱된 Task (`start_time` 값 존재)는 Timetable 탭에 자동 표시 (4.3 변환 로직 연결)

---

### Phase 7 — Settings 페이지 구현

- [ ] `pages/Settings.tsx` 구현
  - Gemini API Key 입력 필드 (`VITE_GEMINI_API_KEY` 환경변수 또는 `localStorage` 폴백)
  - 다크/라이트 테마 토글 (Tailwind `dark:` 클래스 활용, Zustand 상태로 관리)
  - 카테고리 관리 — `Category` 컬렉션 CRUD (추가 / 이름·색상 수정 / 삭제)
  - 데이터 초기화 버튼 (전체 Task 삭제, 확인 다이얼로그 필수)