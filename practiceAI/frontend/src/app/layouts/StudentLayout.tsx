import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { MessageSquare, BookOpen, History, Home, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function StudentLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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
                JD.
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
        <div className={`border-t-4 border-black ${collapsed ? 'p-3' : 'p-6'}`}>
          <Link
            to="/admin"
            title={collapsed ? '教师' : undefined}
            className={`block text-center border-4 border-black py-4 font-black font-mono tracking-widest rounded-xl transition-all hover:-translate-y-1 neo-shadow-sm hover:neo-shadow hover:bg-black hover:text-white ${collapsed ? 'px-2' : 'px-4'}`}
          >
            {collapsed ? '教' : '进入教师端'}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        <Outlet />
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