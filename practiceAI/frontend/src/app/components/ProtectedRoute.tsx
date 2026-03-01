/**
 * 路由保护组件 —— 未认证用户自动跳转到登录页，
 * 管理员路由额外校验 admin 角色
 */
import { Navigate } from 'react-router';
import { useAuth } from '../AuthContext';

interface Props {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: Props) {
    const { isAuthenticated, isAdmin, loading } = useAuth();

    if (loading) {
        // 让页面在检查 token 期间保持空白/加载态，避免被重定向
        return (
            <div className="min-h-screen bg-[#FFFDF5] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-black border-t-[#2563EB] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
