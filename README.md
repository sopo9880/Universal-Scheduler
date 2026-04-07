# Universal Scheduler

자연어 기반 AI 스케줄러 웹 앱 — Google Gemini API를 활용해 텍스트 한 줄로 할 일을 등록합니다.  
오프라인에서도 정규표현식 파서로 동작하며, IndexedDB(RxDB)에 데이터를 영속 저장합니다.

## 기술 스택

| 분류 | 기술 |
|---|---|
| UI | React 18 + TypeScript + Vite |
| 스타일 | Tailwind CSS v3 (모바일 퍼스트, md 반응형) |
| 아이콘 | lucide-react |
| 애니메이션 | framer-motion |
| 상태 관리 | Zustand |
| 로컬 DB | RxDB v17 + Dexie (IndexedDB 어댑터) |
| AI | Google Gemini 2.5 Flash (REST) |
| 라우팅 | React Router v6 |

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (.env 파일에 API Key 입력)
# VITE_GEMINI_API_KEY=your_key_here

# 3. 개발 서버 실행
npm run dev
```

> API Key 없이도 동작합니다. Gemini 파싱 실패 시 오프라인 Rule-based 파서로 자동 폴백됩니다.

## 구현 현황

### ✅ Phase 1 — 프로젝트 세팅 및 상태/DB 구축
- Vite + React + TypeScript + Tailwind CSS v3 환경 구성
- React Router v6 라우트 정의 (Home / Calendar / Timetable / Settings)
- `src/types/index.d.ts` — `Task`, `NLPResult`, `Category` 인터페이스
- Zustand 스토어 — 탭 상태, 선택 날짜, Task CRUD
- **RxDB + Dexie(IndexedDB)** — `src/db/database.ts` tasks / categories 컬렉션 스키마
  - `initDbSync()`: 앱 시작 시 RxDB `$` 옵저버블 구독 → Zustand 자동 동기화
  - 새로고침해도 데이터 영속 보존

### ✅ Phase 2 — 코어 UI 및 레이아웃 (모바일 퍼스트)
- `Header` — 현재 탭 타이틀 + 알림 아이콘
- `BottomNav` — 4탭 네비게이션 (lucide-react 아이콘, 활성 탭 indigo 강조)
- `AppLayout` — Header + `<Outlet>` + BottomNav 중첩 레이아웃
- `TaskItem` — 체크박스(Circle/CheckCircle2), 완료 취소선, 시간 표시(Clock), 진행중 뱃지
- `Home` — 연간 진행률 바(+경과 마커) / 이번 주 요일 그리드 + Task / 오늘 Task 목록(시간순 정렬)

### ✅ Phase 3 — 인터랙션 및 다차원 달력
- `BottomSheet` — framer-motion spring 슬라이드업, 배경 딤 클릭 닫힘, ESC 닫힘, body 스크롤 잠금
- `Calendar` — 연/월/주/일 4-뷰 토글 + 뷰 전환 fade 애니메이션
  - **연 뷰**: 12개월 카드 + Task 달성률 미니 바 → 클릭 시 월 뷰 드릴다운
  - **월 뷰**: 날짜 셀 + Task 점(dot) 표시 → 클릭 시 BottomSheet
  - **주 뷰**: 요일별 Task 바 + 주간 전체 목록 → 날짜 클릭 시 BottomSheet
  - **일 뷰**: 해당 날짜 Task 직접 표시 + 체크박스 조작 가능

### ✅ Phase 4 — AI 스마트 파싱 (NLP 연동)
- `gemini.service.ts` — Gemini 2.5 Flash REST API 연동
  - `parseNaturalLanguage()` — 자연어 → `NLPResult` JSON 파싱
  - `generateSubtasks()` — WBS: 부모 Task 제목으로 하위 작업 3~5개 자동 생성
- `nlpToTask.ts` — `NLPResult` → `Task` 변환 로직
  - 오늘/내일/모레 → `YYYY-MM-DD` 자동 계산
  - 한국어 시간 표현(`오전/오후 H시 M분`) → `HH:mm` 파싱
- `SmartInputBar` — FAB(`+`) 클릭 → spring 슬라이드업 입력창 → Gemini 파싱 → `addTask`
- `TaskItem` — **✨ 쪼개기** 버튼 → Gemini WBS로 하위 Task 자동 생성 (하위 Task는 좌측 인디고 보더 구분)

### ✅ Phase 5 — 데스크톱 반응형 처리 및 오프라인 폴백
- **반응형 레이아웃** (`md` 브레이크포인트 기준)
  - 모바일(`< 768px`): 하단 `BottomNav` 표시
  - 데스크톱(`≥ 768px`): 좌측 고정 `Sidebar`(`w-56`) 표시, 본문 `ml-56` 오프셋
- **`src/lib/parser.ts`** — 정규표현식 Rule-based 오프라인 파서
  - 날짜: 오늘/내일/모레, 이번·다음 주 요일, N일 후, M월D일, YYYY-MM-DD
  - 시간: 오전/오후 H시 M분, H시 M분, HH:MM
  - 제목: 날짜·시간 표현을 제거한 핵심 텍스트 추출
- `SmartInputBar` 폴백 체계: **Gemini API → Rule-based Parser** 순서로 시도

### ✅ Phase 6 — Timetable (Time Blocking) 구현
- `pages/Timetable.tsx` — 0~24시 세로 스크롤 타임라인 그리드
  - **현재 시각 표시선** — 빨간 점·가로선, 1분마다 갱신, 페이지 열릴 때 현재 시각으로 자동 스크롤
  - **시간 블록** — 오늘 날짜 & `start_time` 있는 Task를 시간 비례 `top`/`height`로 렌더링
  - `end_time` 없으면 45분 기본 블록 높이 적용
  - 블록 클릭 → `TaskDetailPanel` 즉시 오픈
- `components/task/TaskDetailPanel.tsx` — BottomSheet 재활용 상세/수정 패널
  - 제목, 시작/종료 시간(`<input type="time">`), 카테고리 셀렉트박스 편집
  - **저장** — `updateTask` → RxDB 패치 → Zustand 즉시 반영
  - **삭제** — `deleteTask` (논리 삭제 `is_deleted: true`)
- `useAppStore` — `detailTaskId` / `openDetail` / `closeDetail` 전역 상태 추가
- `TaskItem` — 연필(Pencil) 버튼 → `openDetail()` 호출 (Home·Calendar 어디서나 동작)

### ✅ Phase 7 — Settings 페이지 구현
- `tailwind.config.js` — `darkMode: 'class'` 추가
- `useAppStore` — `isDarkMode` / `toggleDarkMode`: `localStorage` 영속 저장, `html.dark` 클래스 즉시 토글, 앱 시작 시 자동 복원
- `useAppStore` — `categories[]` RxDB 실시간 미러 추가 (`initDbSync` 구독)
- `gemini.service.ts` — API Key 우선순위: **localStorage (`gemini_api_key`) → `.env`** 순
- `pages/Settings.tsx` — 4개 섹션
  1. **테마 설정** — 라이트/다크 모드 토글 스위치
  2. **AI 설정** — API Key 마스킹 입력(눈 아이콘 토글) + 저장/초기화, Google AI Studio 링크
  3. **카테고리 관리** — RxDB `categories` 컬렉션 실시간 CRUD (컬러 피커 + 이름, 인라인 수정, 삭제)
  4. **데이터 관리** — `window.confirm` 이중 확인 후 전체 Task 논리 삭제 + 카테고리 물리 삭제
- `TaskItem` — `category_id` → categories 색상 조회 → 카드 상단 컬러 바로 렌더
- `TaskDetailPanel` — 카테고리 ID 텍스트 입력을 **셀렉트박스**로 교체 (카테고리 목록 연동)

## 환경 변수

| 변수명 | 설명 |
|---|---|
| `VITE_GEMINI_API_KEY` | Google AI Studio에서 발급한 Gemini API Key (2순위) |

> ⚠️ `.env` 파일은 `.gitignore`에 포함되어 있습니다. API Key를 소스코드에 하드코딩하지 마세요.  
> Settings 페이지에서 입력·저장한 키(`localStorage`)가 환경변수보다 **우선 적용**됩니다.

## 디렉토리 구조

```
src/
├── components/
│   ├── layout/       # AppLayout, Header, BottomNav, Sidebar
│   ├── task/         # TaskItem, TaskDetailPanel
│   └── shared/       # BottomSheet, SmartInputBar
├── db/               # database.ts (RxDB 초기화 + 스키마)
├── lib/              # nlpToTask.ts, parser.ts
├── pages/            # Home, Calendar, Timetable, Settings
├── services/         # gemini.service.ts
├── store/            # useAppStore.ts (Zustand + RxDB 동기화)
├── types/            # index.d.ts
├── App.tsx
└── main.tsx
```
