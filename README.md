# Universal Scheduler

자연어 기반 AI 스케줄러 웹 앱 — Google Gemini API를 활용해 텍스트 한 줄로 할 일을 등록합니다.

## 기술 스택

| 분류 | 기술 |
|---|---|
| UI | React 18 + TypeScript + Vite |
| 스타일 | Tailwind CSS v3 (모바일 퍼스트) |
| 아이콘 | lucide-react |
| 애니메이션 | framer-motion |
| 상태 관리 | Zustand |
| 로컬 DB | RxDB (IndexedDB, Phase 5 예정) |
| AI | Google Gemini 2.5 Flash (REST) |
| 라우팅 | React Router v6 |

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env .env.local
# .env.local 파일에 Gemini API Key 입력
# VITE_GEMINI_API_KEY=your_key_here

# 3. 개발 서버 실행
npm run dev
```

## 구현 현황

### ✅ Phase 1 — 프로젝트 세팅
- Vite + React + TypeScript + Tailwind CSS v3 환경 구성
- React Router v6 라우트 정의 (Home / Calendar / Timetable / Settings)
- `src/types/index.d.ts` — Task, NLPResult, Category 인터페이스
- Zustand 스토어 — 탭 상태, 선택 날짜, Task CRUD

### ✅ Phase 2 — 코어 UI 및 레이아웃 (모바일 퍼스트)
- `Header` — 현재 탭 타이틀 + 알림 아이콘
- `BottomNav` — 4탭 네비게이션 (lucide-react 아이콘, 활성 탭 강조)
- `AppLayout` — Header + Outlet + BottomNav 중첩 레이아웃
- `TaskItem` — 체크박스, 완료 취소선, 시간 표시, 진행중 뱃지
- `Home` — 연간 진행률 바 / 이번 주 요일 그리드 + Task / 오늘 Task 목록

### ✅ Phase 3 — 인터랙션 및 다차원 달력
- `BottomSheet` — framer-motion spring 애니메이션, 배경 딤 클릭 닫힘, ESC 닫힘
- `Calendar` — 연/월/주/일 4-뷰 토글, 뷰 전환 fade 애니메이션
  - 연 뷰: 12개월 카드 + Task 달성률 미니 바
  - 월 뷰: 날짜 셀 + Task 점(dot) 표시 → 클릭 시 BottomSheet
  - 주 뷰: 요일별 Task 바 + 주간 전체 목록
  - 일 뷰: 해당 날짜 Task 직접 표시

### ✅ Phase 4 — AI 스마트 파싱 (NLP 연동)
- `gemini.service.ts` — Gemini 2.5 Flash REST API 연동
  - `parseNaturalLanguage()` — 자연어 → NLPResult (4.1)
  - `generateSubtasks()` — WBS 하위 작업 생성 (4.2)
- `nlpToTask.ts` — NLPResult → Task 변환 로직 (4.3)
  - 오늘/내일/모레 → YYYY-MM-DD 자동 계산
  - 한국어 시간 표현 → HH:mm 파싱
  - API 실패 시 입력 텍스트를 오늘 할 일로 저장하는 폴백
- `SmartInputBar` — FAB(+) 클릭 → 슬라이드업 입력창, 전송 시 Gemini 파싱 후 Task 추가
- `TaskItem` — "✨ 쪼개기" 버튼 → Gemini WBS로 하위 Task 자동 생성

## 환경 변수

| 변수명 | 설명 |
|---|---|
| `VITE_GEMINI_API_KEY` | Google AI Studio에서 발급한 Gemini API Key |

> ⚠️ `.env` 파일은 `.gitignore`에 포함되어 있습니다. 절대 소스코드에 API Key를 하드코딩하지 마세요.

## 디렉토리 구조

```
src/
├── components/
│   ├── layout/       # AppLayout, Header, BottomNav
│   ├── task/         # TaskItem
│   └── shared/       # BottomSheet, SmartInputBar
├── hooks/            # (예정)
├── lib/              # nlpToTask.ts
├── pages/            # Home, Calendar, Timetable, Settings
├── services/         # gemini.service.ts
├── store/            # useAppStore.ts (Zustand)
├── types/            # index.d.ts
├── App.tsx
└── main.tsx
```
