#ifndef SECRETS_H
#define SECRETS_H
// Điền thông tin Wi-Fi của bạn ở đây
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Ngưỡng mặc định (có thể thay đổi từ MQTT)
#define DEFAULT_TEMP_THRESHOLD  30.0
#define DEFAULT_HUMID_THRESHOLD 75.0
#define DEFAULT_LUX_THRESHOLD   200.0
#endif