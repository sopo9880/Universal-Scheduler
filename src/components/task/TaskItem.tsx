import { useState } from 'react';
import { Circle, CheckCircle2, Clock, Sparkles, Loader2, ChevronDown, Pencil } from 'lucide-react';
import type { Task } from '../../types/index.d';
import { useAppStore } from '../../store/useAppStore';
import { generateSubtasks } from '../../services/gemini.service';

interface TaskItemProps {
  task: Task;
}

const TaskItem = ({ task }: TaskItemProps) => {
  const updateTask = useAppStore((s) => s.updateTask);
  const addTask = useAppStore((s) => s.addTask);
  const tasks = useAppStore((s) => s.tasks);
  const openDetail = useAppStore((s) => s.openDetail);

  const [wbsLoading, setWbsLoading] = useState(false);
  const [wbsError, setWbsError] = useState<string | null>(null);

  const isDone = task.status === 'DONE';
  const isSubTask = !!task.parent_task_id;

  // 이미 생성된 하위 작업 여부
  const hasChildren = tasks.some(
    (t) => !t.is_deleted && t.parent_task_id === task.id
  );

  const toggleStatus = () => {
    const next = task.status === 'DONE' ? 'TODO' : 'DONE';
    updateTask(task.id, { status: next });
  };

  const handleWbs = async () => {
    if (wbsLoading) return;
    setWbsLoading(true);
    setWbsError(null);
    try {
      const titles = await generateSubtasks(task.title);
      const now = Date.now();
      titles.forEach((title) => {
        addTask({
          id: crypto.randomUUID(),
          title,
          scope: task.scope,
          target_period: task.target_period,
          status: 'TODO',
          parent_task_id: task.id,
          created_at: now,
          updated_at: now,
          is_deleted: false,
        });
      });
    } catch {
      setWbsError('AI 연결 실패');
    } finally {
      setWbsLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 transition-opacity ${
        isDone ? 'opacity-60' : 'opacity-100'
      } ${isSubTask ? 'ml-6 border-l-2 border-l-indigo-200' : ''}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 체크박스 */}
        <button
          onClick={toggleStatus}
          aria-label={isDone ? '완료 취소' : '완료'}
          className="shrink-0 text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          {isDone ? <CheckCircle2 size={22} /> : <Circle size={22} className="text-gray-300" />}
        </button>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium truncate ${
              isDone ? 'line-through text-gray-400' : 'text-gray-800'
            }`}
          >
            {task.title}
          </p>
          {task.start_time && (
            <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <Clock size={11} />
              {task.start_time}
              {task.end_time ? ` – ${task.end_time}` : ''}
            </p>
          )}
        </div>

        {/* 진행 중 뱃지 */}
        {task.status === 'IN_PROGRESS' && (
          <span className="shrink-0 text-[10px] font-semibold bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
            진행중
          </span>
        )}

        {/* 상세/수정 버튼 */}
        <button
          onClick={() => openDetail(task.id)}
          aria-label="상세 보기 및 수정"
          title="상세 보기 및 수정"
          className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <Pencil size={13} />
        </button>

        {/* AI 작업 쪼개기 버튼 — 최상위 Task에만 표시 */}
        {!isSubTask && (
          <button
            onClick={handleWbs}
            disabled={wbsLoading || hasChildren}
            aria-label="AI로 작업 쪼개기"
            title={hasChildren ? '이미 하위 작업이 있습니다' : 'AI로 작업 쪼개기'}
            className={`shrink-0 flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors
              ${hasChildren
                ? 'text-gray-300 cursor-default'
                : 'text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
          >
            {wbsLoading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : hasChildren ? (
              <ChevronDown size={13} />
            ) : (
              <Sparkles size={13} />
            )}
            {!hasChildren && !wbsLoading && <span>쪼개기</span>}
          </button>
        )}
      </div>

      {/* WBS 에러 메시지 */}
      {wbsError && (
        <p className="text-[11px] text-red-400 px-4 pb-2">{wbsError}</p>
      )}
    </div>
  );
};

export default TaskItem;
