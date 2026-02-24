import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router';

export default function Login() {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'register') {
                await register(username, password);
                await login(username, password);
            } else {
                await login(username, password);
            }
            navigate('/');
        } catch (err: any) {
            setError(err.message || '操作失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Blobs for Brutalist theme */}
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#FDE047] rounded-full mix-blend-multiply blur-3xl opacity-70 animate-blob pointer-events-none"></div>
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#F9A8D4] rounded-full mix-blend-multiply blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo Area */}
                <div className="mb-10 text-center">
                    <div className="inline-flex h-20 w-32 bg-[#2563EB] rounded-2xl items-center justify-center rotate-3 neo-shadow-sm mb-6 border-4 border-black">
                        <span className="text-4xl text-white font-black tracking-tighter uppercase font-[Syne]">MG.</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-2 uppercase display-font transform hover:skew-x-3 transition-transform duration-500 cursor-default">
                        AI 陪练助手
                    </h1>
                    <p className="text-lg font-bold tracking-widest text-slate-700 bg-black text-white inline-block px-4 py-1 rounded-full -rotate-1">
                        智能学习伙伴
                    </p>
                </div>

                {/* Brutalist Form Card */}
                <div className="bg-white rounded-3xl border-4 border-black p-8 neo-shadow transition-transform duration-300 hover:-translate-y-1">
                    {/* Tabs */}
                    <div className="flex gap-4 mb-8">
                        <button
                            className={`flex-1 py-3 text-lg font-black uppercase transition-all rounded-xl border-4 border-black neo-shadow-sm tracking-widest ${mode === 'login'
                                ? 'bg-[#F9A8D4] text-black translate-x-[2px] translate-y-[2px] !shadow-none'
                                : 'bg-white text-black hover:bg-black hover:text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:!shadow-none'
                                }`}
                            onClick={() => { setMode('login'); setError(''); }}
                        >
                            账 号 登 录
                        </button>
                        <button
                            className={`flex-1 py-3 text-lg font-black uppercase transition-all rounded-xl border-4 border-black neo-shadow-sm tracking-widest ${mode === 'register'
                                ? 'bg-[#F9A8D4] text-black translate-x-[2px] translate-y-[2px] !shadow-none'
                                : 'bg-white text-black hover:bg-black hover:text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:!shadow-none'
                                }`}
                            onClick={() => { setMode('register'); setError(''); }}
                        >
                            首 次 注 册
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-black uppercase text-black mb-2 tracking-widest">账 户 名</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full neo-input border-4 border-black focus:ring-4 focus:ring-[#F9A8D4]"
                                placeholder="输入用户名"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-black uppercase text-black mb-2 tracking-widest">账 户 密 码</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full neo-input border-4 border-black focus:ring-4 focus:ring-[#F9A8D4]"
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
                            className="w-full py-4 bg-[#2563EB] text-white text-xl border-4 border-black neo-btn mt-4 disabled:opacity-70 disabled:grayscale tracking-widest"
                        >
                            {loading ? '处 理 中...' : mode === 'login' ? '开 始 练 习' : '创 建 账 号'}
                        </button>
                    </form>

                    {/* Demo hint */}
                    <div className="mt-8 pt-6 border-t-4 border-black border-dashed flex items-center justify-between">
                        <span className="text-xs font-black uppercase bg-black text-white px-3 py-1 rounded-full tracking-widest">测试用</span>
                        <p className="text-sm font-medium text-slate-500 font-mono text-right border-2 border-slate-300 bg-slate-100 px-2 rounded">
                            admin / admin123
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
