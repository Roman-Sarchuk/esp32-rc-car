#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <ESPmDNS.h>
#include <Preferences.h>

// Pins
const int ENA = 14; const int IN1 = 27; const int IN2 = 26;
const int ENB = 32; const int IN3 = 25; const int IN4 = 33;
const int TRIG_PIN = 13; const int ECHO_PIN = 35;
const int LED_LEFT = 18; const int LED_RIGHT = 19;
const int LED_STOP = 21;

// State
int motorSpeedL = 0; int motorSpeedR = 0;
int targetSpeedL = 0; int targetSpeedR = 0;
int currentSpeedL = 0; int currentSpeedR = 0;
bool turnLeft = false; bool turnRight = false; bool hazard = false;
bool isBlocked = false;
unsigned long lastCmdTime = 0;
unsigned long lastDistanceMeasure = 0;
unsigned long lastBlinkTime = 0;
bool ledBlinkState = false;
bool shouldReboot = false;

String ap_ssid, ap_pass, sta_ssid, sta_pass, web_user, web_pass;
bool use_sta;

Preferences preferences;
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
String postBody = ""; // Buffer for accumulating JSON settings

void loadSettings() {
  preferences.begin("settings", true);
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
  // Left
  if (left > 0) { digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW); }
  else if (left < 0) { digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH); }
  else { digitalWrite(IN1, LOW); digitalWrite(IN2, LOW); }
  analogWrite(ENA, abs(left));

  // Right
  if (right > 0) { digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW); }
  else if (right < 0) { digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH); }
  else { digitalWrite(IN3, LOW); digitalWrite(IN4, LOW); }
  analogWrite(ENB, abs(right));

  if (left == 0 && right == 0) {
    digitalWrite(LED_STOP, HIGH); 
  } else {
    digitalWrite(LED_STOP, LOW);  
  }
}

int readDistance() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  return (duration == 0) ? 150 : (duration * 0.034 / 2);
}

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, data, len);
    if (!error) {
      lastCmdTime = millis(); // Оновлюємо Watchdog
      
      if (doc.containsKey("L") && doc.containsKey("R")) {
        targetSpeedL = doc["L"].as<int>();
        targetSpeedR = doc["R"].as<int>();
      }
      if (doc.containsKey("tL")) turnLeft = doc["tL"].as<bool>();
      if (doc.containsKey("tR")) turnRight = doc["tR"].as<bool>();
      if (doc.containsKey("haz")) hazard = doc["haz"].as<bool>();
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(ENB, OUTPUT); pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);
  pinMode(LED_LEFT, OUTPUT); pinMode(LED_RIGHT, OUTPUT);
  pinMode(LED_STOP, OUTPUT);
  digitalWrite(LED_STOP, LOW);
  
  loadSettings();
  LittleFS.begin(true);

  // Setup CORS (so the browser doesn't block the API)
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "content-type");

  if (use_sta && sta_ssid != "") {
    WiFi.begin(sta_ssid.c_str(), sta_pass.c_str());
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) { delay(500); }
  }
  if (WiFi.status() != WL_CONNECTED) WiFi.softAP(ap_ssid.c_str(), ap_pass.c_str());
  
  MDNS.begin("esp-car");

  ws.onEvent([](AsyncWebSocket *s, AsyncWebSocketClient *c, AwsEventType t, void *arg, uint8_t *d, size_t l) {
    if (t == WS_EVT_DATA) handleWebSocketMessage(arg, d, l);
    if (t == WS_EVT_DISCONNECT) {
      targetSpeedL = 0;
      targetSpeedR = 0;
      currentSpeedL = 0;
      currentSpeedR = 0;
      motorSpeedL = 0;
      motorSpeedR = 0;
      setMotors(0, 0);
    }
  });
  server.addHandler(&ws);

  // API: Read settings
  server.on("/api/settings", HTTP_GET, [](AsyncWebServerRequest *request){
    JsonDocument doc;
    doc["ap_ssid"] = ap_ssid; doc["ap_pass"] = ap_pass;
    doc["sta_ssid"] = sta_ssid; doc["sta_pass"] = sta_pass;
    doc["use_sta"] = use_sta; doc["username"] = web_user; doc["userpassword"] = web_pass;
    String res; serializeJson(doc, res);
    request->send(200, "application/json", res);
  });

  // API: Save settings (fixed body handling)
  server.on("/api/settings", HTTP_POST, [](AsyncWebServerRequest *request){
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, postBody);
    postBody = ""; // Очищаємо буфер після читання
    
    if (!error) {
      preferences.begin("settings", false);
      if(doc.containsKey("ap_ssid")) preferences.putString("ap_ssid", doc["ap_ssid"].as<String>());
      if(doc.containsKey("ap_pass")) preferences.putString("ap_pass", doc["ap_pass"].as<String>());
      if(doc.containsKey("sta_ssid")) preferences.putString("sta_ssid", doc["sta_ssid"].as<String>());
      if(doc.containsKey("sta_pass")) preferences.putString("sta_pass", doc["sta_pass"].as<String>());
      if(doc.containsKey("use_sta")) preferences.putBool("use_sta", doc["use_sta"].as<bool>());
      if(doc.containsKey("username")) preferences.putString("username", doc["username"].as<String>());
      if(doc.containsKey("userpassword")) preferences.putString("userpassword", doc["userpassword"].as<String>());
      preferences.end();
      
      request->send(200, "application/json", "{\"status\":\"ok\"}");
      shouldReboot = true;
    } else {
      request->send(400, "text/plain", "Bad Request");
    }
  }, NULL, [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total){
    if (index == 0) postBody = "";
    for(size_t i = 0; i < len; i++) postBody += (char)data[i];
  });

  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  server.onNotFound([](AsyncWebServerRequest *r){ r->send(LittleFS, "/index.html"); });
  server.begin();
}

void loop() {
  if (shouldReboot) { delay(1000); ESP.restart(); }
  ws.cleanupClients();

  if (millis() - lastDistanceMeasure > 100) {
    lastDistanceMeasure = millis();
    int dist = readDistance();
    ws.textAll("{\"dist\":" + String(dist) + "}");

    if (dist > 0 && dist < 12) {
      isBlocked = true;
    } else {
      isBlocked = false;
    }
  }

  int applyL = targetSpeedL;
  int applyR = targetSpeedR;

  if (millis() - lastCmdTime > 1000) {
    applyL = 0;
    applyR = 0;
  }

  if (isBlocked) {
    if (applyL > 0) applyL = 0;
    if (applyR > 0) applyR = 0;
  }

  if (currentSpeedL != applyL || currentSpeedR != applyR) {
    setMotors(applyL, applyR);
    currentSpeedL = applyL;
    currentSpeedR = applyR;
    motorSpeedL = applyL;
    motorSpeedR = applyR;
  }

  // LED blinking
  if (millis() - lastBlinkTime > 400) {
    lastBlinkTime = millis(); ledBlinkState = !ledBlinkState;
    digitalWrite(LED_LEFT, (hazard || turnLeft) ? ledBlinkState : LOW);
    digitalWrite(LED_RIGHT, (hazard || turnRight) ? ledBlinkState : LOW);
  }
}