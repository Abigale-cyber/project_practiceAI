import { Outlet, Link, useLocation } from 'react-router';
import { MessageSquare, BookOpen, History, Home } from 'lucide-react';

export default function StudentLayout() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '学习看板', icon: Home },
    { path: '/chat', label: '智能导师', icon: MessageSquare },
    { path: '/practice', label: '闯关刷题', icon: BookOpen },
    { path: '/history', label: '战绩回顾', icon: History },
  ];

  return (
    <div className="size-full flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-gray-200 flex-col shadow-sm sticky top-0 h-screen flex-shrink-0">
        <div className="p-6 border-b border-gray-200">
          <h1 className="font-semibold text-lg">AI 演练工具</h1>
          <p className="text-sm text-gray-500 mt-1">学员端</p>
        </div>
        <nav className="flex-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${isActive
                  ? 'text-[#00B894] bg-[#00B894]/10'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Icon className="size-5" />
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <Link
            to="/admin"
            className="block text-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            管理端入口
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${isActive ? 'text-[#00B894]' : 'text-gray-500'
                  }`}
              >
                <Icon className="size-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}