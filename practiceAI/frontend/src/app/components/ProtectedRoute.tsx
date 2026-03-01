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
    const { isAuthenticated, isAdmin } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
