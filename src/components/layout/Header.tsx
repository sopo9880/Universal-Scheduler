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
    <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 h-14 flex items-center justify-between px-5">
      <h1 className="text-lg font-bold text-gray-900 tracking-tight">
        {TAB_TITLES[activeTab] ?? '스케줄러'}
      </h1>
      <button
        aria-label="알림"
        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
      >
        <Bell size={20} />
      </button>
    </header>
  );
};

export default Header;
