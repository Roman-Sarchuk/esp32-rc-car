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

let socket: WebSocket | null = null;
let controlInterval: any = null; // Таймер для постійної відправки команд

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
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ tL: newSignals.left, tR: newSignals.right, haz: false }));
    }
  },

  toggleHazard: () => {
    const { isHazard } = get();
    const nextState = !isHazard;
    set({ isHazard: nextState, turnSignals: { left: false, right: false } });
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

    // РОЗУМНИЙ РОЗРАХУНОК ШВИДКОСТІ (Враховує, що старт з 150)
    const calculatePWM = (val: number) => {
      const raw = Math.round(Math.max(-100, Math.min(100, val)) * multiplier);
      if (Math.abs(raw) < 10) return 0; // Мертва зона (щоб не гуділо в стані спокою)

      const MIN_SPEED = 150; // Твій мінімальний поріг для старту
      const sign = raw > 0 ? 1 : -1;
      // Масштабуємо від 10-100% натискання у 150-255 ШІМ
      const speed = MIN_SPEED + ((Math.abs(raw) - 10) / 90) * (255 - MIN_SPEED);
      return Math.round(sign * Math.min(255, speed));
    };

    const finalLeft = calculatePWM(left);
    const finalRight = calculatePWM(right);

    set({ motorSpeeds: { left: finalLeft, right: finalRight } });
  },

  emergencyStop: () => {
    set({ motorSpeeds: { left: 0, right: 0 }, turnSignals: { left: false, right: false }, isHazard: false });
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ L: 0, R: 0, tL: false, tR: false, haz: false }));
    }
  },

  connect: () => {
    const host = window.location.hostname === 'localhost' ? '192.168.4.1' : window.location.hostname;
    socket = new WebSocket(`ws://${host}/ws`);

    socket.onopen = () => {
      set({ isConnected: true, ping: 15 });
      
      // СЕРЦЕБИТТЯ КОНТРОЛЕРА (Щоб не глушив Watchdog)
      if (controlInterval) clearInterval(controlInterval);
      controlInterval = setInterval(() => {
        const state = get();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ L: state.motorSpeeds.left, R: state.motorSpeeds.right }));
        }
      }, 100); // Шлемо поточну швидкість кожні 100 мс
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.dist !== undefined) set({ distance: data.dist });
      } catch (err) {}
    };

    socket.onclose = () => {
      set({ isConnected: false });
      if (controlInterval) clearInterval(controlInterval);
      setTimeout(() => get().connect(), 2000);
    };
  }
}));