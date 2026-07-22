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
#define LED_2       2  // Đèn 2: Quạt (Bật tự động khi Độ ẩm cao)
#define LED_3       4  // Đèn 3: Đèn chiếu sáng (Bật tự động khi Ánh sáng yếu)

// ===== NGƯỠNG ĐIỀU KHIỂN TỰ ĐỘNG (Sẽ đồng bộ từ MQTT) =====
float tempThreshold = DEFAULT_TEMP_THRESHOLD;
float humidThreshold = DEFAULT_HUMID_THRESHOLD;
float luxThreshold = DEFAULT_LUX_THRESHOLD;

// ===== KHỞI TẠO ĐỐI TƯỢNG CẢM BIẾN & KẾT NỐI =====
BH1750 lightMeter(0x23);
DHT dht(DHT_PIN, DHT_TYPE);

WiFiClient espClient;
PubSubClient client(espClient);
const char* mqtt_server = "broker.hivemq.com";

// ===== CÁC BIẾN TRẠNG THÁI HỆ THỐNG =====
String nodeId = "";          // ID node dựa trên MAC address (tự động lấy trong setup)
bool autoMode1 = false;      // Chế độ tự động LED 1 (mặc định tắt, đồng bộ từ DB)
bool autoMode2 = false;      // Chế độ tự động LED 2 (mặc định tắt, đồng bộ từ DB)
bool autoMode3 = false;      // Chế độ tự động LED 3 (mặc định tắt, đồng bộ từ DB)

// Cờ báo hiệu điều khiển thủ công từ backend — khi true, auto-mode không được override
bool manualOverride1 = false;
bool manualOverride2 = false;
bool manualOverride3 = false;

int lastLed1State = -1;
int lastLed2State = -1;
int lastLed3State = -1;

bool lastAutoMode1State = true;
bool lastAutoMode2State = true;
bool lastAutoMode3State = true;

unsigned long lastRead = 0;
const unsigned long READ_INTERVAL = 20000; // Đọc cảm biến và gửi dữ liệu mỗi 20 giây

// ===== HÀM LẤY MAC ADDRESS LÀM NODE ID =====
void setup_node_id() {
  uint64_t chipMac = ESP.getEfuseMac();
  // Lấy 6 byte cuối của MAC và format thành string
  char macStr[18];
  snprintf(macStr, 18, "%02X:%02X:%02X:%02X:%02X:%02X",
    (uint8_t)(chipMac >> 40), (uint8_t)(chipMac >> 32),
    (uint8_t)(chipMac >> 24), (uint8_t)(chipMac >> 16),
    (uint8_t)(chipMac >> 8), (uint8_t)(chipMac));
  nodeId = String(macStr);
  Serial.print("Node ID (MAC): ");
  Serial.println(nodeId);
}

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
  const int MAX_WIFI_ATTEMPTS = 40; // 20 giây timeout
  while (WiFi.status() != WL_CONNECTED && count < MAX_WIFI_ATTEMPTS) {
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
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi ket noi that bai sau 20s, se thu lai trong loop!");
  } else {
    Serial.println("\nDa ket noi WiFi!");
    Serial.print("Dia chi IP: ");
    Serial.println(WiFi.localIP());
  }
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
  if (String(topic) == "buivansang_iot_pj/" + nodeId + "/automode1") {
    autoMode1 = (message == "ON");
    manualOverride1 = false; // Reset override khi đổi chế độ
    Serial.print("Che do tu dong LED 1: ");
    Serial.println(autoMode1 ? "BAT" : "TAT");

    // Nếu vừa bật chế độ tự động, lập tức kiểm tra nhiệt độ và cập nhật LED 1 ngay
    if (autoMode1) {
      float temp = dht.readTemperature();
      if (!isnan(temp)) {
        digitalWrite(LED_1, temp >= tempThreshold ? HIGH : LOW);
      }
    }

    String autoModeTopic = "buivansang_iot_pj/" + nodeId + "/automode1/state";
    client.publish(autoModeTopic.c_str(), message.c_str());

    // Gửi state LED thực tế SAU KHI đã cập nhật theo auto mode
    int currentLed1State = digitalRead(LED_1);
    String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led1/state";
    client.publish(ledStateTopic.c_str(), currentLed1State == HIGH ? "ON" : "OFF");
    lastLed1State = currentLed1State;
  } 
  else if (String(topic) == "buivansang_iot_pj/" + nodeId + "/led1") {
    // Điều khiển thủ công từ backend — tắt auto-mode override trong chu kỳ hiện tại
    manualOverride1 = true;
    if (message == "ON") {
      digitalWrite(LED_1, HIGH);
      Serial.println("Dieu khien tu backend: BAT LED 1");
      String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led1/state";
      client.publish(ledStateTopic.c_str(), "ON");
    } else if (message == "OFF") {
      digitalWrite(LED_1, LOW);
      Serial.println("Dieu khien tu backend: TAT LED 1");
      String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led1/state";
      client.publish(ledStateTopic.c_str(), "OFF");
    }
  }

  // --- Điều khiển LED 2 (Quạt) ---
  else if (String(topic) == "buivansang_iot_pj/" + nodeId + "/automode2") {
    autoMode2 = (message == "ON");
    manualOverride2 = false; // Reset override khi đổi chế độ
    Serial.print("Che do tu dong LED 2: ");
    Serial.println(autoMode2 ? "BAT" : "TAT");

    // Nếu vừa bật chế độ tự động, lập tức kiểm tra độ ẩm và cập nhật LED 2 ngay
    if (autoMode2) {
      float humid = dht.readHumidity();
      if (!isnan(humid)) {
        digitalWrite(LED_2, humid >= humidThreshold ? HIGH : LOW);
      }
    }

    String autoModeTopic = "buivansang_iot_pj/" + nodeId + "/automode2/state";
    client.publish(autoModeTopic.c_str(), message.c_str());

    // Gửi state LED thực tế SAU KHI đã cập nhật theo auto mode
    int currentLed2State = digitalRead(LED_2);
    String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led2/state";
    client.publish(ledStateTopic.c_str(), currentLed2State == HIGH ? "ON" : "OFF");
    lastLed2State = currentLed2State;
  } 
  else if (String(topic) == "buivansang_iot_pj/" + nodeId + "/led2") {
    // Điều khiển thủ công từ backend — tắt auto-mode override trong chu kỳ hiện tại
    manualOverride2 = true;
    if (message == "ON") {
      digitalWrite(LED_2, HIGH);
      Serial.println("Dieu khien tu backend: BAT LED 2");
      String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led2/state";
      client.publish(ledStateTopic.c_str(), "ON");
    } else if (message == "OFF") {
      digitalWrite(LED_2, LOW);
      Serial.println("Dieu khien tu backend: TAT LED 2");
      String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led2/state";
      client.publish(ledStateTopic.c_str(), "OFF");
    }
  }

  // --- Điều khiển LED 3 (Đèn) ---
  else if (String(topic) == "buivansang_iot_pj/" + nodeId + "/automode3") {
    autoMode3 = (message == "ON");
    manualOverride3 = false; // Reset override khi đổi chế độ
    Serial.print("Che do tu dong LED 3: ");
    Serial.println(autoMode3 ? "BAT" : "TAT");

    // Nếu vừa bật chế độ tự động, lập tức kiểm tra ánh sáng và cập nhật LED 3 ngay
    if (autoMode3) {
      float lux = lightMeter.readLightLevel();
      if (lux >= 0) {
        digitalWrite(LED_3, lux < luxThreshold ? HIGH : LOW);
      }
    }

    String autoModeTopic = "buivansang_iot_pj/" + nodeId + "/automode3/state";
    client.publish(autoModeTopic.c_str(), message.c_str());

    // Gửi state LED thực tế SAU KHI đã cập nhật theo auto mode
    int currentLed3State = digitalRead(LED_3);
    String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led3/state";
    client.publish(ledStateTopic.c_str(), currentLed3State == HIGH ? "ON" : "OFF");
    lastLed3State = currentLed3State;
  } 
  else if (String(topic) == "buivansang_iot_pj/" + nodeId + "/led3") {
    // Điều khiển thủ công từ backend — tắt auto-mode override trong chu kỳ hiện tại
    manualOverride3 = true;
    if (message == "ON") {
      digitalWrite(LED_3, HIGH);
      Serial.println("Dieu khien tu backend: BAT LED 3");
      String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led3/state";
      client.publish(ledStateTopic.c_str(), "ON");
    } else if (message == "OFF") {
      digitalWrite(LED_3, LOW);
      Serial.println("Dieu khien tu backend: TAT LED 3");
      String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led3/state";
      client.publish(ledStateTopic.c_str(), "OFF");
    }
  }

  // --- Đồng bộ các ngưỡng tự động hóa ---
  else if (String(topic) == "buivansang_iot_pj/threshold/temp") {
    float val = message.toFloat();
    if (val > 0 && val <= 60) {
      tempThreshold = val;
      Serial.print("Nhan nguong nhiet do moi: ");
      Serial.println(tempThreshold);
      if (autoMode1) {
        float temp = dht.readTemperature();
        if (!isnan(temp)) {
          digitalWrite(LED_1, temp >= tempThreshold ? HIGH : LOW);
          int currentLed1State = digitalRead(LED_1);
          if (currentLed1State != lastLed1State) {
            String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led1/state";
            client.publish(ledStateTopic.c_str(), currentLed1State == HIGH ? "ON" : "OFF");
            lastLed1State = currentLed1State;
          }
        }
      }
    }
  }
  else if (String(topic) == "buivansang_iot_pj/threshold/hum") {
    float val = message.toFloat();
    if (val > 0 && val <= 100) {
      humidThreshold = val;
      Serial.print("Nhan nguong do am moi: ");
      Serial.println(humidThreshold);
      if (autoMode2) {
        float humid = dht.readHumidity();
        if (!isnan(humid)) {
          digitalWrite(LED_2, humid >= humidThreshold ? HIGH : LOW);
          int currentLed2State = digitalRead(LED_2);
          if (currentLed2State != lastLed2State) {
            String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led2/state";
            client.publish(ledStateTopic.c_str(), currentLed2State == HIGH ? "ON" : "OFF");
            lastLed2State = currentLed2State;
          }
        }
      }
    }
  }
  else if (String(topic) == "buivansang_iot_pj/threshold/lux") {
    float val = message.toFloat();
    if (val >= 0 && val <= 10000) {
      luxThreshold = val;
      Serial.print("Nhan nguong anh sang moi: ");
      Serial.println(luxThreshold);
      if (autoMode3) {
        float lux = lightMeter.readLightLevel();
        if (lux >= 0) {
          digitalWrite(LED_3, lux < luxThreshold ? HIGH : LOW);
          int currentLed3State = digitalRead(LED_3);
          if (currentLed3State != lastLed3State) {
            String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led3/state";
            client.publish(ledStateTopic.c_str(), currentLed3State == HIGH ? "ON" : "OFF");
            lastLed3State = currentLed3State;
          }
        }
      }
    }
  }
}

// ===== HÀM KẾT NỐI LẠI MQTT BROKER =====
void reconnect() {
  int attempts = 0;
  const int MAX_MQTT_ATTEMPTS = 10;
  while (!client.connected() && attempts < MAX_MQTT_ATTEMPTS) {
    Serial.print("Dang ket noi MQTT...");
    uint64_t chipMac = ESP.getEfuseMac();
    String clientId = "ESP32Client-" + String((uint32_t)chipMac, HEX);

    if (client.connect(clientId.c_str())) {
      Serial.println("OK!");

      // Đăng ký nhận tin nhắn từ các topic điều khiển (với nodeId)
      String led1Topic = "buivansang_iot_pj/" + nodeId + "/led1";
      String autoMode1Topic = "buivansang_iot_pj/" + nodeId + "/automode1";
      String led2Topic = "buivansang_iot_pj/" + nodeId + "/led2";
      String autoMode2Topic = "buivansang_iot_pj/" + nodeId + "/automode2";
      String led3Topic = "buivansang_iot_pj/" + nodeId + "/led3";
      String autoMode3Topic = "buivansang_iot_pj/" + nodeId + "/automode3";
      
      client.subscribe(led1Topic.c_str());
      client.subscribe(autoMode1Topic.c_str());
      client.subscribe(led2Topic.c_str());
      client.subscribe(autoMode2Topic.c_str());
      client.subscribe(led3Topic.c_str());
      client.subscribe(autoMode3Topic.c_str());
      
      // Đăng ký nhận ngưỡng tự động hóa từ MQTT
      client.subscribe("buivansang_iot_pj/threshold/temp");
      client.subscribe("buivansang_iot_pj/threshold/hum");
      client.subscribe("buivansang_iot_pj/threshold/lux");
      
      lastLed1State = -1;
      lastLed2State = -1;
      lastLed3State = -1;
      lastAutoMode1State = !autoMode1; 
      lastAutoMode2State = !autoMode2;
      lastAutoMode3State = !autoMode3;
      return;
    } else {
      Serial.print("Loi, code=");
      Serial.print(client.state());
      Serial.println(" thu lai sau 2 giay...");
      delay(2000);
      attempts++;
    }
  }
  if (!client.connected()) {
    Serial.println("MQTT ket noi that bai sau 10 lan, se thu lai o chu ky sau.");
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

  setup_node_id();  // Lấy MAC address làm nodeId
  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  Serial.println("He thong nha thong minh da san sang hoat dong!");
}

// ===== VÒNG LẶP CHÍNH =====
void loop() {
  // Kiểm tra WiFi trước, nếu mất thì kết nối lại
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi mat ket noi, dang ket noi lai...");
    setup_wifi();
    return; // Bỏ qua chu kỳ này, chờ WiFi kết nối
  }

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

      String tempTopic = "buivansang_iot_pj/" + nodeId + "/temp";
      String humTopic = "buivansang_iot_pj/" + nodeId + "/hum";
      client.publish(tempTopic.c_str(), String(temp, 1).c_str());
      client.publish(humTopic.c_str(), String(humid, 1).c_str());
    }

    // ----- KIỂM TRA & GỬI DỮ LIỆU ÁNH SÁNG -----
    if (lux < 0) {
      Serial.println("Loi doc du lieu tu BH1750!");
    } else {
      Serial.print("Anh sang: ");
      Serial.print(lux);
      Serial.println(" lx");

      String luxTopic = "buivansang_iot_pj/" + nodeId + "/lux";
      client.publish(luxTopic.c_str(), String(lux, 1).c_str());
    }

    // ----- GỬI HEARTBEAT VỚI NODE ID (MAC ADDRESS) -----
    unsigned long uptimeSeconds = millis() / 1000;
    String heartbeatTopic = "buivansang_iot_pj/" + nodeId + "/heartbeat";
    String payload = "{\"uptime\":" + String(uptimeSeconds) + ",\"rssi\":" + String(WiFi.RSSI()) + "}";
    client.publish(heartbeatTopic.c_str(), payload.c_str(), true);

    // ----- LOGIC ĐIỀU KHIỂN & ĐỒNG BỘ TRẠNG THÁI -----

    // 1. LED 1 (Điều hòa - Tự động bật khi nhiệt độ cao)
    bool led1ChangedByAuto = false;
    if (autoMode1 && !manualOverride1) {
      if (!isnan(temp) && temp >= tempThreshold) {
        digitalWrite(LED_1, HIGH);
        led1ChangedByAuto = true;
      } else {
        digitalWrite(LED_1, LOW);
        led1ChangedByAuto = true;
      }
    }
    // Khi ở chế độ thủ công (autoMode1 = false), không làm gì - giữ nguyên trạng thái LED hiện tại

    int currentLed1State = digitalRead(LED_1);
    // Luôn gửi state khi LED thay đổi để frontend biết trạng thái thực tế
    if (currentLed1State != lastLed1State) {
      String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led1/state";
      client.publish(ledStateTopic.c_str(), currentLed1State == HIGH ? "ON" : "OFF");
      lastLed1State = currentLed1State;
    }
    if (autoMode1 != lastAutoMode1State) {
      String autoModeTopic = "buivansang_iot_pj/" + nodeId + "/automode1/state";
      client.publish(autoModeTopic.c_str(), autoMode1 ? "ON" : "OFF");
      lastAutoMode1State = autoMode1;
    }

    // 2. LED 2 (Quạt - Tự động bật khi độ ẩm cao)
    bool led2ChangedByAuto = false;
    if (autoMode2 && !manualOverride2) {
      if (!isnan(humid) && humid >= humidThreshold) {
        digitalWrite(LED_2, HIGH);
        led2ChangedByAuto = true;
      } else {
        digitalWrite(LED_2, LOW);
        led2ChangedByAuto = true;
      }
    }
    // Khi ở chế độ thủ công (autoMode2 = false), không làm gì - giữ nguyên trạng thái LED hiện tại

    int currentLed2State = digitalRead(LED_2);
    // Luôn gửi state khi LED thay đổi để frontend biết trạng thái thực tế
    if (currentLed2State != lastLed2State) {
      String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led2/state";
      client.publish(ledStateTopic.c_str(), currentLed2State == HIGH ? "ON" : "OFF");
      lastLed2State = currentLed2State;
    }
    if (autoMode2 != lastAutoMode2State) {
      String autoModeTopic = "buivansang_iot_pj/" + nodeId + "/automode2/state";
      client.publish(autoModeTopic.c_str(), autoMode2 ? "ON" : "OFF");
      lastAutoMode2State = autoMode2;
    }

    // 3. LED 3 (Đèn - Tự động bật khi tối)
    bool led3ChangedByAuto = false;
    if (autoMode3 && !manualOverride3) {
      if (lux >= 0 && lux < luxThreshold) {
        digitalWrite(LED_3, HIGH);
        led3ChangedByAuto = true;
      } else {
        digitalWrite(LED_3, LOW);
        led3ChangedByAuto = true;
      }
    }
    // Khi ở chế độ thủ công (autoMode3 = false), không làm gì - giữ nguyên trạng thái LED hiện tại

    int currentLed3State = digitalRead(LED_3);
    // Luôn gửi state khi LED thay đổi để frontend biết trạng thái thực tế
    if (currentLed3State != lastLed3State) {
      String ledStateTopic = "buivansang_iot_pj/" + nodeId + "/led3/state";
      client.publish(ledStateTopic.c_str(), currentLed3State == HIGH ? "ON" : "OFF");
      lastLed3State = currentLed3State;
    }
    if (autoMode3 != lastAutoMode3State) {
      String autoModeTopic = "buivansang_iot_pj/" + nodeId + "/automode3/state";
      client.publish(autoModeTopic.c_str(), autoMode3 ? "ON" : "OFF");
      lastAutoMode3State = autoMode3;
    }

    Serial.println("-------------------------");
  }
}
