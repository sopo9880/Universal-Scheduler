import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import SmartInputBar from '../shared/SmartInputBar';

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 데스크톱: 좌측 Sidebar (md 이상에서만 표시) */}
      <Sidebar />

      {/* 콘텐츠 영역 — md 이상에서 사이드바 너비만큼 왼쪽 여백 */}
      <div className="flex flex-col flex-1 md:ml-56">
        <Header />
        {/* pt-14: 헤더 / pb-16: 모바일 바텀 네비 / md:pb-0: 데스크톱은 불필요 */}
        <main className="flex-1 pt-14 pb-16 md:pb-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* 모바일: 하단 BottomNav (md 이상에서는 숨김) */}
      <div className="md:hidden">
        <BottomNav />
      </div>

      <SmartInputBar />
    </div>
  );
};

export default AppLayout;
