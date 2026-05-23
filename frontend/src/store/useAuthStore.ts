import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      
      login: async (username, password) => {
        try {
          // Отримуємо актуальні налаштування з ESP32 перед входом
          const host = window.location.hostname === 'localhost' ? '192.168.4.1' : '';
          const res = await fetch(`${host}/api/settings`);
          const settings = await res.json();

          // Порівнюємо введені дані з даними в пам'яті ESP32
          if (username === settings.username && password === settings.userpassword) {
            set({ isAuthenticated: true });
            return true;
          }
          return false;
        } catch (e) {
          // Якщо зв'язку немає, дозволяємо вхід за дефолтом (для розробки)
          if (username === 'admin' && password === 'admin') {
            set({ isAuthenticated: true });
            return true;
          }
          return false;
        }
      },
      
      logout: () => set({ isAuthenticated: false }),
    }),
    { name: 'car-auth-storage' }
  )
);