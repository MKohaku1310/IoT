#include <Wire.h>
#include <BH1750.h>
#include <DHT.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include "secrets.h"

// ===== CẤU HÌNH CÁC CHÂN KẾT NỐI (ESP32) =====
#define SDA_PIN     8  // Chân I2C SDA
#define SCL_PIN     9   // Chân I2C SCL
#define DHT_PIN     10   // Chân dữ liệu DHT11
#define DHT_TYPE    DHT11

#define LED_1       0  // Đèn 1: Điều hòa (Bật tự động khi Nhiệt độ cao)
#define LED_2       2  // Đèn 2: Quạt (Bật tự động khi Độ ẩm thấp)
#define LED_3       4  // Đèn 3: Đèn chiếu sáng (Bật tự động khi Ánh sáng yếu)

// ===== NGƯỠNG ĐIỀU KHIỂN TỰ ĐỘNG (Sẽ đồng bộ từ MQTT) =====
float tempThreshold = 33.0;
float humidThreshold = 80.0;
float luxThreshold = 100.0;

// ===== KHỞI TẠO ĐỐI TƯỢNG CẢM BIẾN & KẾT NỐI =====
BH1750 lightMeter(0x23);
DHT dht(DHT_PIN, DHT_TYPE);

WiFiClient espClient;
PubSubClient client(espClient);
const char* mqtt_server = "broker.hivemq.com";

// ===== CÁC BIẾN TRẠNG THÁI HỆ THỐNG =====
bool autoMode1 = true;       // Chế độ tự động LED 1
bool autoMode2 = true;       // Chế độ tự động LED 2
bool autoMode3 = true;       // Chế độ tự động LED 3

int lastLed1State = -1;
int lastLed2State = -1;
int lastLed3State = -1;

bool lastAutoMode1State = true;
bool lastAutoMode2State = true;
bool lastAutoMode3State = true;

unsigned long lastRead = 0;
const unsigned long READ_INTERVAL = 2000; // Đọc cảm biến và gửi dữ liệu mỗi 2 giây

// ===== HÀM KẾT NỐI WIFI =====
void setup_wifi() {
  delay(10);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);

  Serial.println();
  Serial.print("Dang ket noi den Wi-Fi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);

  int count = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    count++;
    
    if (count % 20 == 0) {
      Serial.println();
      Serial.print("Trang thai WiFi hien tai: ");
      wl_status_t status = WiFi.status();
      if (status == WL_NO_SSID_AVAIL) {
        Serial.println("KHONG TIM THAY SSID!");
      } else if (status == WL_CONNECT_FAILED) {
        Serial.println("KET NOI THAT BAI!");
      } else {
        Serial.print("Code trang thai: ");
        Serial.println(status);
      }
      Serial.print("Dang thu ket noi lai");
    }
  }
  Serial.println("\nDa ket noi WiFi!");
  Serial.print("Dia chi IP: ");
  Serial.println(WiFi.localIP());
}

// ===== HÀM NHẬN LỆNH ĐIỀU KHIỂN TỪ MQTT =====
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.print("Nhan duoc tin nhan tu [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);

  // --- Điều khiển LED 1 (Điều hòa) ---
  if (String(topic) == "shinya/automode") {
    autoMode1 = (message == "ON");
    Serial.print("Che do tu dong LED 1: ");
    Serial.println(autoMode1 ? "BAT" : "TAT");
    client.publish("shinya/automode/state", message.c_str());
  } 
  else if (String(topic) == "shinya/led") {
    if (!autoMode1) { // Chỉ cho phép điều khiển tay khi Tự động TẮT
      if (message == "ON") {
        digitalWrite(LED_1, HIGH);
        Serial.println("Dieu khien tay: BAT LED 1");
        client.publish("shinya/led/state", "ON");
      } else if (message == "OFF") {
        digitalWrite(LED_1, LOW);
        Serial.println("Dieu khien tay: TAT LED 1");
        client.publish("shinya/led/state", "OFF");
      }
    }
  }

  // --- Điều khiển LED 2 (Quạt) ---
  else if (String(topic) == "shinya/automode2") {
    autoMode2 = (message == "ON");
    Serial.print("Che do tu dong LED 2: ");
    Serial.println(autoMode2 ? "BAT" : "TAT");
    client.publish("shinya/automode2/state", message.c_str());
  } 
  else if (String(topic) == "shinya/led2") {
    if (!autoMode2) {
      if (message == "ON") {
        digitalWrite(LED_2, HIGH);
        Serial.println("Dieu khien tay: BAT LED 2");
        client.publish("shinya/led2/state", "ON");
      } else if (message == "OFF") {
        digitalWrite(LED_2, LOW);
        Serial.println("Dieu khien tay: TAT LED 2");
        client.publish("shinya/led2/state", "OFF");
      }
    }
  }

  // --- Điều khiển LED 3 (Đèn) ---
  else if (String(topic) == "shinya/automode3") {
    autoMode3 = (message == "ON");
    Serial.print("Che do tu dong LED 3: ");
    Serial.println(autoMode3 ? "BAT" : "TAT");
    client.publish("shinya/automode3/state", message.c_str());
  } 
  else if (String(topic) == "shinya/led3") {
    if (!autoMode3) {
      if (message == "ON") {
        digitalWrite(LED_3, HIGH);
        Serial.println("Dieu khien tay: BAT LED 3");
        client.publish("shinya/led3/state", "ON");
      } else if (message == "OFF") {
        digitalWrite(LED_3, LOW);
        Serial.println("Dieu khien tay: TAT LED 3");
        client.publish("shinya/led3/state", "OFF");
      }
    }
  }

  // --- Đồng bộ các ngưỡng tự động hóa ---
  else if (String(topic) == "shinya/threshold/temp") {
    tempThreshold = message.toFloat();
    Serial.print("Nhan nguong nhiet do moi: ");
    Serial.println(tempThreshold);
  }
  else if (String(topic) == "shinya/threshold/hum") {
    humidThreshold = message.toFloat();
    Serial.print("Nhan nguong do am moi: ");
    Serial.println(humidThreshold);
  }
  else if (String(topic) == "shinya/threshold/lux") {
    luxThreshold = message.toFloat();
    Serial.print("Nhan nguong anh sang moi: ");
    Serial.println(luxThreshold);
  }
}

// ===== HÀM KẾT NỐI LẠI MQTT BROKER =====
void reconnect() {
  while (!client.connected()) {
    Serial.print("Dang ket noi MQTT...");
    uint64_t chipMac = ESP.getEfuseMac();
    String clientId = "ESP32Client-" + String((uint32_t)chipMac, HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println("OK!");

      // Đăng ký nhận tin nhắn từ các topic điều khiển
      client.subscribe("shinya/led");
      client.subscribe("shinya/automode");
      client.subscribe("shinya/led2");
      client.subscribe("shinya/automode2");
      client.subscribe("shinya/led3");
      client.subscribe("shinya/automode3");
      
      // Đăng ký nhận ngưỡng tự động hóa từ MQTT
      client.subscribe("shinya/threshold/temp");
      client.subscribe("shinya/threshold/hum");
      client.subscribe("shinya/threshold/lux");
      
      lastLed1State = -1;
      lastLed2State = -1;
      lastLed3State = -1;
      lastAutoMode1State = !autoMode1; 
      lastAutoMode2State = !autoMode2;
      lastAutoMode3State = !autoMode3;
    } else {
      Serial.print("Loi, code=");
      Serial.print(client.state());
      Serial.println(" thu lai sau 2 giay...");
      delay(2000);
    }
  }
}

// ===== CẤU HÌNH BAN ĐẦU =====
void setup() {
  Serial.begin(115200);

  pinMode(LED_1, OUTPUT);
  pinMode(LED_2, OUTPUT);
  pinMode(LED_3, OUTPUT);
  digitalWrite(LED_1, LOW);
  digitalWrite(LED_2, LOW);
  digitalWrite(LED_3, LOW);

  Wire.begin(SDA_PIN, SCL_PIN);

  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("BH1750 khoi tao thanh cong!");
  } else {
    Serial.println("Loi: Khong tim thay cam bien BH1750!");
  }

  dht.begin();

  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  Serial.println("He thong nha thong minh da san sang hoat dong!");
}

// ===== VÒNG LẶP CHÍNH =====
void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  if (millis() - lastRead >= READ_INTERVAL) {
    lastRead = millis();

    // ----- ĐỌC DỮ LIỆU CẢM BIẾN -----
    float lux = lightMeter.readLightLevel();
    float temp = dht.readTemperature();
    float humid = dht.readHumidity();

    // ----- KIỂM TRA & GỬI DỮ LIỆU NHIỆT ĐỘ - ĐỘ ẨM -----
    if (isnan(temp) || isnan(humid)) {
      Serial.println("Loi doc du lieu tu DHT11!");
    } else {
      Serial.print("Nhiet do: ");
      Serial.print(temp);
      Serial.print(" C | Do am: ");
      Serial.print(humid);
      Serial.println(" %");

      client.publish("shinya/temp", String(temp, 1).c_str());
      client.publish("shinya/hum", String(humid, 1).c_str());
    }

    // ----- KIỂM TRA & GỬI DỮ LIỆU ÁNH SÁNG -----
    if (isnan(lux) || lux < 0) {
      Serial.println("Loi doc du lieu tu BH1750!");
    } else {
      Serial.print("Anh sang: ");
      Serial.print(lux);
      Serial.println(" lx");

      client.publish("shinya/lux", String(lux, 1).c_str());
    }

    // ----- LOGIC ĐIỀU KHIỂN & ĐỒNG BỘ TRẠNG THÁI -----

    // 1. LED 1 (Điều hòa - Tự động bật khi nhiệt độ cao)
    if (autoMode1) {
      if (!isnan(temp) && temp > tempThreshold) {
        digitalWrite(LED_1, HIGH);
      } else {
        digitalWrite(LED_1, LOW);
      }
    }
    
    int currentLed1State = digitalRead(LED_1);
    if (currentLed1State != lastLed1State) {
      client.publish("shinya/led/state", currentLed1State == HIGH ? "ON" : "OFF");
      lastLed1State = currentLed1State;
    }
    if (autoMode1 != lastAutoMode1State) {
      client.publish("shinya/automode/state", autoMode1 ? "ON" : "OFF");
      lastAutoMode1State = autoMode1;
    }

    // 2. LED 2 (Quạt - Tự động bật khi độ ẩm cao)
    if (autoMode2) {
      if (!isnan(humid) && humid > humidThreshold) {
        digitalWrite(LED_2, HIGH);
      } else {
        digitalWrite(LED_2, LOW);
      }
    }

    int currentLed2State = digitalRead(LED_2);
    if (currentLed2State != lastLed2State) {
      client.publish("shinya/led2/state", currentLed2State == HIGH ? "ON" : "OFF");
      lastLed2State = currentLed2State;
    }
    if (autoMode2 != lastAutoMode2State) {
      client.publish("shinya/automode2/state", autoMode2 ? "ON" : "OFF");
      lastAutoMode2State = autoMode2;
    }

    // 3. LED 3 (Đèn - Tự động bật khi tối)
    if (autoMode3) {
      if (lux >= 0 && lux < luxThreshold) {
        digitalWrite(LED_3, HIGH);
      } else {
        digitalWrite(LED_3, LOW);
      }
    }

    int currentLed3State = digitalRead(LED_3);
    if (currentLed3State != lastLed3State) {
      client.publish("shinya/led3/state", currentLed3State == HIGH ? "ON" : "OFF");
      lastLed3State = currentLed3State;
    }
    if (autoMode3 != lastAutoMode3State) {
      client.publish("shinya/automode3/state", autoMode3 ? "ON" : "OFF");
      lastAutoMode3State = autoMode3;
    }

    Serial.println("-------------------------");
  }
}
