#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <ESPmDNS.h>

// --- ПІНИ ---
// Мотори
const int ENA = 14; const int IN1 = 27; const int IN2 = 26;
const int ENB = 32; const int IN3 = 25; const int IN4 = 33;
// Датчик
const int TRIG_PIN = 13; const int ECHO_PIN = 35;
// Діоди
const int LED_LEFT = 18; const int LED_RIGHT = 19;

// --- СТАН СИСТЕМИ ---
int motorSpeedL = 0;
int motorSpeedR = 0;
bool turnLeft = false;
bool turnRight = false;
bool hazard = false;
unsigned long lastCmdTime = 0;

// Таймери для неблокуючого коду (замість delay)
unsigned long lastDistanceMeasure = 0;
unsigned long lastBlinkTime = 0;
bool ledBlinkState = false;

// Мережа та Сервер
const char* ap_ssid = "Freenove_Car_AP";
const char* ap_pass = "12345678";
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// --- ФУНКЦІЇ КЕРУВАННЯ ЗАЛІЗОМ ---

void setMotors(int left, int right) {
  // Лівий мотор
  if (left > 0) {
    digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  } else if (left < 0) {
    digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
  } else {
    digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  }
  analogWrite(ENA, abs(left));

  // Правий мотор
  if (right > 0) {
    digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
  } else if (right < 0) {
    digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
  } else {
    digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
  }
  analogWrite(ENB, abs(right));
}

int readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // Таймаут 30мс, щоб не зависало
  return (duration == 0) ? 150 : (duration * 0.034 / 2);
}

void handleBlink() {
  // Блимаємо кожні 400 мс, якщо увімкнені поворотники або аварійка
  if (millis() - lastBlinkTime > 400) {
    lastBlinkTime = millis();
    ledBlinkState = !ledBlinkState;

    if (hazard) {
      digitalWrite(LED_LEFT, ledBlinkState);
      digitalWrite(LED_RIGHT, ledBlinkState);
    } else {
      digitalWrite(LED_LEFT, turnLeft ? ledBlinkState : LOW);
      digitalWrite(LED_RIGHT, turnRight ? ledBlinkState : LOW);
    }
  }
}

// --- WEBSOCKET ОБРОБНИК ---

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    data[len] = 0; // Додаємо нуль-термінатор
    
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, (char*)data);
    
    if (!error) {
      lastCmdTime = millis();

      // Читаємо швидкості (перевіряємо, чи є ключ і чи це ціле число)
      if (doc["L"].is<int>() && doc["R"].is<int>()) {
        motorSpeedL = doc["L"].as<int>();
        motorSpeedR = doc["R"].as<int>();
        setMotors(motorSpeedL, motorSpeedR);
      }
      // Читаємо світло (перевіряємо, чи це булеве значення true/false)
      if (doc["tL"].is<bool>()) turnLeft = doc["tL"].as<bool>();
      if (doc["tR"].is<bool>()) turnRight = doc["tR"].as<bool>();
      if (doc["haz"].is<bool>()) hazard = doc["haz"].as<bool>();
    }
  }
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type,
             void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("Клієнт підключився: %s\n", client->remoteIP().toString().c_str());
      break;
    case WS_EVT_DISCONNECT:
      Serial.println("Клієнт відключився. Зупиняємо мотори!");
      setMotors(0, 0); // E-STOP при втраті зв'язку
      break;
    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;
  }
}

// --- SETUP ТА LOOP ---

void setup() {
  Serial.begin(115200);

  // Ініціалізація пінів
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT); pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);
  pinMode(LED_LEFT, OUTPUT); pinMode(LED_RIGHT, OUTPUT);
  setMotors(0, 0);

  // Запуск файлової системи
  if(!LittleFS.begin(true)){
    Serial.println("Помилка монтування LittleFS");
    return;
  }

  // Піднімаємо Wi-Fi точку доступу
  WiFi.softAP(ap_ssid, ap_pass);
  Serial.print("Wi-Fi піднято! IP: ");
  Serial.println(WiFi.softAPIP());

  // Запуск mDNS
  if (!MDNS.begin("esp-car")) { // "esp-car" - це бажане ім'я
    Serial.println("Помилка запуску mDNS!");
  } else {
    Serial.println("mDNS успішно запущено!");
    Serial.println("Тепер сайт доступний за адресою: http://esp-car.local");
    
    // Опціонально: анонсуємо, що в нас тут працює веб-сервер
    MDNS.addService("http", "tcp", 80);
  }

  // Налаштування серверів
  ws.onEvent(onEvent);
  server.addHandler(&ws);

  // Роздаємо файли сайту (React збірку) з пам'яті ESP32
  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");

  // ПРО-ПОРАДА: Обробник для React Router (SPA)
  server.onNotFound([](AsyncWebServerRequest *request) {
    if (request->method() == HTTP_OPTIONS) {
      request->send(200);
    } else {
      request->send(LittleFS, "/index.html", "text/html");
    }
  });

  server.begin();
}

void loop() {
  ws.cleanupClients();

  // Запобіжник втрати зв'язку: якщо немає команд більше 1 секунди, зупиняємося
  if (millis() - lastCmdTime > 1000 && (motorSpeedL != 0 || motorSpeedR != 0)) {
    motorSpeedL = 0;
    motorSpeedR = 0;
    setMotors(0, 0);
    Serial.println("Watchdog: втрата зв'язку, зупинка!");
  }
  
  // 1. Керування світлом (неблокуюче)
  handleBlink();

  // 2. Вимірювання відстані та відправка на фронт (кожні 500 мс)
  if (millis() - lastDistanceMeasure > 500) {
    lastDistanceMeasure = millis();
    int dist = readDistance();

    // Локальна безпека: якщо перешкода занадто близько, не їдемо вперед
    if (dist < 10 && (motorSpeedL > 0 || motorSpeedR > 0)) {
      motorSpeedL = 0;
      motorSpeedR = 0;
      setMotors(0, 0);
      Serial.println("Запобіжник: перешкода надто близько!");
    }
    
    // Формуємо JSON і відправляємо всім підключеним клієнтам
    JsonDocument doc;
    doc["dist"] = dist;
    String payload;
    serializeJson(doc, payload);
    ws.textAll(payload);
  }
}