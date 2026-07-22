const supabaseService = require('./supabaseService');
const mqttService = require('./mqttService');
const { SETTINGS, TOPIC_PREFIX } = require('../config/config');
const logger = require('../utils/logger');

// Helper lấy MQTT control topic cho thiết bị
function getDeviceMqttTopic(loaiThietBi, nodeId) {
  const prefix = nodeId ? `${TOPIC_PREFIX}/${nodeId}` : TOPIC_PREFIX;
  if (loaiThietBi === 'dieu_hoa') return `${prefix}/led1`;
  if (loaiThietBi === 'quat') return `${prefix}/led2`;
  if (loaiThietBi === 'den') return `${prefix}/led3`;
  return null;
}

// Lưu trữ thời điểm thay đổi trạng thái tự động gần nhất của từng thiết bị để chống bật/tắt liên tục
const lastStateChangeTime = {};

// Cooldown riêng cho việc ghi log cảnh báo (tránh spam nhật ký)
const ALERT_LOG_COOLDOWN_MS = 10 * 60 * 1000;
const lastAlertLogTime = {};

// Trạng thái kích hoạt của lần đánh giá trước
const prevTriggerState = {};

const automationService = {
  /**
   * Đánh giá và chạy các luật tự động hóa dựa trên dữ liệu cảm biến mới nhận được
   */
  async evaluateRules(sensorData) {
    try {
      // Đọc tất cả các luật từ database
      const rules = await supabaseService.getAllRules();
      
      for (const rule of rules) {
        // Đọc trạng thái hiện tại của thiết bị trong database trước
        let device;
        try {
          device = await supabaseService.getThietBiStatus(rule.id_thietbi);
        } catch (devErr) {
          logger.warn(`[Tự động hóa] Không đọc được thiết bị ID=${rule.id_thietbi}, bỏ qua rule ${rule.idluat}: ${devErr.message}`);
          continue;
        }
        if (!device) {
          continue;
        }

        // Nếu thiết bị trong rule là loại cảm biến, tự động tìm thiết bị điều khiển tương ứng trên cùng node
        let targetDevice = device;
        const isSensor = ['cam_bien_nhietdo', 'cam_bien_doam', 'cam_bien_anhsang', 'cam_bien_gas'].includes(device.loai_thietbi);
        if (isSensor) {
          const actuatorType = device.loai_thietbi === 'cam_bien_nhietdo' ? 'dieu_hoa' : device.loai_thietbi === 'cam_bien_doam' ? 'quat' : device.loai_thietbi === 'cam_bien_anhsang' ? 'den' : null;
          if (actuatorType && device.idnode) {
            const { data: actList } = await supabaseService.supabase
              .from('thietbi')
              .select('*')
              .eq('idnode', device.idnode)
              .eq('loai_thietbi', actuatorType)
              .limit(1);
            if (actList && actList.length > 0) {
              targetDevice = actList[0];
            }
          }
        }

        // Kiểm tra chế độ tự động: Đánh giá luật nếu rule.automation = true hoặc targetDevice.tu_dong = true
        const isAutoActive = rule.automation === true || targetDevice.tu_dong === true;
        if (!isAutoActive) {
          continue;
        }

        // Nếu gói tin cảm biến có idnode và thiết bị có idnode, chỉ đánh giá khi khớp node
        const sensorNodeId = sensorData.idnode || sensorData.cambien_idnode || sensorData.cambien;
        if (sensorNodeId && targetDevice.idnode && sensorNodeId !== targetDevice.idnode) {
          continue;
        }

        let currentValue = null;
        let sensorName = '';
        let unit = '';

        if (rule.loaicambien === 'NhietDo') {
          currentValue = sensorData.nhietdo;
          sensorName = 'Nhiệt độ';
          unit = '°C';
        } else if (rule.loaicambien === 'DoAm') {
          currentValue = sensorData.doam;
          sensorName = 'Độ ẩm';
          unit = '%';
        } else if (rule.loaicambien === 'AnhSang') {
          currentValue = sensorData.anhsang;
          sensorName = 'Ánh sáng';
          unit = ' lx';
        }

        if (currentValue === null || currentValue === undefined) continue;

        // Kiểm tra xem điều kiện có được thỏa mãn không (phân biệt rõ >, >=, <, <=, =)
        let isTriggered = false;
        if (rule.toantu === '>') {
          isTriggered = currentValue > rule.nguong;
        } else if (rule.toantu === '>=') {
          isTriggered = currentValue >= rule.nguong;
        } else if (rule.toantu === '<') {
          isTriggered = currentValue < rule.nguong;
        } else if (rule.toantu === '<=') {
          isTriggered = currentValue <= rule.nguong;
        } else if (rule.toantu === '=') {
          isTriggered = currentValue === rule.nguong;
        }

        const targetState = isTriggered ? 1 : 0;

        // Phát hiện edge transition
        const prevTriggered = prevTriggerState[rule.idluat];
        const isEdgeOn  = isTriggered && !prevTriggered;
        const isEdgeOff = !isTriggered && (prevTriggered === true);
        prevTriggerState[rule.idluat] = isTriggered;
        
        // Nếu trạng thái tính toán khác với trạng thái hiện tại của thiết bị → Tiến hành thay đổi
        if (targetDevice.trangthai !== targetState) {
          const now = Date.now();
          const lastChange = lastStateChangeTime[targetDevice.id_thietbi] || 0;
          const timeSinceLastChange = now - lastChange;
          
          if (timeSinceLastChange < SETTINGS.AUTOMATION_COOLDOWN_MS) {
            const secondsLeft = Math.ceil((SETTINGS.AUTOMATION_COOLDOWN_MS - timeSinceLastChange) / 1000);
            logger.info(`[Tự động hóa] Luật ${rule.idluat} thỏa mãn nhưng Thiết bị "${targetDevice.ten_hienthi}" đang Cooldown (Chờ ${secondsLeft}s nữa). Bỏ qua thao tác.`);
            continue;
          }
          
          logger.info(`[Tự động hóa] Luật ${rule.idluat} kích hoạt! ${sensorName}=${currentValue}${unit} (Ngưỡng ${rule.toantu} ${rule.nguong}${unit}). Đang chuyển trạng thái thiết bị "${targetDevice.ten_hienthi}" sang: ${targetState === 1 ? 'BẬT' : 'TẮT'}`);
          
          // 1. Cập nhật thời điểm đổi trạng thái tự động
          lastStateChangeTime[targetDevice.id_thietbi] = now;
          
          // 2. Cập nhật trạng thái thiết bị trong DB
          await supabaseService.updateThietBiStatus(targetDevice.id_thietbi, targetState);

          // 3. Gửi trực tiếp lệnh MQTT tới phần cứng ESP32
          const targetNodeId = targetDevice.idnode || sensorData.idnode;
          const mqttTopic = getDeviceMqttTopic(targetDevice.loai_thietbi, targetNodeId);
          if (mqttTopic) {
            const payloadStr = targetState === 1 ? 'ON' : 'OFF';
            mqttService.publish(mqttTopic, payloadStr, { qos: 1 });
          }
          
          // 4. Ghi nhật ký hoạt động
          const lastLog = lastAlertLogTime[rule.idluat] || 0;
          const shouldLog = isEdgeOn || isEdgeOff || (now - lastLog) >= ALERT_LOG_COOLDOWN_MS;

          if (shouldLog) {
            const actionText = targetState === 1 ? 'Tự động Bật' : 'Tự động Tắt';

            await supabaseService.writeActionLog(
              targetDevice.id_thietbi,
              `${actionText} ${targetDevice.ten_hienthi} (Do ${sensorName} ${currentValue}${unit} ${rule.toantu} ngưỡng ${rule.nguong}${unit})`,
              sensorData.iddl,
              null,
              targetDevice.idnode || sensorData.idnode,
              'user_action'
            );
            lastAlertLogTime[rule.idluat] = now;
          }
        }
      }
    } catch (err) {
      logger.error('Lỗi khi xử lý quy tắc tự động hóa:', err.message);
    }
  }
};

module.exports = automationService;
