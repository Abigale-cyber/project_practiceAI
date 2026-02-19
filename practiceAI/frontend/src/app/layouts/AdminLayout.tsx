import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, Database, Settings, ArrowLeft } from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: '数据总览', icon: LayoutDashboard },
    { path: '/admin/knowledge', label: '知识管理', icon: Database },
    { path: '/admin/settings', label: '题目配置', icon: Settings },
  ];

  return (
    <div className="size-full flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm sticky top-0 h-screen flex-shrink-0">
        <div className="p-6 border-b border-gray-200">
          <h1 className="font-semibold text-lg">AI 演练工具</h1>
          <p className="text-sm text-gray-500 mt-1">教师端</p>
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
                  ? 'text-[#00B894]'
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
            to="/"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="size-4" />
            返回学员端
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}