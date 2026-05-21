import { useState, useEffect } from "react";
import { useSettings, type NetworkSettings } from "@/store/useSettings";

function SettingPage() {
  const { settings, isLoading, isSaving, saveSettings } = useSettings();

  // local state for the form. Initialize with empty values.
  const [formData, setFormData] = useState<NetworkSettings>({
    ap_ssid: "",
    ap_pass: "",
    sta_ssid: "",
    sta_pass: "",
    use_sta: false,
    username: "",
    userpassword: "",
  });

  // When data from the "backend" is loaded, update the form
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings(formData);
  };

  if (isLoading) {
    return <div>Завантаження налаштувань з машинки...</div>;
  }

  return (
    <div style={{ maxWidth: "500px", margin: "0 auto" }}>
      <h2>Налаштування мережі</h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      >
        {/* Block: Car access point (AP) */}
        <fieldset
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "15px",
          }}
        >
          <legend>Власна мережа машинки (AP Mode)</legend>
          <label>
            SSID:
            <input
              type="text"
              name="ap_ssid"
              value={formData.ap_ssid}
              onChange={handleChange}
              required
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Пароль:
            <input
              type="text"
              name="ap_pass"
              value={formData.ap_pass}
              onChange={handleChange}
              required
              style={{ width: "100%" }}
            />
          </label>
        </fieldset>

        {/* Block: Home network (STA) */}
        <fieldset
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "15px",
          }}
        >
          <legend>Домашня мережа (STA Mode)</legend>
          <label>
            <input
              type="checkbox"
              name="use_sta"
              checked={formData.use_sta}
              onChange={handleChange}
            />
            <b> Підключатись до домашнього Wi-Fi</b>
          </label>

          {formData.use_sta && (
            <>
              <label>
                Назва Wi-Fi (SSID):
                <input
                  type="text"
                  name="sta_ssid"
                  value={formData.sta_ssid}
                  onChange={handleChange}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                Пароль Wi-Fi:
                <input
                  type="password"
                  name="sta_pass"
                  value={formData.sta_pass}
                  onChange={handleChange}
                  style={{ width: "100%" }}
                />
              </label>
            </>
          )}
        </fieldset>
        
        {/* Block: Panel access credentials */}
        <fieldset>
          <legend>Налаштування доступу до панелі</legend>
          <label>
            Логін:
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              style={{ width: "100%" }}
            />
          </label>
          <label>
            Пароль:
            <input
              type="password"
              name="userpassword"
              value={formData.userpassword}
              onChange={handleChange}
              required
              style={{ width: "100%" }}
            />
          </label>
        </fieldset>

        <button
          type="submit"
          disabled={isSaving}
          style={{ padding: "10px", fontSize: "16px" }}
        >
          {isSaving ? "Збереження..." : "Зберегти налаштування"}
        </button>
      </form>
    </div>
  );
}

export default SettingPage;
