import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router';
import { GraduationCap, Shield, ArrowLeft, Sparkles, BookOpen } from 'lucide-react';

type RoleMode = null | 'student' | 'admin';
type FormMode = 'login' | 'register';

export default function Login() {
    const { login, register, isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [roleMode, setRoleMode] = useState<RoleMode>(null);        // 选择身份
    const [formMode, setFormMode] = useState<FormMode>('login');     // 登录/注册
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 已登录则自动跳转
    useEffect(() => {
        if (isAuthenticated) {
            navigate(isAdmin ? '/admin' : '/', { replace: true });
        }
    }, [isAuthenticated, isAdmin, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (formMode === 'register') {
                await register(username, password);
                await login(username, password);
            } else {
                await login(username, password);
            }
            // login 成功后 useEffect 会自动跳转
        } catch (err: any) {
            setError(err.message || '操作失败');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setRoleMode(null);
        setError('');
        setUsername('');
        setPassword('');
        setFormMode('login');
    };

    // ==================== 选择身份页 ====================
    if (roleMode === null) {
        return (
            <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#FDE047] rounded-full mix-blend-multiply blur-3xl opacity-70 animate-blob pointer-events-none"></div>
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#F9A8D4] rounded-full mix-blend-multiply blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-[#93C5FD] rounded-full mix-blend-multiply blur-3xl opacity-50 animate-blob animation-delay-4000 pointer-events-none"></div>

                <div className="w-full max-w-2xl relative z-10">
                    {/* Logo Area */}
                    <div className="mb-12 text-center">
                        <div className="inline-flex h-20 w-32 bg-[#2563EB] rounded-2xl items-center justify-center rotate-3 neo-shadow-sm mb-6 border-4 border-black">
                            <span className="text-4xl text-white font-black tracking-tighter uppercase font-[Syne]">MG.</span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-3 uppercase display-font transform hover:skew-x-3 transition-transform duration-500 cursor-default">
                            AI 陪练助手
                        </h1>
                        <p className="text-lg font-bold tracking-widest bg-black text-white inline-block px-5 py-1.5 rounded-full -rotate-1">
                            选择你的身份
                        </p>
                    </div>

                    {/* Role Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                        {/* Student Card */}
                        <button
                            onClick={() => setRoleMode('student')}
                            className="group bg-white rounded-3xl border-4 border-black p-8 neo-shadow transition-all duration-300 hover:-translate-y-2 hover:rotate-1 text-left active:translate-y-0 active:shadow-none"
                        >
                            <div className="w-16 h-16 bg-[#FDE047] rounded-2xl border-4 border-black flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform neo-shadow-sm">
                                <GraduationCap className="size-8 text-black" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-2 font-[Syne]">
                                学 生
                            </h2>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                智能问答 · AI 陪练 · 练习记录
                            </p>
                            <div className="mt-6 flex items-center gap-2">
                                <span className="text-xs font-black uppercase bg-[#FDE047] text-black px-3 py-1 rounded-full border-2 border-black tracking-wider">
                                    登录 / 注册
                                </span>
                                <Sparkles className="size-4 text-[#FDE047] group-hover:animate-spin" />
                            </div>
                        </button>

                        {/* Teacher/Admin Card */}
                        <button
                            onClick={() => setRoleMode('admin')}
                            className="group bg-white rounded-3xl border-4 border-black p-8 neo-shadow transition-all duration-300 hover:-translate-y-2 hover:-rotate-1 text-left active:translate-y-0 active:shadow-none"
                        >
                            <div className="w-16 h-16 bg-[#2563EB] rounded-2xl border-4 border-black flex items-center justify-center mb-6 group-hover:-rotate-6 transition-transform neo-shadow-sm">
                                <Shield className="size-8 text-white" strokeWidth={2.5} />
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 mb-2 font-[Syne]">
                                教 师
                            </h2>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                知识管理 · 题目配置 · 数据总览
                            </p>
                            <div className="mt-6 flex items-center gap-2">
                                <span className="text-xs font-black uppercase bg-[#2563EB] text-white px-3 py-1 rounded-full border-2 border-black tracking-wider">
                                    管理员登录
                                </span>
                                <BookOpen className="size-4 text-[#2563EB] group-hover:animate-pulse" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== 登录/注册表单 ====================
    const isStudent = roleMode === 'student';
    const accentColor = isStudent ? '#FDE047' : '#2563EB';
    const accentBg = isStudent ? 'bg-[#FDE047]' : 'bg-[#2563EB]';
    const accentText = isStudent ? 'text-black' : 'text-white';
    const roleLabel = isStudent ? '学生' : '教师';
    const RoleIcon = isStudent ? GraduationCap : Shield;

    return (
        <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full mix-blend-multiply blur-3xl opacity-70 animate-blob pointer-events-none"
                style={{ backgroundColor: accentColor }}></div>
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#F9A8D4] rounded-full mix-blend-multiply blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Back Button */}
                <button
                    onClick={handleBack}
                    className="mb-6 flex items-center gap-2 px-4 py-2 border-4 border-black rounded-xl font-black uppercase tracking-wider text-sm neo-shadow-sm transition-all hover:-translate-y-1 hover:neo-shadow bg-white"
                >
                    <ArrowLeft className="size-4" strokeWidth={3} />
                    选择身份
                </button>

                {/* Logo Area */}
                <div className="mb-8 text-center">
                    <div className={`inline-flex h-16 w-16 ${accentBg} rounded-2xl items-center justify-center neo-shadow-sm mb-4 border-4 border-black`}>
                        <RoleIcon className={`size-8 ${accentText}`} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2 uppercase font-[Syne]">
                        {roleLabel}登录
                    </h1>
                    <p className="text-sm font-bold tracking-widest text-slate-500 uppercase">
                        {isStudent ? '智能学习 · 从这里开始' : '管理后台 · 仅限教师'}
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-3xl border-4 border-black p-8 neo-shadow transition-transform duration-300 hover:-translate-y-1">
                    {/* Tabs — 学生端显示 登录/注册；教师端仅登录 */}
                    {isStudent ? (
                        <div className="flex gap-4 mb-8">
                            <button
                                className={`flex-1 py-3 text-lg font-black uppercase transition-all rounded-xl border-4 border-black neo-shadow-sm tracking-widest ${formMode === 'login'
                                    ? 'bg-[#FDE047] text-black translate-x-[2px] translate-y-[2px] !shadow-none'
                                    : 'bg-white text-black hover:bg-black hover:text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:!shadow-none'
                                    }`}
                                onClick={() => { setFormMode('login'); setError(''); }}
                            >
                                账 号 登 录
                            </button>
                            <button
                                className={`flex-1 py-3 text-lg font-black uppercase transition-all rounded-xl border-4 border-black neo-shadow-sm tracking-widest ${formMode === 'register'
                                    ? 'bg-[#FDE047] text-black translate-x-[2px] translate-y-[2px] !shadow-none'
                                    : 'bg-white text-black hover:bg-black hover:text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:!shadow-none'
                                    }`}
                                onClick={() => { setFormMode('register'); setError(''); }}
                            >
                                首 次 注 册
                            </button>
                        </div>
                    ) : (
                        <div className="mb-8 flex items-center gap-3">
                            <div className="w-3 h-3 bg-[#2563EB] rounded-full border-2 border-black"></div>
                            <span className="text-lg font-black uppercase tracking-widest text-slate-900">教 师 登 录</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-black uppercase text-black mb-2 tracking-widest">
                                {isStudent ? '学 号 / 用 户 名' : '教 师 账 号'}
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full neo-input border-4 border-black focus:ring-4"
                                style={{ '--tw-ring-color': accentColor } as any}
                                placeholder={isStudent ? '输入学号或用户名' : '输入管理员账号'}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-black uppercase text-black mb-2 tracking-widest">
                                账 户 密 码
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full neo-input border-4 border-black focus:ring-4"
                                style={{ '--tw-ring-color': accentColor } as any}
                                placeholder="输入密码"
                                required
                            />
                        </div>

                        {error && (
                            <div className="text-sm font-bold uppercase text-white bg-red-500 border-4 border-black rounded-lg px-4 py-3 neo-shadow-sm">
                                [错误提示]: {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 ${accentBg} ${accentText} text-xl border-4 border-black neo-btn mt-4 disabled:opacity-70 disabled:grayscale tracking-widest font-black uppercase`}
                        >
                            {loading
                                ? '处 理 中...'
                                : formMode === 'register'
                                    ? '创 建 账 号'
                                    : isStudent
                                        ? '开 始 学 习'
                                        : '进 入 后 台'
                            }
                        </button>
                    </form>

                    {/* Bottom Hint */}
                    {!isStudent && (
                        <div className="mt-8 pt-6 border-t-4 border-black border-dashed flex items-center justify-between">
                            <span className="text-xs font-black uppercase bg-black text-white px-3 py-1 rounded-full tracking-widest">测试用</span>
                            <p className="text-sm font-medium text-slate-500 font-mono text-right border-2 border-slate-300 bg-slate-100 px-2 rounded">
                                admin / admin123
                            </p>
                        </div>
                    )}

                    {isStudent && formMode === 'register' && (
                        <p className="mt-6 text-xs text-center text-slate-400 font-medium">
                            注册后即可使用 AI 辅导、智能练习等全部功能
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
