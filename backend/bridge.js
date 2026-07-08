const { TOPICS, SETTINGS } = require('./config/config');
const logger = require('./utils/logger');
const supabaseService = require('./services/supabaseService');
const mqttService = require('./services/mqttService');
const automationService = require('./services/automationService');
const scheduleService = require('./services/scheduleService');


// ==========================================
// 1. CẤU TRÚC GOM CỤM DỮ LIỆU CẢM BIẾN (BUFFER)
// ==========================================
let currentTelemetry = {
  temp: null,
  hum: null,
  lux: null,
  tempTime: 0,
  humTime: 0,
  luxTime: 0
};

// Hàm ánh xạ idDen sang topic tương ứng
function getDeviceTopics(idDen) {
  if (idDen === 1) return { ctrl: TOPICS.LED1_CTRL, autoCtrl: TOPICS.AUTO1_CTRL };
  if (idDen === 2) return { ctrl: TOPICS.LED2_CTRL, autoCtrl: TOPICS.AUTO2_CTRL };
  if (idDen === 3) return { ctrl: TOPICS.LED3_CTRL, autoCtrl: TOPICS.AUTO3_CTRL };
  return null;
}

// Hàm ánh xạ topic trạng thái sang idDen
function getDeviceFromTopic(topic) {
  if (topic === TOPICS.LED1_STATE) return { idDen: 1, type: 'status' };
  if (topic === TOPICS.LED2_STATE) return { idDen: 2, type: 'status' };
  if (topic === TOPICS.LED3_STATE) return { idDen: 3, type: 'status' };
  if (topic === TOPICS.AUTO1_STATE) return { idDen: 1, type: 'auto' };
  if (topic === TOPICS.AUTO2_STATE) return { idDen: 2, type: 'auto' };
  if (topic === TOPICS.AUTO3_STATE) return { idDen: 3, type: 'auto' };
  return null;
}

// ==========================================
// 2. XỬ LÝ LỌC & GHI NHẬN DỮ LIỆU CẢM BIẾN
// ==========================================
async function handleTelemetryInput(topic, valueStr) {
  const value = parseFloat(valueStr);
  const now = Date.now();

  if (isNaN(value)) {
    logger.warn(`Dữ liệu cảm biến không hợp lệ (NaN) từ topic ${topic}: "${valueStr}"`);
    return;
  }

  // A. Lọc dữ liệu dị thường dựa theo config LIMITS
  if (topic === TOPICS.TEMP) {
    if (value < SETTINGS.LIMITS.TEMP.MIN || value > SETTINGS.LIMITS.TEMP.MAX) {
      logger.warn(`Nhiệt độ ngoài ngưỡng thực tế (${value}°C). Bỏ qua.`);
      return;
    }
    currentTelemetry.temp = value;
    currentTelemetry.tempTime = now;
  } 
  
  else if (topic === TOPICS.HUM) {
    if (value < SETTINGS.LIMITS.HUM.MIN || value > SETTINGS.LIMITS.HUM.MAX) {
      logger.warn(`Độ ẩm ngoài ngưỡng thực tế (${value}%). Bỏ qua.`);
      return;
    }
    currentTelemetry.hum = value;
    currentTelemetry.humTime = now;
  } 
  
  else if (topic === TOPICS.LUX) {
    if (value < SETTINGS.LIMITS.LUX.MIN || value > SETTINGS.LIMITS.LUX.MAX) {
      logger.warn(`Độ sáng ngoài ngưỡng thực tế (${value} lx). Bỏ qua.`);
      return;
    }
    currentTelemetry.lux = value;
    currentTelemetry.luxTime = now;
  }

  // B. Gom cụm dữ liệu: Nếu cả 3 chỉ số đều có giá trị
  if (currentTelemetry.temp !== null && currentTelemetry.hum !== null && currentTelemetry.lux !== null) {
    // Đo độ lệch thời gian lớn nhất giữa 3 gói tin
    const timestamps = [currentTelemetry.tempTime, currentTelemetry.humTime, currentTelemetry.luxTime];
    const maxDiff = Math.max(...timestamps) - Math.min(...timestamps);

    if (maxDiff <= SETTINGS.BUFFER_TIMEOUT_MS) {
      const tempVal = currentTelemetry.temp;
      const humVal = currentTelemetry.hum;
      const luxVal = currentTelemetry.lux;

      // Reset bộ đệm ngay lập tức để đón cụm tiếp theo
      currentTelemetry.temp = null;
      currentTelemetry.hum = null;
      currentTelemetry.lux = null;

      logger.info(`[Cảm biến] Nhận đủ bộ: Nhiệt độ=${tempVal}°C, Độ ẩm=${humVal}%, Ánh sáng=${luxVal} lx. Đang ghi vào Supabase...`);

      try {
        const record = await supabaseService.insertSensorData(tempVal, humVal, luxVal);
        logger.success(`[Cảm biến] Đã lưu bản ghi ID=${record.iddl} thành công.`);

        // Đánh giá luật tự động hóa với dữ liệu mới này
        await automationService.evaluateRules(record);
      } catch (err) {
        logger.error('Lỗi quy trình lưu dữ liệu và kiểm tra tự động:', err.message);
      }
    } else {
      // Các gói tin lệch nhau quá lâu (quá 5 giây), dọn dẹp các giá trị cũ
      logger.warn(`[Cảm biến] Các gói tin lệch nhau quá xa (${(maxDiff/1000).toFixed(1)}s). Reset bộ đệm.`);
      const oldestTime = now - SETTINGS.BUFFER_TIMEOUT_MS;
      if (currentTelemetry.tempTime < oldestTime) currentTelemetry.temp = null;
      if (currentTelemetry.humTime < oldestTime) currentTelemetry.hum = null;
      if (currentTelemetry.luxTime < oldestTime) currentTelemetry.lux = null;
    }
  }
}

// ==========================================
// 3. ĐỒNG BỘ TRẠNG THÁI THIẾT BỊ TỪ PHẦN CỨNG
// ==========================================
async function handleDeviceStateInput(deviceInfo, valueStr) {
  logger.info(`[Đồng bộ ESP32] Nhận trạng thái phần cứng - Thiết bị ID=${deviceInfo.idDen}, Loại=${deviceInfo.type}, Trạng thái=${valueStr}`);
  
  try {
    if (deviceInfo.type === 'status') {
      const statusVal = valueStr === 'ON' ? 1 : 0;
      const device = await supabaseService.getDeviceStatus(deviceInfo.idDen);
      
      if (device && device.trangthai !== statusVal) {
        await supabaseService.updateDeviceStatus(deviceInfo.idDen, statusVal);
        logger.success(`[Đồng bộ DB] Đã cập nhật trạng thái Thiết bị "${device.tenden}" thành ${statusVal === 1 ? 'Bật' : 'Tắt'}`);
        
        await supabaseService.writeActionLog(
          deviceInfo.idDen, 
          `Phần cứng đồng bộ: ${statusVal === 1 ? 'Bật' : 'Tắt'} ${device.tenden}`
        );
      }
    } 
    
    else if (deviceInfo.type === 'auto') {
      const autoVal = valueStr === 'ON';
      const rule = await supabaseService.getRuleByDevice(deviceInfo.idDen);
      
      if (rule && rule.automation !== autoVal) {
        await supabaseService.updateRuleAutomation(deviceInfo.idDen, autoVal);
        logger.success(`[Đồng bộ DB] Đã cập nhật Chế độ tự động Thiết bị ID=${deviceInfo.idDen} thành ${autoVal ? 'Bật' : 'Tắt'}`);
      }
    }
  } catch (err) {
    logger.error('Lỗi khi đồng bộ dữ liệu từ thiết bị vào database:', err.message);
  }
}

// ==========================================
// 4. KHỞI CHẠY BRIDGE & ĐĂNG KÝ SỰ KIỆN
// ==========================================
function startBridge() {
  logger.info('--- KHỞI ĐỘNG HỆ THỐNG SMART HOME BRIDGE ---');

  // A. Kết nối MQTT và đăng ký lắng nghe tin nhắn
  mqttService.connect((topic, valueStr) => {
    // Kiểm tra loại topic nhận được
    if (topic === TOPICS.TEMP || topic === TOPICS.HUM || topic === TOPICS.LUX) {
      handleTelemetryInput(topic, valueStr);
    } else {
      const deviceInfo = getDeviceFromTopic(topic);
      if (deviceInfo) {
        handleDeviceStateInput(deviceInfo, valueStr);
      }
    }
  }, () => {
    logger.info('[MQTT Connected] Bắt đầu đồng bộ trạng thái ban đầu từ Database lên MQTT...');
    // Cập nhật các ngưỡng hiện có và chế độ tự động từ Database lên MQTT với cờ retain
    supabaseService.getAllRules().then(rules => {
      rules.forEach(rule => {
        // 1. Đồng bộ ngưỡng cảm biến
        let thresholdTopic = '';
        if (rule.loaicambien === 'NhietDo') thresholdTopic = TOPICS.THRESHOLD_TEMP;
        else if (rule.loaicambien === 'DoAm') thresholdTopic = TOPICS.THRESHOLD_HUM;
        else if (rule.loaicambien === 'AnhSang') thresholdTopic = TOPICS.THRESHOLD_LUX;
        
        if (thresholdTopic) {
          logger.info(`[Đồng bộ Khởi chạy] Gửi ngưỡng cảm biến -> ${thresholdTopic}: ${rule.nguong}`);
          mqttService.publish(thresholdTopic, String(rule.nguong), { retain: true, qos: 1 });
        }

        // 2. Đồng bộ chế độ tự động hóa (Auto Mode)
        const deviceTopics = getDeviceTopics(rule.idden);
        if (deviceTopics) {
          const autoPayload = rule.automation ? 'ON' : 'OFF';
          logger.info(`[Đồng bộ Khởi chạy] Gửi chế độ tự động hóa -> ${deviceTopics.autoCtrl}: ${autoPayload}`);
          mqttService.publish(deviceTopics.autoCtrl, autoPayload, { retain: true, qos: 1 });
        }
      });
    }).catch(err => {
      logger.error('Lỗi khi lấy quy tắc ban đầu từ database:', err.message);
    });
  });

  // B. Đăng ký Realtime lắng nghe thay đổi trên bảng 'den' (từ Web dashboard) để gửi xuống ESP32
  supabaseService.subscribeToDeviceChanges((updatedDevice, oldDevice) => {
    if (updatedDevice.trangthai !== oldDevice.trangthai) {
      const topics = getDeviceTopics(updatedDevice.idden);
      if (topics) {
        const payloadStr = updatedDevice.trangthai === 1 ? 'ON' : 'OFF';
        logger.info(`[Realtime DB] Thiết bị "${updatedDevice.tenden}" thay đổi trạng thái -> ${payloadStr}. Đang gửi lệnh MQTT...`);
        mqttService.publish(topics.ctrl, payloadStr, { qos: 1 });
      }
    }
  });

  // C. Đăng ký Realtime lắng nghe thay đổi trên bảng 'luat' (từ Web dashboard) để gửi xuống ESP32
  supabaseService.subscribeToRuleChanges((updatedRule, oldRule) => {
    if (updatedRule.automation !== oldRule.automation) {
      const topics = getDeviceTopics(updatedRule.idden);
      if (topics) {
        const payloadStr = updatedRule.automation ? 'ON' : 'OFF';
        logger.info(`[Realtime DB] Luật ID=${updatedRule.idluat} (Thiết bị ID=${updatedRule.idden}) thay đổi tự động hóa -> ${payloadStr}. Đang gửi lệnh MQTT...`);
        mqttService.publish(topics.autoCtrl, payloadStr, { qos: 1 });
      }
    }
    
    // Gửi ngưỡng mới xuống ESP32 qua MQTT nếu người dùng đổi trên Web
    if (updatedRule.nguong !== oldRule.nguong) {
      let topic = '';
      if (updatedRule.loaicambien === 'NhietDo') topic = TOPICS.THRESHOLD_TEMP;
      else if (updatedRule.loaicambien === 'DoAm') topic = TOPICS.THRESHOLD_HUM;
      else if (updatedRule.loaicambien === 'AnhSang') topic = TOPICS.THRESHOLD_LUX;
      
      if (topic) {
        logger.info(`[Realtime DB] Luật ID=${updatedRule.idluat} thay đổi ngưỡng -> ${updatedRule.nguong}. Đang gửi lệnh MQTT...`);
        mqttService.publish(topic, String(updatedRule.nguong), { retain: true, qos: 1 });
      }
    }
  });

  // D. Khởi chạy tiến trình kiểm tra hẹn giờ
  scheduleService.start();
}

// Chạy ứng dụng
startBridge();

// Tạo HTTP Server ảo để chạy trên Render (Tránh lỗi Health Check)
const http = require('http');
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Smart Home IoT Bridge is running!\n');
}).listen(PORT, () => {
  logger.info(`Virtual HTTP Server listening on port ${PORT}`);
});

// Dọn dẹp tài nguyên khi tắt chương trình
process.on('SIGINT', () => {
  logger.info('Đang tắt tiến trình Bridge...');
  mqttService.close();
  process.exit();
});
