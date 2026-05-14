import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

function LoginPage() {
  // params
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuthStore();

  // functions
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const username = usernameRef.current?.value || "";
    const password = passwordRef.current?.value || "";

    const isSuccess = login(username, password);

    if (isSuccess) {
      setError("");
      navigate('/');
    } else {
      setError("Invalid username or password");
    }
  };

  // render
  return (
    <div
      style={{ maxWidth: "300px", margin: "50px auto", textAlign: "center" }}
    >
      <h2>Вхід до ESP-CAR</h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        <input type="text" placeholder="Логін (admin)" ref={usernameRef} />
        <input type="password" placeholder="Пароль (admin)" ref={passwordRef} />
        {error && (
          <span style={{ color: "red", fontSize: "14px" }}>{error}</span>
        )}
        <button type="submit">Увійти</button>
      </form>
    </div>
  );
}

export default LoginPage;
