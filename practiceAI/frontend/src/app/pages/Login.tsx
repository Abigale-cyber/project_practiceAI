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
                // 注册成功后自动登录
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
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-[#00B894] mb-4">
                        <span className="text-2xl text-white font-bold">P</span>
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground">PracticeAI</h1>
                    <p className="text-sm text-muted-foreground mt-1">AI 陪练助手</p>
                </div>

                {/* Form */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    {/* Tabs */}
                    <div className="flex gap-4 mb-6">
                        <button
                            className={`flex-1 pb-2 text-sm font-medium transition-colors border-b-2 ${mode === 'login'
                                    ? 'border-[#00B894] text-[#00B894]'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            onClick={() => { setMode('login'); setError(''); }}
                        >
                            登录
                        </button>
                        <button
                            className={`flex-1 pb-2 text-sm font-medium transition-colors border-b-2 ${mode === 'register'
                                    ? 'border-[#00B894] text-[#00B894]'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            onClick={() => { setMode('register'); setError(''); }}
                        >
                            注册
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm text-muted-foreground mb-1.5">用户名</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#00B894] focus:border-transparent transition-colors"
                                placeholder="请输入用户名"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-muted-foreground mb-1.5">密码</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#00B894] focus:border-transparent transition-colors"
                                placeholder="请输入密码"
                                required
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 rounded-lg bg-[#00B894] text-white text-sm font-medium hover:bg-[#00a383] transition-colors disabled:opacity-50"
                        >
                            {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
                        </button>
                    </form>

                    {/* Demo hint */}
                    <p className="text-xs text-muted-foreground text-center mt-4">
                        默认管理员: admin / admin123
                    </p>
                </div>
            </div>
        </div>
    );
}
