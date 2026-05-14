import { create } from 'zustand';

interface CarState {
  isConnected: boolean;
  ping: number;
  mode: 'eco' | 'normal' | 'sport';
  motorSpeeds: { left: number; right: number };
  turnSignals: { left: boolean; right: boolean };
  isHazard: boolean;
  distance: number;
  
  setMode: (mode: 'eco' | 'normal' | 'sport') => void;
  updateControl: (x: number, y: number) => void;
  toggleTurnSignal: (side: 'left' | 'right') => void;
  toggleHazard: () => void;
  setDistance: (dist: number) => void;
  emergencyStop: () => void;
  connect: () => void;
}

// Тримаємо WebSocket поза станом Zustand
let socket: WebSocket | null = null;

export const useCarStore = create<CarState>((set, get) => ({
  isConnected: false,
  ping: 0,
  mode: 'normal',
  motorSpeeds: { left: 0, right: 0 },
  turnSignals: { left: false, right: false },
  isHazard: false,
  distance: 150,

  setMode: (mode) => set({ mode }),

  toggleTurnSignal: (side) => {
    const { turnSignals } = get();
    const newSignals = {
      left: side === 'left' ? !turnSignals.left : false,
      right: side === 'right' ? !turnSignals.right : false,
    };
    set({ turnSignals: newSignals, isHazard: false });
    
    // Відправляємо на ESP32
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ tL: newSignals.left, tR: newSignals.right, haz: false }));
    }
  },

  toggleHazard: () => {
    const { isHazard } = get();
    const nextState = !isHazard;
    set({ isHazard: nextState, turnSignals: { left: false, right: false } });
    
    // Відправляємо на ESP32
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ tL: false, tR: false, haz: nextState }));
    }
  },

  setDistance: (distance) => set({ distance }),

  updateControl: (x, y) => {
    const { mode } = get();
    const multipliers = { eco: 0.4, normal: 0.7, sport: 1.0 };
    const multiplier = multipliers[mode];

    let left = y + x;
    let right = y - x;

    const clamp = (val: number) => Math.round(Math.max(-100, Math.min(100, val)) * multiplier * 2.55);
    
    const finalLeft = clamp(left);
    const finalRight = clamp(right);

    set({ motorSpeeds: { left: finalLeft, right: finalRight } });

    // Відправляємо швидкості моторів
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ L: finalLeft, R: finalRight }));
    }
  },

  emergencyStop: () => {
    set({ motorSpeeds: { left: 0, right: 0 }, turnSignals: { left: false, right: false }, isHazard: false });
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ L: 0, R: 0, tL: false, tR: false, haz: false }));
    }
  },

  connect: () => {
    // Якщо розробляєш локально (npm run dev), підключайся до IP ESP32, інакше до хоста сайту
    const host = window.location.hostname === 'localhost' ? '192.168.4.1' : window.location.hostname;
    socket = new WebSocket(`ws://${host}/ws`);

    socket.onopen = () => {
      set({ isConnected: true, ping: 15 });
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.dist !== undefined) {
          set({ distance: data.dist });
        }
      } catch (err) {
        console.error("Помилка парсингу:", err);
      }
    };

    socket.onclose = () => {
      set({ isConnected: false });
      // Спроба перепідключення через 2 секунди
      setTimeout(() => get().connect(), 2000);
    };

    socket.onerror = (error) => {
      console.error("WebSocket помилка:", error);
      socket?.close();
    };
  }
}));