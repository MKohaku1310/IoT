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
  // Telemetry (ESP32 -> Broker) - Multi-node với wildcard
  // Pattern: buivansang_iot_pj/{nodeId}/temp, /hum, /lux
  TEMP_WILDCARD: `${TOPIC_PREFIX}/+/temp`,
  HUM_WILDCARD:  `${TOPIC_PREFIX}/+/hum`,
  LUX_WILDCARD:  `${TOPIC_PREFIX}/+/lux`,
  
  // Legacy topics cho backward compatibility (ESP32-S3-Node-01 cũ)
  TEMP_LEGACY: `${TOPIC_PREFIX}/temp`,
  HUM_LEGACY:  `${TOPIC_PREFIX}/hum`,
  LUX_LEGACY:  `${TOPIC_PREFIX}/lux`,
  
  // Gas sensor MQ-2 (ESP32-C3-Kitchen -> Broker)
  // Topic: buivansang_iot_pj/{nodeId}/gas
  // Payload: giá trị PPM dạng string (ví dụ: "245.6")
  GAS:  `${TOPIC_PREFIX}/+/gas`,
  HEARTBEAT: `${TOPIC_PREFIX}/+/heartbeat`,
  
  // States (ESP32 -> Broker) - Multi-node với wildcard
  // Pattern: buivansang_iot_pj/{nodeId}/led1/state, /led2/state, /led3/state
  LED_STATE_WILDCARD: `${TOPIC_PREFIX}/+/led1/state`,
  LED2_STATE_WILDCARD: `${TOPIC_PREFIX}/+/led2/state`,
  LED3_STATE_WILDCARD: `${TOPIC_PREFIX}/+/led3/state`,
  AUTO_STATE_WILDCARD: `${TOPIC_PREFIX}/+/automode1/state`,
  AUTO2_STATE_WILDCARD: `${TOPIC_PREFIX}/+/automode2/state`,
  AUTO3_STATE_WILDCARD: `${TOPIC_PREFIX}/+/automode3/state`,
  
  // Legacy state topics cho backward compatibility
  LED1_STATE: `${TOPIC_PREFIX}/led1/state`,
  LED2_STATE: `${TOPIC_PREFIX}/led2/state`,
  LED3_STATE: `${TOPIC_PREFIX}/led3/state`,
  AUTO1_STATE: `${TOPIC_PREFIX}/automode1/state`,
  AUTO2_STATE: `${TOPIC_PREFIX}/automode2/state`,
  AUTO3_STATE: `${TOPIC_PREFIX}/automode3/state`,
  
  // Thresholds (Broker -> ESP32) - Global thresholds cho tất cả nodes
  THRESHOLD_TEMP: `${TOPIC_PREFIX}/threshold/temp`,
  THRESHOLD_HUM:  `${TOPIC_PREFIX}/threshold/hum`,
  THRESHOLD_LUX:  `${TOPIC_PREFIX}/threshold/lux`,
  THRESHOLD_GAS:  `${TOPIC_PREFIX}/threshold/gas`
};

// Cấu hình các ngưỡng giới hạn kiểm tra dữ liệu và bộ lọc
const SETTINGS = {
  // Khoảng thời gian lệch tối đa giữa các gói tin để gom cụm cảm biến (ms)
  BUFFER_TIMEOUT_MS: 2000,
  
  // Thời gian chờ tối thiểu giữa các lần kích hoạt tự động cùng một thiết bị (ms)
  AUTOMATION_COOLDOWN_MS: 3000, 
  
  // Ngưỡng dữ liệu cảm biến hợp lệ để lọc nhiễu dị thường
  LIMITS: {
    TEMP: { MIN: 0,   MAX: 60    },
    HUM:  { MIN: 0,   MAX: 100   },
    LUX:  { MIN: 0,   MAX: 10000 },
    GAS:  { MIN: 0,   MAX: 10000 }  // ppm MQ-2 hợp lệ (0-10000 ppm)
  }
};

module.exports = {
  supabaseUrl,
  supabaseServiceKey,
  mqttBrokerUrl,
  mqttPort,
  TOPIC_PREFIX,
  TOPICS,
  SETTINGS
};
