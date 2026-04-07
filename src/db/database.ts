import {
  createRxDatabase,
  addRxPlugin,
  type RxDatabase,
  type RxCollection,
  type RxJsonSchema,
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import type { Task, Category } from '../types/index.d';

// dev 모드에서만 DevMode 플러그인 활성화
if (import.meta.env.DEV) {
  addRxPlugin(RxDBDevModePlugin);
}

// ── 스키마 정의 ───────────────────────────────────────────────

const taskSchema: RxJsonSchema<Task> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id:             { type: 'string', maxLength: 36 },
    title:          { type: 'string' },
    scope:          { type: 'string', enum: ['YEAR', 'MONTH', 'WEEK', 'DAY'] },
    target_period:  { type: 'string', maxLength: 20 },
    status:         { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
    parent_task_id: { type: 'string' },
    start_time:     { type: 'string' },
    end_time:       { type: 'string' },
    category_id:    { type: 'string' },
    created_at:     { type: 'number' },
    updated_at:     { type: 'number' },
    is_deleted:     { type: 'boolean' },
  },
  required: ['id', 'title', 'scope', 'target_period', 'status', 'created_at', 'updated_at', 'is_deleted'],
  indexes: ['target_period', 'updated_at'],
};

const categorySchema: RxJsonSchema<Category> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id:    { type: 'string', maxLength: 36 },
    name:  { type: 'string' },
    color: { type: 'string' },
  },
  required: ['id', 'name', 'color'],
};

// ── DB 타입 ───────────────────────────────────────────────────

export type TaskCollection = RxCollection<Task>;
export type CategoryCollection = RxCollection<Category>;

export type SchedulerDatabase = RxDatabase<{
  tasks: TaskCollection;
  categories: CategoryCollection;
}>;

// ── 싱글톤 인스턴스 ───────────────────────────────────────────

let db: SchedulerDatabase | null = null;

export const getDatabase = async (): Promise<SchedulerDatabase> => {
  if (db) return db;

  db = await createRxDatabase<{
    tasks: TaskCollection;
    categories: CategoryCollection;
  }>({
    name: 'universal_scheduler_db',
    storage: getRxStorageDexie(),
    ignoreDuplicate: true,
  });

  await db.addCollections({
    tasks: { schema: taskSchema },
    categories: { schema: categorySchema },
  });

  return db;
};
