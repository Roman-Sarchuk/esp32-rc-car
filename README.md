<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Orbitron&weight=700&size=34&duration=3000&pause=800&color=61DAFB&center=true&vCenter=true&width=1000&lines=ESP32+RC+Car;Embedded+Systems+%2B+Web+Control;React+%2B+TypeScript+%2B+ESP32;Real-time+WebSocket+Control" />
</p>

# 🏎️ ESP32 RC Car (Freenove WROVER)

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Zustand](https://img.shields.io/badge/Zustand-State%20Management-000000?logo=redux&logoColor=white)](https://zustand-demo.pmnd.rs/)
[![C++](https://img.shields.io/badge/C++-Embedded-00599C?logo=c%2B%2B&logoColor=white)](https://isocpp.org/)
[![PlatformIO](https://img.shields.io/badge/PlatformIO-Firmware-F6822A?logo=platformio&logoColor=white)](https://platformio.org/)

A fullstack embedded RC car project built around the Freenove ESP32 WROVER. This repository contains both the C++ firmware (motor control, sensors, asynchronous web server) and the React + Vite frontend web app used as a remote control interface.

The UI is compiled into a Single Page Application (SPA) and served directly from the ESP32's onboard LittleFS filesystem, creating a fully standalone system.

---

## 📸 Project Preview

<details>
  <summary><b>📱 Web Interface Screenshots</b></summary>
  <br/>
  
  | login | main menu | settings |
  | :-: | :-: | :-: |
  | <img width="576" alt="login" src="https://github.com/user-attachments/assets/0fa6c3a3-b186-4529-ba95-5829066493f4" /> | <img width="576" alt="mainmenu" src="https://github.com/user-attachments/assets/84890a67-096f-4a2c-b624-5bd9948f1a10" /> | <img width="576" alt="settings" src="https://github.com/user-attachments/assets/54d52edd-35ae-4eb8-bd1c-ce9344799a0f" /> |

</details>

<details>
  <summary><b>🎬 RC Car Live Demo</b></summary>
  <br/>

  | move | turn signals | gears | collision prevention |
  | :-: | :-: | :-: | :-: |
  | <img width="415" alt="control-move" src="https://github.com/user-attachments/assets/ea7a08ee-837f-4092-be0e-c952b8cbc41b" /> | <img width="415" alt="control-turn signals" src="https://github.com/user-attachments/assets/a3420ce8-8a00-4638-9e99-3343979ce31b" /> | <img width="415" alt="control-gears" src="https://github.com/user-attachments/assets/b9443825-7f08-4791-bde1-c76312b16ca0" /> | <img width="372" alt="wall-check" src="https://github.com/user-attachments/assets/15b18ca7-5754-400c-8eff-32a163423a5d" /> |

</details>

---

## ✨ Core Features

* **Real-time WebSocket Control:** Low-latency differential drive steering via a virtual joystick.
* **Smart Safety Systems:** Features a hardware Watchdog (stops motors on connection loss) and an active collision prevention system using the HC-SR04 ultrasonic sensor.
* **Dynamic Network Setup:** Supports both Station (STA) mode to connect to your home Wi-Fi, and a fallback Access Point (AP) mode if the network is unavailable.
* **Onboard State Persistence:** Wi-Fi credentials and admin access data are securely stored in the ESP32's NVS (Non-Volatile Storage).
* **Visual Status Indicators:** Onboard LEDs provide real-time feedback for turn signals (left/right), hazard lights, and a dedicated brake/stopped indicator.

---

## 🛠 Technology Stack

### Hardware
* **Board:** Freenove ESP32 WROVER
* **Drive:** 2 DC Motors (Differential Drive) + L298N Motor Driver (H-bridge)
* **Sensors:** HC-SR04 Ultrasonic distance sensor
* **Power:** 2x 18650 Li-Ion battery pack (7.4V) for stable Wi-Fi and motor current (Highly Recommended)

### Firmware (Backend)
* `C++` / `Arduino Framework` / `PlatformIO`
* `ESPAsyncWebServer` & `AsyncTCP` (Async HTTP & WebSockets)
* `ArduinoJson` (Serialization) & `LittleFS` (File system)

### Web App (Frontend)
* `React` / `Vite` / `TypeScript`
* `Zustand` (State management + LocalStorage persistence)
* `nipplejs` (Virtual joystick handling)

---

## ⚙️ Pinout & Wiring

This project uses specific wiring configurations to ensure the safety of the ESP32 WROVER module and stable operation of the motors. Please pay close attention to the power supply and sensor logic levels.

### 🔋 Power Supply Strategy
DC Motors draw significant current spikes, which can cause the ESP32 to restart (brownout) if the power source cannot handle the load. This project supports two power configurations:

* **Recommended (Single Power Source):** Use a 2S Li-Ion battery pack (two **18650** cells, 7.4V - 8.4V). Connect it to the `12V` and `GND` terminals of the L298N. Because the voltage is above 7V, the L298N's onboard regulator can generate a stable 5V. You can then power the ESP32 by connecting the L298N's `5V` output terminal to the ESP32's `VIN` or `5V` pin.
* **Development / Budget (Split Power Source):** If using standard AA Alkaline batteries (which drop voltage significantly under load), you must split the power. Power the motors by connecting the AA pack (6V) to the L298N's `12V` terminal. Power the ESP32 separately via a USB Powerbank.

### 🚙 Motor & Driver Connections (L298N)
1. **Left DC Motor:** Connect the two wires to `OUT1` and `OUT2` on the L298N.
2. **Right DC Motor:** Connect the two wires to `OUT3` and `OUT4`.
> *Tip: If a wheel spins backward during forward commands, simply swap its two wires at the OUT terminal block. No code changes needed!*
3. **PWM Control:** Remove the default hardware jumpers from the `ENA` and `ENB` pins on the L298N to allow the ESP32 to control motor speed via PWM.

### 📍 ESP32 Pin Mapping
The pins below were carefully selected to avoid ESP32 WROVER strapping pins and internal flash/PSRAM collisions.

| Component | Signal | ESP32 GPIO | Notes |
| :--- | :--- | :---: | :--- |
| **Left Motor** | `ENA` | **14** | PWM Speed control |
| | `IN1` | **27** | Direction 1 |
| | `IN2` | **26** | Direction 2 |
| **Right Motor**| `ENB` | **32** | PWM Speed control |
| | `IN3` | **25** | Direction 1 |
| | `IN4` | **33** | Direction 2 |
| **HC-SR04** | `TRIG_PIN` | **13** | 5V Output from ESP32 |
| | `ECHO_PIN` | **35** | **Must use a Voltage Divider!** (See notes below) |
| **LEDs** | `LED_LEFT` | **18** | Left turn signal (Requires 220Ω resistor) |
| | `LED_RIGHT` | **19** | Right turn signal (Requires 220Ω resistor) |
| | `LED_STOP` | **21** | Brake/Stop indicator (Requires 220Ω resistor (I used 10kΩ to decrease brightness)) |

### 🚨 Critical Wiring "Gotchas" (Read Before Powering On)

1. **Common Ground (Mandatory):** You must connect a wire between the `GND` terminal of the L298N and any `GND` pin on the ESP32. Without this, the PWM and direction control signals will not work.
2. **HC-SR04 Voltage Divider (Protect Your ESP32):** The HC-SR04 sensor is powered by 5V (connect its VCC to the ESP32's `VIN`/`5V` pin, not 3.3V). However, its `Echo` pin outputs a 5V signal. The ESP32 logic level is 3.3V. **Connecting Echo directly to GPIO 35 will damage the board.** 
   * **Solution:** Build a simple voltage divider using a 1kΩ and a 2kΩ resistor:
   * `Sensor Echo Pin` ➔ `1kΩ Resistor` ➔ **(Point A)** ➔ `2kΩ Resistor` ➔ `GND`.
   * Connect **Point A** to ESP32 **GPIO 35**.
3. **Bare Wires:** Ensure no bare copper wire is exposed outside the screw terminals on the L298N power inputs to prevent catastrophic short circuits from the battery pack.
---

## 📂 Repository Layout

```text
esp-rc-car/
├─ firmware/              # PlatformIO-based ESP32 firmware
│  ├─ src/
│  │  ├─ main.cpp         # Main logic, web server, and pin definitions
│  │  └─ testwheels.cpp   # Debug script to verify L298N motor wiring
│  ├─ data/               # Web UI static files (served by ESP32)
│  └─ platformio.ini      # Firmware build configuration
├─ frontend/              # React + Vite UI project
│  ├─ src/
│  │  ├─ layout/
│  │  ├─ pages/
│  │  ├─ store/           # Zustand state management
│  │  └─ App.tsx
│  ├─ package.json
│  └─ vite.config.ts
└─ README.md
```

---

## 🚀 Getting Started

This project consists of two parts: a React frontend (web interface) and a C++ backend firmware for the ESP32. You will need Node.js and VS Code with the PlatformIO extension installed.

### 1. Frontend Setup (React)

First, you need to build the web application so it becomes a set of static files that will later be stored in the device memory.

1. Go to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Build the project (the output will be generated directly into `firmware/data/` instead of `frontend/dist/` due to the configuration in `vite.config.ts`):

```bash
npm run build
```

### 2. Flashing the ESP32 (PlatformIO)

Now you can flash the microcontroller. Make sure you open the firmware folder as the workspace in VS Code when using PlatformIO.

1. Connect the ESP32 to your computer via USB.
2. Open the `firmware` folder in VS Code.
3. In the PlatformIO sidebar, open your environment menu (for example, `env:esp32dev`).
4. **Build File System Image:** First, build the SPIFFS/LittleFS image that contains the web interface:
   * Run: `PlatformIO> Build Filesystem Image`
6. **Upload File System Image:** Then upload the generated filesystem image to the ESP32:
   * Run: `PlatformIO> Upload Filesystem Image`
7. **Upload Firmware:** After the file system upload completes, flash the actual firmware:
   * Click the **Upload** button (arrow `→` in the bottom bar of VS Code) or run `General > Upload`.

### 3. First Launch

1. After flashing successfully, the ESP32 will create its own Wi-Fi network.
2. Connect to the network `Freenove_Car_AP` (default password: `12345678`).
3. Open a browser and navigate to `http://esp-car.local` (or `http://192.168.4.1`).
4. Use the default login credentials: `admin` / `admin`.
5. Go to "Settings" to connect the car to your home Wi-Fi network.

### Hardware Debugging (Optional)

If your motors are not spinning or are spinning in the wrong direction, you can isolate hardware issues using the provided debug script before running the full web server.

1. In `firmware/src/`, temporarily rename `main.cpp` to `main_backup.cpp`.
2. Rename `testwheels.cpp` to `main.cpp`.
3. Build and upload.
4. This minimal script will cycle the motors forward and backward, allowing you to easily verify your L298N wiring, common ground, and power supply without any Wi-Fi or WebSockets overhead.
   

---

## 🌐 Connect

* **Developer LinkedIn:** [![LinkedIn](https://img.shields.io/badge/Roman_Sarchuk-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/roman-sarchuk-267102323/)

<br/>
If you found this project helpful, consider starring the repository.