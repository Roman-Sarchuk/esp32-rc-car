import { create } from 'zustand';

interface CarState {
  isConnected: boolean;
  ping: number;
  mode: 'eco' | 'normal' | 'sport';
  motorSpeeds: { left: number; right: number };
  turnSignals: { left: boolean; right: boolean; hazard: boolean };
  distance: number; // Відстань в см
  
  setMode: (mode: 'eco' | 'normal' | 'sport') => void;
  updateControl: (x: number, y: number) => void;
  toggleTurnSignal: (side: 'left' | 'right') => void;
  toggleHazard: () => void;
  updateDistance: (dist: number) => void;
  emergencyStop: () => void;
  connect: () => void;
}

export const useCarStore = create<CarState>((set, get) => ({
  isConnected: false,
  ping: 0,
  mode: 'normal',
  motorSpeeds: { left: 0, right: 0 },
  turnSignals: { left: false, right: false, hazard: false },
  distance: 150, // Початкове значення

  setMode: (mode) => set({ mode }),

  toggleTurnSignal: (side) => {
    const { turnSignals } = get();
    if (side === 'left') {
      set({ 
        turnSignals: { 
          left: !turnSignals.left, 
          right: false, // Вимикаємо інший
          hazard: false  // Вимикаємо аварійку
        } 
      });
    } else {
      set({ 
        turnSignals: { 
          right: !turnSignals.right, 
          left: false, 
          hazard: false 
        } 
      });
    }
  },

  toggleHazard: () => {
    const isNowHazard = !get().turnSignals.hazard;
    set({ 
      turnSignals: { 
        hazard: isNowHazard,
        left: isNowHazard, 
        right: isNowHazard 
      } 
    });
  },

  updateDistance: (distance) => set({ distance }),

  updateControl: (x, y) => {
    // ... логіка розрахунку швидкостей (залишається без змін) ...
    const multiplier = { eco: 0.4, normal: 0.7, sport: 1.0 }[get().mode];
    const clamp = (v: number) => Math.round(Math.max(-100, Math.min(100, v)) * multiplier * 2.55);
    set({ motorSpeeds: { left: clamp(y + x), right: clamp(y - x) } });
  },

  emergencyStop: () => {
    set({ 
      motorSpeeds: { left: 0, right: 0 }, 
      turnSignals: { left: false, right: false, hazard: false } 
    });
  },

  connect: () => {
    setTimeout(() => set({ isConnected: true, ping: 24 }), 1000);
    // Імітація зміни відстані для тесту
    setInterval(() => {
      set((state) => ({ distance: Math.max(10, Math.min(400, state.distance + (Math.random() * 10 - 5))) }));
    }, 1000);
  }
}));