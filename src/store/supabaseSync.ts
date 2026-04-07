/**
 * RxDB ↔ Supabase 양방향 동기화 (Replication)
 *
 * 전략:
 * - PULL: Supabase tasks 테이블에서 변경(updated_at > 마지막 체크포인트) 가져와 RxDB에 upsert
 * - PUSH: RxDB의 로컬 변경을 Supabase tasks 테이블에 upsert
 *
 * Supabase SQL (Dashboard → SQL Editor에서 실행):
 * ─────────────────────────────────────────────
 * create table if not exists tasks (
 *   id            text primary key,
 *   user_id       uuid references auth.users(id) on delete cascade,
 *   title         text not null,
 *   scope         text not null,
 *   target_period text not null,
 *   status        text not null,
 *   parent_task_id text,
 *   start_time    text,
 *   end_time      text,
 *   category_id   text,
 *   created_at    bigint not null,
 *   updated_at    bigint not null,
 *   is_deleted    boolean not null default false
 * );
 *
 * -- Row Level Security: 본인 데이터만 접근
 * alter table tasks enable row level security;
 * create policy "users_own_tasks" on tasks
 *   using (auth.uid() = user_id)
 *   with check (auth.uid() = user_id);
 * ─────────────────────────────────────────────
 */

import type { SchedulerDatabase } from '../db/database';
import type { Task } from '../types/index.d';
import { supabase } from '../lib/supabase';

// 진행 중인 동기화 인터벌 ID
let _pullIntervalId: ReturnType<typeof setInterval> | null = null;
let _pushSubscription: { unsubscribe: () => void } | null = null;

const PULL_INTERVAL_MS = 15_000; // 15초마다 pull

// ── Pull: Supabase → RxDB ─────────────────────────────────────
const pullFromSupabase = async (db: SchedulerDatabase, userId: string): Promise<void> => {
  try {
    // 로컬 DB에서 가장 최근 updated_at을 체크포인트로 사용
    const localDocs = await db.tasks.find().exec();
    const maxUpdatedAt = localDocs.reduce(
      (max, d) => Math.max(max, (d.toJSON() as Task).updated_at),
      0,
    );

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', maxUpdatedAt)
      .order('updated_at', { ascending: true })
      .limit(200);

    if (error || !data) return;

    for (const row of data) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { user_id: _uid, ...task } = row as Task & { user_id: string };
      await db.tasks.upsert(task as Task);
    }
  } catch (e) {
    console.warn('[Sync] Pull 오류:', e);
  }
};

// ── Push: RxDB → Supabase ─────────────────────────────────────
const startPush = (db: SchedulerDatabase, userId: string): { unsubscribe: () => void } => {
  const sub = db.tasks
    .find()
    .$
    .subscribe(async (docs) => {
      const tasks = docs.map((d) => ({ ...(d.toJSON() as Task), user_id: userId }));
      if (tasks.length === 0) return;
      try {
        const { error } = await supabase.from('tasks').upsert(tasks, {
          onConflict: 'id',
        });
        if (error) console.warn('[Sync] Push 오류:', error.message);
      } catch (e) {
        console.warn('[Sync] Push 예외:', e);
      }
    });

  return sub;
};

// ── 공개 API ─────────────────────────────────────────────────

export const startReplication = (db: SchedulerDatabase, userId: string): void => {
  stopReplication(); // 기존 구독 정리

  // 즉시 1회 pull
  pullFromSupabase(db, userId);

  // 주기적 pull
  _pullIntervalId = setInterval(() => pullFromSupabase(db, userId), PULL_INTERVAL_MS);

  // push 구독
  _pushSubscription = startPush(db, userId);

  console.info('[Sync] Supabase 동기화 시작 — userId:', userId);
};

export const stopReplication = (): void => {
  if (_pullIntervalId !== null) {
    clearInterval(_pullIntervalId);
    _pullIntervalId = null;
  }
  _pushSubscription?.unsubscribe();
  _pushSubscription = null;
  console.info('[Sync] Supabase 동기화 중단');
};
