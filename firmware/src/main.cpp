#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <ESPmDNS.h>
#include <Preferences.h> // Додано для роботи з пам'яттю

// --- ПІНИ ---
const int ENA = 14; const int IN1 = 27; const int IN2 = 26;
const int ENB = 32; const int IN3 = 25; const int IN4 = 33;
const int TRIG_PIN = 13; const int ECHO_PIN = 35;
const int LED_LEFT = 18; const int LED_RIGHT = 19;

// --- СТАН СИСТЕМИ ---
int motorSpeedL = 0;
int motorSpeedR = 0;
bool turnLeft = false;
bool turnRight = false;
bool hazard = false;
unsigned long lastCmdTime = 0;

// Таймери
unsigned long lastDistanceMeasure = 0;
unsigned long lastBlinkTime = 0;
bool ledBlinkState = false;

// --- НАЛАШТУВАННЯ МЕРЕЖІ (Завантажуватимуться з пам'яті) ---
String ap_ssid = "Freenove_Car_AP";
String ap_pass = "12345678";
String sta_ssid = "";
String sta_pass = "";
bool use_sta = false;
String web_user = "admin";
String web_pass = "admin";

bool shouldReboot = false; // Прапорець для перезавантаження після збереження налаштувань

Preferences preferences;
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// --- ФУНКЦІЇ ПАМ'ЯТІ ТА ЗАЛІЗА ---

void loadSettings() {
  preferences.begin("settings", true); // true = тільки для читання
  ap_ssid = preferences.getString("ap_ssid", "Freenove_Car_AP");
  ap_pass = preferences.getString("ap_pass", "12345678");
  sta_ssid = preferences.getString("sta_ssid", "");
  sta_pass = preferences.getString("sta_pass", "");
  use_sta = preferences.getBool("use_sta", false);
  web_user = preferences.getString("username", "admin");
  web_pass = preferences.getString("userpassword", "admin");
  preferences.end();
}

void setMotors(int left, int right) {
  if (left > 0) { digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW); } 
  else if (left < 0) { digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH); } 
  else { digitalWrite(IN1, LOW); digitalWrite(IN2, LOW); }
  analogWrite(ENA, abs(left));

  if (right > 0) { digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW); } 
  else if (right < 0) { digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH); } 
  else { digitalWrite(IN3, LOW); digitalWrite(IN4, LOW); }
  analogWrite(ENB, abs(right));
}

int readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  return (duration == 0) ? 150 : (duration * 0.034 / 2);
}

void handleBlink() {
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

// --- WEBSOCKET ТА API ОБРОБНИКИ ---

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    data[len] = 0;
    JsonDocument doc;
    if (!deserializeJson(doc, (char*)data)) {
      lastCmdTime = millis();
      if (doc["L"].is<int>() && doc["R"].is<int>()) {
        motorSpeedL = doc["L"].as<int>();
        motorSpeedR = doc["R"].as<int>();
        setMotors(motorSpeedL, motorSpeedR);
      }
      if (doc["tL"].is<bool>()) turnLeft = doc["tL"].as<bool>();
      if (doc["tR"].is<bool>()) turnRight = doc["tR"].as<bool>();
      if (doc["haz"].is<bool>()) hazard = doc["haz"].as<bool>();
    }
  }
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_DISCONNECT) setMotors(0, 0);
  if (type == WS_EVT_DATA) handleWebSocketMessage(arg, data, len);
}

// --- SETUP ТА LOOP ---

void setup() {
  Serial.begin(115200);

  // 1. Ініціалізація заліза
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT); pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);
  pinMode(LED_LEFT, OUTPUT); pinMode(LED_RIGHT, OUTPUT);
  setMotors(0, 0);

  if(!LittleFS.begin(true)){
    Serial.println("Помилка LittleFS");
    return;
  }

  // 2. Завантаження налаштувань
  loadSettings();

  // 3. Розумний запуск Wi-Fi
  if (use_sta && sta_ssid != "") {
    Serial.printf("Спроба підключення до %s...\n", sta_ssid.c_str());
    WiFi.mode(WIFI_STA);
    WiFi.begin(sta_ssid.c_str(), sta_pass.c_str());
    
    unsigned long startAttempt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 10000) {
      delay(500);
      Serial.print(".");
    }
    Serial.println();
  }

  // Якщо не вдалося підключитися або STA вимкнено — піднімаємо свою AP
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Запуск режиму точки доступу (AP Mode)");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(ap_ssid.c_str(), ap_pass.c_str());
    Serial.print("IP: "); Serial.println(WiFi.softAPIP());
  } else {
    Serial.print("Успішно! IP від роутера: "); Serial.println(WiFi.localIP());
  }

  if (MDNS.begin("esp-car")) MDNS.addService("http", "tcp", 80);

  // 4. Налаштування серверів
  ws.onEvent(onEvent);
  server.addHandler(&ws);

  // GET API: Віддати налаштування на фронтенд
  server.on("/api/settings", HTTP_GET, [](AsyncWebServerRequest *request){
    JsonDocument doc;
    doc["ap_ssid"] = ap_ssid;
    doc["ap_pass"] = ap_pass;
    doc["sta_ssid"] = sta_ssid;
    doc["sta_pass"] = sta_pass;
    doc["use_sta"] = use_sta;
    doc["username"] = web_user;
    doc["userpassword"] = web_pass;
    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });

  // POST API: Отримати, зберегти налаштування і запланувати ребут
  server.on("/api/settings", HTTP_POST, [](AsyncWebServerRequest *request){
    request->send(200, "application/json", "{\"status\":\"saved_and_rebooting\"}");
    shouldReboot = true; // Плануємо перезавантаження
  }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
    if (index == 0) { // Обробляємо JSON-тіло запиту
      JsonDocument doc;
      if (!deserializeJson(doc, (char*)data)) {
        preferences.begin("settings", false); // false = для запису
        if(doc.containsKey("ap_ssid")) preferences.putString("ap_ssid", doc["ap_ssid"].as<String>());
        if(doc.containsKey("ap_pass")) preferences.putString("ap_pass", doc["ap_pass"].as<String>());
        if(doc.containsKey("sta_ssid")) preferences.putString("sta_ssid", doc["sta_ssid"].as<String>());
        if(doc.containsKey("sta_pass")) preferences.putString("sta_pass", doc["sta_pass"].as<String>());
        if(doc.containsKey("use_sta")) preferences.putBool("use_sta", doc["use_sta"].as<bool>());
        if(doc.containsKey("username")) preferences.putString("username", doc["username"].as<String>());
        if(doc.containsKey("userpassword")) preferences.putString("userpassword", doc["userpassword"].as<String>());
        preferences.end();
      }
    }
  });

  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  server.onNotFound([](AsyncWebServerRequest *request) {
    if (request->method() == HTTP_OPTIONS) request->send(200);
    else request->send(LittleFS, "/index.html", "text/html");
  });

  server.begin();
}

void loop() {
  // Якщо налаштування змінено — перезавантажуємо ESP32 для застосування Wi-Fi
  if (shouldReboot) {
    delay(1000); // Даємо час на відправку HTTP-відповіді "200 OK" на фронт
    ESP.restart();
  }

  ws.cleanupClients();

  if (millis() - lastCmdTime > 1000 && (motorSpeedL != 0 || motorSpeedR != 0)) {
    motorSpeedL = 0; motorSpeedR = 0; setMotors(0, 0);
  }
  
  handleBlink();

  if (millis() - lastDistanceMeasure > 500) {
    lastDistanceMeasure = millis();
    int dist = readDistance();

    if (dist < 10 && (motorSpeedL > 0 || motorSpeedR > 0)) {
      motorSpeedL = 0; motorSpeedR = 0; setMotors(0, 0);
    }
    
    JsonDocument doc;
    doc["dist"] = dist;
    String payload;
    serializeJson(doc, payload);
    ws.textAll(payload);
  }
}