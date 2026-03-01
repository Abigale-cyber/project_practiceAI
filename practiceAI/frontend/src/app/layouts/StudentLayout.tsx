import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { MessageSquare, BookOpen, History, Home, PanelLeftClose, PanelLeftOpen, LogOut, User } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function StudentLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: '首 页', icon: Home, colors: 'bg-[#FDE047] text-black border-black' },
    { path: '/chat', label: '辅 导', icon: MessageSquare, colors: 'bg-[#2563EB] text-white border-black' },
    { path: '/practice', label: '练 习', icon: BookOpen, colors: 'bg-[#F9A8D4] text-black border-black' },
    { path: '/history', label: '记 录', icon: History, colors: 'bg-black text-white border-black' },
  ];

  return (
    <div className="size-full flex flex-col md:flex-row bg-[#FFFDF5] selection:bg-[#F9A8D4] selection:text-black font-[Space_Grotesk]">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex ${collapsed ? 'md:w-20' : 'md:w-64'} bg-white border-r-4 border-black flex-col sticky top-0 h-screen flex-shrink-0 transition-all duration-300 z-50`}>
        <div className={`border-b-4 border-black flex items-center ${collapsed ? 'p-4 justify-center' : 'p-6 justify-between'}`}>
          {!collapsed && (
            <div>
              <h1 className="text-3xl font-black font-[Syne] tracking-tighter uppercase text-slate-900 leading-none">
                MG. AI
              </h1>
              <p className="text-xs font-bold font-mono tracking-widest text-slate-500 mt-1 uppercase mt-2">学 生 端</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 border-2 border-black rounded-xl hover:bg-[#FDE047] neo-shadow-sm transition-all"
            title={collapsed ? 'EXPAND' : 'COLLAPSE'}
          >
            {collapsed ? <PanelLeftOpen className="size-5" strokeWidth={3} /> : <PanelLeftClose className="size-5" strokeWidth={3} />}
          </button>
        </div>
        <nav className={`flex-1 ${collapsed ? 'p-3' : 'p-6'} space-y-4`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-4 ${collapsed ? 'justify-center p-3' : 'px-4 py-4'} border-4 transition-all duration-200 uppercase font-black font-[Syne] tracking-wide text-lg rounded-2xl group
                  ${isActive
                    ? `${item.colors} neo-shadow translate-y-[-2px]`
                    : 'border-transparent text-slate-500 hover:border-black hover:neo-shadow-sm hover:text-black hover:-translate-y-1'
                  }`}
              >
                <Icon className={`size-6 flex-none ${isActive ? '' : 'group-hover:scale-110'}`} strokeWidth={isActive ? 3 : 2} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info + Logout + Admin Link */}
        <div className={`border-t-4 border-black ${collapsed ? 'p-3 space-y-3' : 'p-6 space-y-4'}`}>
          {/* User Info */}
          {user && !collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 bg-[#FFFDF5] rounded-xl border-2 border-black/20">
              <div className="w-8 h-8 bg-[#2563EB] rounded-full flex items-center justify-center border-2 border-black flex-shrink-0">
                <User className="size-4 text-white" strokeWidth={3} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black truncate">{user.user_name}</p>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{user.role}</p>
              </div>
            </div>
          )}

          {/* Admin */}
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              title={collapsed ? '教师' : undefined}
              className={`block text-center border-4 border-black py-4 font-black font-mono tracking-widest rounded-xl transition-all hover:-translate-y-1 neo-shadow-sm hover:neo-shadow hover:bg-black hover:text-white ${collapsed ? 'px-2' : 'px-4'}`}
            >
              {collapsed ? '教' : '进入教师端'}
            </Link>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={collapsed ? '退出' : undefined}
            className={`w-full flex items-center justify-center gap-2 border-4 border-black py-3 font-black font-mono tracking-widest rounded-xl transition-all hover:-translate-y-1 neo-shadow-sm hover:neo-shadow hover:bg-red-500 hover:text-white hover:border-red-700 text-sm ${collapsed ? 'px-2' : 'px-4'}`}
          >
            <LogOut className="size-4" strokeWidth={3} />
            {!collapsed && '退 出 登 录'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 relative" style={{ height: '100dvh', maxHeight: 'calc(100dvh - env(safe-area-inset-bottom))' }}>
        <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation - Brutalist Style */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black z-50">
        <div className="flex justify-around items-stretch h-16 px-1 gap-1 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all font-black
                  ${isActive
                    ? `${item.colors} border-2 scale-[1.02]`
                    : 'border-2 border-transparent text-slate-400 active:scale-95'
                  }`}
              >
                <Icon className="size-5 mb-0.5" strokeWidth={isActive ? 3 : 2} />
                <span className="text-[10px] tracking-wider leading-tight">{item.label.replace(/ /g, '')}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}