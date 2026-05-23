#include <Arduino.h>

// Pins for left motor (Motor A)
const int ENA = 14;
const int IN1 = 27;
const int IN2 = 26;

// Pins for right motor (Motor B)
const int ENB = 32;
const int IN3 = 25;
const int IN4 = 33;

// Base PWM speed (0-255)
// 150 is usually enough to start the car's wheels on a test rig.
const int SPEED = 150; 

void setup() {
  Serial.begin(115200);

  // Configure pins as outputs
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  
  pinMode(ENB, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);

  // Ensure motors are stopped at startup
  stopMotors();

  Serial.println("System ready. Starting hardware test...");
  delay(3000); // Give time to open Serial Monitor
}

void loop() {
  // --- Test 1: Left motor only ---
  Serial.println("1. Left motor - FORWARD (expect left wheel to move)");
  analogWrite(ENA, SPEED);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  delay(2000);
  stopMotors();

  // --- Test 2: Right motor only ---
  Serial.println("2. Right motor - FORWARD (expect right wheel to move)");
  analogWrite(ENB, SPEED);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  delay(2000);
  stopMotors();

  // --- Test 3: Both motors FORWARD ---
  Serial.println("3. Both motors - FORWARD (expect both wheels to move)");
  analogWrite(ENA, SPEED);
  analogWrite(ENB, SPEED);
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH);
  digitalWrite(IN4, LOW);
  delay(2000);
  stopMotors();

  // --- Test 4: Both motors REVERSE ---
  Serial.println("4. Both motors - REVERSE (expect both wheels to reverse)");
  analogWrite(ENA, SPEED);
  analogWrite(ENB, SPEED);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, HIGH);
  delay(2000);
  stopMotors();

  Serial.println("--- Cycle complete. Repeating after 4 seconds ---");
  Serial.println();
  delay(4000);
}

// Helper function for safe stop
void stopMotors() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
  delay(1000); // Pause between tests to avoid abrupt jerks
}