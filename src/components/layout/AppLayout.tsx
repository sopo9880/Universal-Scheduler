import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import SmartInputBar from '../shared/SmartInputBar';

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      {/* pt-14: 헤더 높이 / pb-16: 바텀 네비 높이 */}
      <main className="flex-1 pt-14 pb-16 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
      <SmartInputBar />
    </div>
  );
};

export default AppLayout;
