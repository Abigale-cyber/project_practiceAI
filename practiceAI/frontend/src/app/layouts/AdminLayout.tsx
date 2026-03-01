import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { LayoutDashboard, Database, Settings, ArrowLeft, LogOut, User } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', label: '数 据 总 览', icon: LayoutDashboard, colors: 'bg-[#FDE047] text-black border-black' },
    { path: '/admin/knowledge', label: '知 识 管 理', icon: Database, colors: 'bg-[#F9A8D4] text-black border-black' },
    { path: '/admin/settings', label: '题 目 配 置', icon: Settings, colors: 'bg-[#2563EB] text-white border-black' },
  ];

  return (
    <div className="size-full flex bg-[#FFFDF5] font-[Space_Grotesk] selection:bg-[#F9A8D4] selection:text-black">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r-4 border-black flex flex-col sticky top-0 h-screen flex-shrink-0 z-50">
        <div className="p-6 border-b-4 border-black">
          <h1 className="text-3xl font-black font-[Syne] tracking-tighter uppercase text-slate-900 leading-none">
            MG. AI
          </h1>
          <p className="text-xs font-bold font-mono tracking-widest text-slate-500 mt-2 uppercase">教 师 端</p>
        </div>
        <nav className="flex-1 p-6 space-y-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-4 border-4 transition-all duration-200 uppercase font-black font-[Syne] tracking-wide text-lg rounded-2xl group
                  ${isActive
                    ? `${item.colors} neo-shadow translate-y-[-2px]`
                    : 'border-transparent text-slate-500 hover:border-black hover:neo-shadow-sm hover:text-black hover:-translate-y-1'
                  }`}
              >
                <Icon className={`size-6 flex-none ${isActive ? '' : 'group-hover:scale-110'}`} strokeWidth={isActive ? 3 : 2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-6 border-t-4 border-black space-y-4">
          {/* User Info */}
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 bg-[#FFFDF5] rounded-xl border-2 border-black/20">
              <div className="w-8 h-8 bg-[#2563EB] rounded-full flex items-center justify-center border-2 border-black flex-shrink-0">
                <User className="size-4 text-white" strokeWidth={3} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black truncate">{user.user_name}</p>
                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">管理员</p>
              </div>
            </div>
          )}
          <Link
            to="/"
            className="flex items-center justify-center gap-2 border-4 border-black py-4 font-black font-mono tracking-widest rounded-xl transition-all hover:-translate-y-1 neo-shadow-sm hover:neo-shadow hover:bg-black hover:text-white px-4"
          >
            <ArrowLeft className="size-5" strokeWidth={3} />
            返 回 学 员 端
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 border-4 border-black py-3 font-black font-mono tracking-widest rounded-xl transition-all hover:-translate-y-1 neo-shadow-sm hover:neo-shadow hover:bg-red-500 hover:text-white hover:border-red-700 text-sm px-4"
          >
            <LogOut className="size-4" strokeWidth={3} />
            退 出 登 录
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <Outlet />
      </main>
    </div>
  );
}