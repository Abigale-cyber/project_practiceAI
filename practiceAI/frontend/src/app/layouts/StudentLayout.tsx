import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { MessageSquare, BookOpen, History, Home, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function StudentLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: '/', label: '学习看板', icon: Home },
    { path: '/chat', label: '智能导师', icon: MessageSquare },
    { path: '/practice', label: '闯关刷题', icon: BookOpen },
    { path: '/history', label: '战绩回顾', icon: History },
  ];

  return (
    <div className="size-full flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex ${collapsed ? 'md:w-16' : 'md:w-48'} bg-white border-r border-gray-200 flex-col shadow-sm sticky top-0 h-screen flex-shrink-0 transition-all duration-200`}>
        <div className={`border-b border-gray-200 flex items-center ${collapsed ? 'p-3 justify-center' : 'p-5 justify-between'}`}>
          {!collapsed && (
            <div>
              <h1 className="font-semibold text-base">AI 演练工具</h1>
              <p className="text-xs text-gray-500 mt-0.5">学员端</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title={collapsed ? '展开菜单' : '收起菜单'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>
        <nav className={`flex-1 ${collapsed ? 'p-2' : 'p-3'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 ${collapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-lg mb-1 transition-colors ${isActive
                  ? 'text-[#00B894] bg-[#00B894]/10'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Icon className="size-5 flex-none" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={`border-t border-gray-200 ${collapsed ? 'p-2' : 'p-3'}`}>
          <Link
            to="/admin"
            title={collapsed ? '教师端入口' : undefined}
            className={`block text-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors ${collapsed ? 'text-xs' : ''}`}
          >
            {collapsed ? '🎓' : '教师端入口'}
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