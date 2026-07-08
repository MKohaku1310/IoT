require('dotenv').config();
const logger = require('../utils/logger');

// Kiểm tra các biến môi trường bắt buộc
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  logger.error('Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong file .env');
  process.exit(1);
}

// Cấu hình MQTT Broker
const mqttBrokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://broker.hivemq.com';
const mqttPort = parseInt(process.env.MQTT_PORT || '1883', 10);

// Tiền tố topic riêng tư để tránh trùng lặp kênh truyền
const TOPIC_PREFIX = 'buivansang_iot_pj';

const TOPICS = {
  // Telemetry (ESP32 -> Broker)
  TEMP: `${TOPIC_PREFIX}/temp`,
  HUM: `${TOPIC_PREFIX}/hum`,
  LUX: `${TOPIC_PREFIX}/lux`,
  
  // States (ESP32 -> Broker)
  LED1_STATE: `${TOPIC_PREFIX}/led/state`,
  LED2_STATE: `${TOPIC_PREFIX}/led2/state`,
  LED3_STATE: `${TOPIC_PREFIX}/led3/state`,
  AUTO1_STATE: `${TOPIC_PREFIX}/automode/state`,
  AUTO2_STATE: `${TOPIC_PREFIX}/automode2/state`,
  AUTO3_STATE: `${TOPIC_PREFIX}/automode3/state`,
  
  // Controls (Broker -> ESP32)
  LED1_CTRL: `${TOPIC_PREFIX}/led`,
  LED2_CTRL: `${TOPIC_PREFIX}/led2`,
  LED3_CTRL: `${TOPIC_PREFIX}/led3`,
  AUTO1_CTRL: `${TOPIC_PREFIX}/automode`,
  AUTO2_CTRL: `${TOPIC_PREFIX}/automode2`,
  AUTO3_CTRL: `${TOPIC_PREFIX}/automode3`,

  // Thresholds (Broker -> ESP32)
  THRESHOLD_TEMP: `${TOPIC_PREFIX}/threshold/temp`,
  THRESHOLD_HUM:  `${TOPIC_PREFIX}/threshold/hum`,
  THRESHOLD_LUX:  `${TOPIC_PREFIX}/threshold/lux`
};

// Cấu hình các ngưỡng giới hạn kiểm tra dữ liệu và bộ lọc
const SETTINGS = {
  // Khoảng thời gian lệch tối đa giữa các gói tin để gom cụm cảm biến (ms)
  BUFFER_TIMEOUT_MS: 2000,
  
  // Thời gian chờ tối thiểu giữa các lần kích hoạt tự động cùng một thiết bị (ms)
  // Tránh việc Relay thật bật/tắt liên hồi gây hỏng phần cứng
  AUTOMATION_COOLDOWN_MS: 5000, 
  
  // Ngưỡng dữ liệu cảm biến hợp lệ để lọc nhiễu dị thường
  LIMITS: {
    TEMP: { MIN: 0, MAX: 60 },
    HUM: { MIN: 0, MAX: 100 },
    LUX: { MIN: 0, MAX: 10000 }
  }
};

module.exports = {
  supabaseUrl,
  supabaseServiceKey,
  mqttBrokerUrl,
  mqttPort,
  TOPICS,
  SETTINGS
};
