import { useState, useEffect } from 'react';
import { Trash2, Save } from 'lucide-react';
import BottomSheet from '../shared/BottomSheet';
import { useAppStore } from '../../store/useAppStore';
const TaskDetailPanel = () => {
  const tasks = useAppStore((s) => s.tasks);
  const categories = useAppStore((s) => s.categories);
  const detailTaskId = useAppStore((s) => s.detailTaskId);
  const closeDetail = useAppStore((s) => s.closeDetail);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  const task = detailTaskId ? tasks.find((t) => t.id === detailTaskId) ?? null : null;
  const isOpen = !!detailTaskId;

  // 폼 상태
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // task 변경 시 폼 초기화
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setStartTime(task.start_time ?? '');
      setEndTime(task.end_time ?? '');
      setCategoryId(task.category_id ?? '');
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;
    await updateTask(task.id, {
      title: title.trim() || task.title,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      category_id: categoryId.trim() || undefined,
    });
    closeDetail();
  };

  const handleDelete = async () => {
    if (!task) return;
    await deleteTask(task.id);
    closeDetail();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={closeDetail} title="할 일 상세 · 수정">
      {task && (
        <div className="flex flex-col gap-4">
          {/* 제목 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="할 일 제목"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>

          {/* 시작 / 종료 시간 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                시작 시간
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                종료 시간
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              카테고리
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-400 transition
                         bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">카테고리 없음</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* 상태 정보 (읽기 전용) */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span
              className={`px-2 py-0.5 rounded-full font-medium ${
                task.status === 'DONE'
                  ? 'bg-green-50 text-green-600'
                  : task.status === 'IN_PROGRESS'
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {task.status === 'DONE' ? '완료' : task.status === 'IN_PROGRESS' ? '진행중' : '할 일'}
            </span>
            <span>범위: {task.scope}</span>
            <span>·</span>
            <span>{task.target_period}</span>
          </div>

          {/* 버튼 영역 */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2
                         py-2.5 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700
                         text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Save size={15} />
              저장
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center justify-center gap-2
                         px-5 py-2.5 bg-red-50 hover:bg-red-100 active:bg-red-200
                         text-red-500 rounded-xl text-sm font-semibold transition-colors"
            >
              <Trash2 size={15} />
              삭제
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};

export default TaskDetailPanel;
