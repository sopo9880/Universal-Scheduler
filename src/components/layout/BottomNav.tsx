import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Clock3, Settings } from 'lucide-react';
import { useAppStore, type TabName } from '../../store/useAppStore';

const NAV_ITEMS: { tab: TabName; path: string; label: string; icon: React.ReactNode }[] = [
  { tab: 'home', path: '/home', label: '홈', icon: <Home size={22} /> },
  { tab: 'calendar', path: '/calendar', label: '캘린더', icon: <CalendarDays size={22} /> },
  { tab: 'timetable', path: '/timetable', label: '타임', icon: <Clock3 size={22} /> },
  { tab: 'settings', path: '/settings', label: '설정', icon: <Settings size={22} /> },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const handleNav = (tab: TabName, path: string) => {
    setActiveTab(tab);
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 h-16 flex items-center justify-around px-2 safe-area-pb">
      {NAV_ITEMS.map(({ tab, path, label, icon }) => {
        const isActive = location.pathname === path;
        return (
          <button
            key={tab}
            onClick={() => handleNav(tab, path)}
            aria-label={label}
            className={`flex flex-col items-center gap-0.5 w-16 py-1 rounded-xl transition-colors
              ${isActive
                ? 'text-indigo-600'
                : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            {icon}
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
