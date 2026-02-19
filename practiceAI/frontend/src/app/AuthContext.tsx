import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getToken, setToken, removeToken, authApi } from './api';

// ===== 解析 JWT payload（无需 jwt-decode 库）=====
function parseJwt(token: string): any {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

interface AuthUser {
    user_id: number;
    user_name: string;
    role: string;
}

interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        // 初始化时检查 token
        const token = getToken();
        if (token) {
            const payload = parseJwt(token);
            if (payload?.subject) {
                setUser(payload.subject);
            }
        }
    }, []);

    const login = async (username: string, password: string) => {
        const res = await authApi.login(username, password);
        setToken(res.access_token);
        const payload = parseJwt(res.access_token);
        if (payload?.subject) {
            setUser(payload.subject);
        }
    };

    const register = async (username: string, password: string) => {
        await authApi.register(username, password);
    };

    const logout = () => {
        removeToken();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isAdmin: user?.role === 'admin',
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
