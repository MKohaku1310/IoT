const mqtt = require('mqtt');
const { mqttBrokerUrl, mqttPort, TOPICS } = require('../config/config');
const logger = require('../utils/logger');

let client = null;

const mqttService = {
  /**
   * Khởi tạo kết nối đến MQTT Broker
   */
  connect(onMessageCallback, onConnectCallback) {
    logger.info(`Đang kết nối đến MQTT Broker: ${mqttBrokerUrl}:${mqttPort}...`);
    
    client = mqtt.connect(mqttBrokerUrl, { 
      port: mqttPort,
      reconnectPeriod: 3000, // Thử kết nối lại mỗi 3 giây nếu mất mạng
      connectTimeout: 10000  // Timeout kết nối 10 giây
    });

    client.on('connect', () => {
      logger.success('Kết nối thành công đến MQTT Broker!');
      
      // Đăng ký tất cả các topic cần nhận tin (với wildcard cho multi-node + legacy cho backward compatibility)
      const topicsToSubscribe = [
        TOPICS.TEMP_WILDCARD, TOPICS.HUM_WILDCARD, TOPICS.LUX_WILDCARD,
        TOPICS.TEMP_LEGACY, TOPICS.HUM_LEGACY, TOPICS.LUX_LEGACY,  // Legacy topics
        TOPICS.GAS,
        TOPICS.HEARTBEAT,
        TOPICS.LED_STATE_WILDCARD, TOPICS.LED2_STATE_WILDCARD, TOPICS.LED3_STATE_WILDCARD,
        TOPICS.LED1_STATE, TOPICS.LED2_STATE, TOPICS.LED3_STATE,  // Legacy state topics
        TOPICS.AUTO_STATE_WILDCARD, TOPICS.AUTO2_STATE_WILDCARD, TOPICS.AUTO3_STATE_WILDCARD,
        TOPICS.AUTO1_STATE, TOPICS.AUTO2_STATE, TOPICS.AUTO3_STATE  // Legacy auto topics
      ];
      
      client.subscribe(topicsToSubscribe, (err) => {
        if (err) {
          logger.error('Lỗi khi subscribe các topic:', err);
        } else {
          logger.info('Đã subscribe thành công các topic:', topicsToSubscribe);
        }
      });

      if (onConnectCallback) {
        onConnectCallback();
      }
    });

    client.on('message', (topic, payload) => {
      const valueStr = payload.toString().trim();
      onMessageCallback(topic, valueStr);
    });

    client.on('reconnect', () => {
      logger.warn('Đang thử kết nối lại với MQTT Broker...');
    });

    client.on('offline', () => {
      logger.error('Mất kết nối với MQTT Broker!');
    });

    client.on('error', (err) => {
      logger.error('Lỗi kết nối MQTT:', err.message);
    });

    return client;
  },

  /**
   * Phát tin nhắn lên topic MQTT
   */
  publish(topic, payload, options = { qos: 1 }) {
    if (!client || !client.connected) {
      logger.error(`Không thể publish lên topic ${topic} do MQTT Client đang ngoại tuyến.`);
      return;
    }
    client.publish(topic, payload.toString(), options, (err) => {
      if (err) {
        logger.error(`Lỗi khi publish lên ${topic}:`, err.message);
      }
    });
  },

  /**
   * Đóng kết nối
   */
  close() {
    if (client) {
      logger.info('Đang ngắt kết nối MQTT Client...');
      client.end();
    }
  },

  /**
   * Kiểm tra trạng thái kết nối MQTT
   */
  isConnected() {
    return client ? client.connected : false;
  }
};

module.exports = mqttService;
