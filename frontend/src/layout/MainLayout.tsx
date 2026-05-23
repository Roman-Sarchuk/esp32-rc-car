import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export const MainLayout = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid black', padding: '10px' }}>
        <div>
          <strong>ESP-CAR</strong> | Адмін-панель
        </div>
        <nav>
          <Link to="/">Керування</Link> | 
          <Link to="/settings"> Налаштування</Link> | 
          <button onClick={handleLogout} style={{ marginLeft: '10px' }}>Від'єднатись</button>
        </nav>
      </header>
      
      <main style={{ padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  );
};