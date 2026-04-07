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
