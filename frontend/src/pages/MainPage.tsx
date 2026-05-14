import { useEffect, useRef, useState } from 'react';
import nipplejs from 'nipplejs';
import { useCarStore } from '@/store/useCarStore';

const MainPage = () => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [isCameraExpanded, setIsCameraExpanded] = useState(false); // За замовчуванням згорнуто
  
  const { 
    isConnected, ping, mode, motorSpeeds, turnSignals,
    setMode, updateControl, toggleTurnSignal, emergencyStop, connect 
  } = useCarStore();

  useEffect(() => {
    connect();
    if (joystickRef.current) {
      const manager = nipplejs.create({
        zone: joystickRef.current,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: '#2196F3',
        size: 100
      });

      manager.on('move', (_, data) => {
        updateControl(data.vector.x * 100, data.vector.y * 100);
      });

      manager.on('end', () => updateControl(0, 0));
      return () => manager.destroy();
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '90vh', gap: '10px' }}>
      
      {/* 1. Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f0f0f0', padding: '10px', borderRadius: '8px' }}>
        <span>Status: {isConnected ? '🟢' : '🔴'}</span>
        <span>Ping: {ping}ms</span>
        <span>Mode: <b>{mode.toUpperCase()}</b></span>
      </div>

      {/* 2. Collapsible Camera Section */}
      <div style={{ border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden' }}>
        <button 
          onClick={() => setIsCameraExpanded(!isCameraExpanded)}
          style={{ width: '100%', padding: '10px', background: '#eee', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 'bold' }}
        >
          {isCameraExpanded ? '▼ Hide Camera' : '▶ Show Camera Stream'}
        </button>
        
        {isCameraExpanded && (
          <div style={{ height: '400px', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', position: 'relative' }}>
            <p>Camera Stream Placeholder</p>
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', color: '#0f0', fontSize: '12px', background: 'rgba(0,0,0,0.6)', padding: '4px' }}>
              L:{motorSpeeds.left} R:{motorSpeeds.right}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Controls Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px', flex: 1 }}>
        
        {/* Joystick & Turn Signals Container */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div ref={joystickRef} style={{ flex: 1, background: '#f9f9f9', borderRadius: '8px', position: 'relative', border: '1px solid #eee' }}>
            {/* Turn Signal Buttons Floating near joystick */}
            <div style={{ position: 'absolute', top: '10px', width: '100%', display: 'flex', justifyContent: 'space-around', zIndex: 10 }}>
              <button 
                onClick={() => toggleTurnSignal('left')}
                style={{ 
                  padding: '10px 15px', 
                  borderRadius: '50%', 
                  border: 'none', 
                  backgroundColor: turnSignals.left ? '#FFD700' : '#ccc',
                  boxShadow: turnSignals.left ? '0 0 15px #FFD700' : 'none',
                  cursor: 'pointer'
                }}
              >
                ⬅️
              </button>
              <button 
                onClick={() => toggleTurnSignal('right')}
                style={{ 
                  padding: '10px 15px', 
                  borderRadius: '50%', 
                  border: 'none', 
                  backgroundColor: turnSignals.right ? '#FFD700' : '#ccc',
                  boxShadow: turnSignals.right ? '0 0 15px #FFD700' : 'none',
                  cursor: 'pointer'
                }}
              >
                ➡️
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            onClick={emergencyStop}
            style={{ flex: 1, background: '#ff4d4d', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', fontSize: '1.2rem' }}
          >
            STOP
          </button>
          
          <div style={{ display: 'flex', gap: '5px' }}>
            {(['eco', 'normal', 'sport'] as const).map(m => (
              <button 
                key={m} 
                onClick={() => setMode(m)}
                style={{ flex: 1, padding: '8px 0', background: mode === m ? '#2196F3' : '#eee', color: mode === m ? 'white' : '#333', border: 'none', borderRadius: '4px', fontSize: '10px' }}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default MainPage;