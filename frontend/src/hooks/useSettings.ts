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

// Our hardcoded default data for testing purposes
const MOCK_SETTINGS: NetworkSettings = {
  ap_ssid: 'Freenove_Car_AP',
  ap_pass: '12345678',
  sta_ssid: 'Home_WiFi',
  sta_pass: 'secret_password',
  use_sta: false,
  username: 'admin',
  userpassword: 'admin',
};

export const useSettings = () => {
  const [settings, setSettings] = useState<NetworkSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Imitate GET request when loading
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      // Imitate network delay of 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
      setSettings(MOCK_SETTINGS);
      setIsLoading(false);
    };

    fetchSettings();
  }, []);

  //  Imitate POST request for saving
  const saveSettings = async (newSettings: NetworkSettings) => {
    setIsSaving(true);
    // Imitate network delay of 800ms
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log('Data send to ESP32:', newSettings);
    setSettings(newSettings);
    setIsSaving(false);
    
    alert('Settings saved successfully!');
    return true;
  };

  return { settings, isLoading, isSaving, saveSettings };
};