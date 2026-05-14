import { create } from 'zustand';

interface CarState {
  isConnected: boolean;
  ping: number;
  mode: 'eco' | 'normal' | 'sport';
  motorSpeeds: { left: number; right: number };
  turnSignals: { left: boolean; right: boolean };
  isHazard: boolean;
  distance: number; // Відстань від УЗ-датчика в см
  
  setMode: (mode: 'eco' | 'normal' | 'sport') => void;
  updateControl: (x: number, y: number) => void;
  toggleTurnSignal: (side: 'left' | 'right') => void;
  toggleHazard: () => void;
  setDistance: (dist: number) => void;
  emergencyStop: () => void;
  connect: () => void;
}

export const useCarStore = create<CarState>((set, get) => ({
  isConnected: false,
  ping: 0,
  mode: 'normal',
  motorSpeeds: { left: 0, right: 0 },
  turnSignals: { left: false, right: false },
  isHazard: false,
  distance: 150, // Дефолтне значення

  setMode: (mode) => set({ mode }),

  toggleTurnSignal: (side) => {
    const { turnSignals, isHazard } = get();
    
    // Якщо вмикаємо поворотник, аварійка завжди вимикається
    const newSignals = {
      left: side === 'left' ? !turnSignals.left : false,
      right: side === 'right' ? !turnSignals.right : false,
    };

    set({ turnSignals: newSignals, isHazard: false });
    console.log(`Signal update: L:${newSignals.left} R:${newSignals.right}`);
  },

  toggleHazard: () => {
    const { isHazard } = get();
    const nextState = !isHazard;
    set({ 
      isHazard: nextState, 
      turnSignals: { left: false, right: false } 
    });
    console.log(`Hazard state: ${nextState}`);
  },

  setDistance: (distance) => set({ distance }),

  updateControl: (x, y) => {
    const { mode } = get();
    const multipliers = { eco: 0.4, normal: 0.7, sport: 1.0 };
    const multiplier = multipliers[mode];

    // Диференційне керування
    let left = y + x;
    let right = y - x;

    const clamp = (val: number) => Math.round(Math.max(-100, Math.min(100, val)) * multiplier * 2.55);

    set({ motorSpeeds: { left: clamp(left), right: clamp(right) } });
  },

  emergencyStop: () => {
    set({ 
      motorSpeeds: { left: 0, right: 0 }, 
      turnSignals: { left: false, right: false },
      isHazard: false 
    });
  },

  connect: () => {
    setTimeout(() => set({ isConnected: true, ping: 18 }), 1000);
    // Імітація зміни відстані датчика
    setInterval(() => {
      const d = get().distance;
      const nextD = d > 20 ? d - 1 : 150;
      set({ distance: nextD });
    }, 500);
  }
}));