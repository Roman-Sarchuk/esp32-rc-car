import { useState, useEffect } from 'react';

export interface NetworkSettings {
  ap_ssid: string;
  ap_pass: string;
  sta_ssid: string;
  sta_pass: string;
  use_sta: boolean;
  username: string;
  userpassword: string;
}

const FALLBACK_SETTINGS: NetworkSettings = {
  ap_ssid: 'Freenove_Car_AP',
  ap_pass: '12345678',
  sta_ssid: '',
  sta_pass: '',
  use_sta: false,
  username: 'admin',
  userpassword: 'admin',
};

export const useSettings = () => {
  const [settings, setSettings] = useState<NetworkSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const getBaseUrl = () => window.location.hostname === 'localhost' ? 'http://192.168.4.1' : '';

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${getBaseUrl()}/api/settings`);
        if (!res.ok) throw new Error('Помилка завантаження налаштувань');
        const data = await res.json();
        setSettings(data);
      } catch (error) {
        console.error("Не вдалося отримати налаштування, використовуємо дефолтні", error);
        setSettings(FALLBACK_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const saveSettings = async (newSettings: NetworkSettings) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${getBaseUrl()}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
      
      if (!res.ok) throw new Error('Помилка збереження налаштувань');
      
      setSettings(newSettings);
      alert('Налаштування успішно збережено!');
      return true;
    } catch (error) {
      console.error(error);
      alert('Не вдалося зберегти налаштування. Перевірте з\'єднання.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return { settings, isLoading, isSaving, saveSettings };
};