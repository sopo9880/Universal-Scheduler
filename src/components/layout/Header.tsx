import { Bell } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const TAB_TITLES: Record<string, string> = {
  home: '홈',
  calendar: '캘린더',
  timetable: '타임테이블',
  settings: '설정',
};

const Header = () => {
  const activeTab = useAppStore((s) => s.activeTab);

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 h-14 flex items-center justify-between px-5 md:left-56">
      <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        {TAB_TITLES[activeTab] ?? '스케줄러'}
      </h1>
      <button
        aria-label="알림"
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
      >
        <Bell size={20} />
      </button>
    </header>
  );
};

export default Header;
