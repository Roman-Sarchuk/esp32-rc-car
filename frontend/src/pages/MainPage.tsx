import { useEffect, useRef, useState } from "react";
import nipplejs from "nipplejs";
import { useCarStore } from "@/store/useCarStore";

const MainPage = () => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const [isCameraExpanded, setIsCameraExpanded] = useState(false);

  const {
    isConnected,
    ping,
    mode,
    motorSpeeds,
    turnSignals,
    isHazard,
    distance,
    setMode,
    updateControl,
    toggleTurnSignal,
    toggleHazard,
    emergencyStop,
    connect,
  } = useCarStore();

  useEffect(() => {
    connect();
    if (joystickRef.current) {
      const manager = nipplejs.create({
        zone: joystickRef.current,
        mode: "static",
        position: { left: "50%", top: "50%" },
        color: "#2196F3",
        size: 110,
      });

      manager.on("move", (evt: any) => {
        // Дістаємо payload з першого аргументу
        const payload = evt.data; 

        if (payload && payload.angle && payload.distance !== undefined) {
          const force = Math.min(payload.distance / 55, 1.0); // Відсоток натискання
          
          const x = Math.cos(payload.angle.radian) * force * 100;
          const y = Math.sin(payload.angle.radian) * force * 100;
          
          updateControl(x, y);
        }
      });

      manager.on("end", () => updateControl(0, 0));
      return () => manager.destroy();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Стилі для кнопок світла
  const getBtnStyle = (active: boolean, color: string) => ({
    width: "60px",
    height: "50px",
    borderRadius: "8px",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    backgroundColor: active ? color : "#ccc",
    boxShadow: active ? `0 0 15px ${color}` : "none",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "92vh",
        gap: "10px",
        userSelect: "none",
      }}
    >
      {/* 1. Header Info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          background: "#f8f9fa",
          padding: "10px",
          borderRadius: "10px",
          fontSize: "14px",
        }}
      >
        <span>Status: {isConnected ? "🟢 Online" : "🔴 Offline"}</span>
        <span>Ping: {ping}ms</span>
        <span
          style={{
            color: distance < 30 ? "red" : "inherit",
            fontWeight: "bold",
          }}
        >
          Dist: {distance} cm
        </span>
      </div>

      {/* 2. Collapsible Camera */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setIsCameraExpanded(!isCameraExpanded)}
          style={{
            width: "100%",
            padding: "12px",
            background: "#e9ecef",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            fontWeight: "bold",
          }}
        >
          {isCameraExpanded ? "▼ Згорнути камеру" : "▶ Розгорнути камеру"}
        </button>

        {isCameraExpanded && (
          <div
            style={{
              height: "400px",
              background: "#1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#444",
              position: "relative",
            }}
          >
            <p>Live Stream Placeholder</p>

            {/* Показник відстані в нижньому лівому куті */}
            <div
              style={{
                position: "absolute",
                bottom: "10px",
                left: "10px",
                background: "rgba(0,0,0,0.7)",
                color: distance < 40 ? "#ff4d4d" : "#00ff00",
                padding: "5px 10px",
                borderRadius: "4px",
                border: "1px solid #444",
                fontFamily: "monospace",
                fontSize: "18px",
              }}
            >
              DIST: {distance}cm
            </div>

            <div
              style={{
                position: "absolute",
                bottom: "10px",
                right: "10px",
                color: "#fff",
                fontSize: "12px",
                opacity: 0.6,
              }}
            >
              L:{motorSpeeds.left} | R:{motorSpeeds.right}
            </div>
          </div>
        )}
      </div>

      {/* 3. Control Dashboard */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr 100px",
          gap: "10px",
          flex: 1,
          paddingBottom: "10px",
        }}
      >
        {/* Блок поворотників (Стиль реального авто) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "10px 0",
          }}
        >
          <button
            onClick={() => toggleTurnSignal("right")}
            style={getBtnStyle(turnSignals.right || isHazard, "#ffc107")}
          >
            ➡️
          </button>

          <button
            onClick={toggleHazard}
            style={getBtnStyle(isHazard, "#dc3545")}
          >
            ⚠️
          </button>

          <button
            onClick={() => toggleTurnSignal("left")}
            style={getBtnStyle(turnSignals.left || isHazard, "#ffc107")}
          >
            ⬅️
          </button>
        </div>

        {/* Секція Джойстика */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            ref={joystickRef}
            style={{
              flex: 1,
              background: "#f1f3f5",
              borderRadius: "15px",
              position: "relative",
              border: "2px solid #dee2e6",
            }}
          ></div>
          <button
            onClick={emergencyStop}
            style={{
              height: "60px",
              background: "#ff4d4d",
              color: "white",
              fontWeight: "bold",
              border: "none",
              borderRadius: "10px",
              fontSize: "18px",
              boxShadow: "0 4px 0 #c92a2a",
            }}
          >
            E-STOP
          </button>
        </div>

        {/* Секція Режимів */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {(["eco", "normal", "sport"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                border: "none",
                borderRadius: "8px",
                fontWeight: "bold",
                background: mode === m ? "#228be6" : "#e9ecef",
                color: mode === m ? "white" : "#495057",
                fontSize: "12px",
                textTransform: "uppercase",
              }}
            >
              {m}
            </button>
          ))}
          <div
            style={{
              flex: 0.5,
              background: "#343a40",
              color: "#ced4da",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              textAlign: "center",
            }}
          >
            ID: {isConnected ? "Active" : "..."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
