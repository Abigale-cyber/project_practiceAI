import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from 'sonner';
import { AuthProvider } from './AuthContext';
import CustomCursor from './components/CustomCursor';

export default function App() {
  return (
    <AuthProvider>
      <CustomCursor />
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </AuthProvider>
  );
}
