import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Clock3, Settings } from 'lucide-react';
import { useAppStore, type TabName } from '../../store/useAppStore';

const NAV_ITEMS: { tab: TabName; path: string; label: string; icon: React.ReactNode }[] = [
  { tab: 'home',      path: '/home',      label: '홈',        icon: <Home size={20} /> },
  { tab: 'calendar',  path: '/calendar',  label: '캘린더',    icon: <CalendarDays size={20} /> },
  { tab: 'timetable', path: '/timetable', label: '타임',      icon: <Clock3 size={20} /> },
  { tab: 'settings',  path: '/settings',  label: '설정',      icon: <Settings size={20} /> },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const handleNav = (tab: TabName, path: string) => {
    setActiveTab(tab);
    navigate(path);
  };

  return (
    <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700 z-40 pt-6 pb-8 px-3">
      {/* 로고 */}
      <div className="px-3 mb-8">
        <span className="text-xl font-bold text-indigo-600 tracking-tight">
          Universal
        </span>
        <span className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
          Scheduler
        </span>
      </div>

      {/* 네비 메뉴 */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ tab, path, label, icon }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={tab}
              onClick={() => handleNav(tab, path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left w-full
                ${isActive
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100'
                }`}
            >
              <span className={isActive ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}>
                {icon}
              </span>
              {label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
