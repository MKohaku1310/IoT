const supabaseService = require('./supabaseService');
const { SETTINGS } = require('../config/config');
const logger = require('../utils/logger');

// Lưu trữ thời điểm thay đổi trạng thái tự động gần nhất của từng thiết bị để chống bật/tắt liên tục
const lastStateChangeTime = {};

// Cooldown riêng cho việc ghi log cảnh báo (tránh spam nhật ký)
// Mặc định: 10 phút giữa mỗi lần ghi log cho cùng một luật khi vẫn đang vi phạm ngưỡng
const ALERT_LOG_COOLDOWN_MS = 10 * 60 * 1000;
const lastAlertLogTime = {};

// Trạng thái kích hoạt của lần đánh giá trước: phát hiện edge OFF→ON và ON→OFF
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
        // Chỉ chạy nếu luật đang bật chế độ Tự động (automation = true)
        if (!rule.automation) continue;
        
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
        
        // Kiểm tra xem điều kiện có được thỏa mãn không
        let isTriggered = false;
        if (rule.toantu === '>') {
          isTriggered = currentValue > rule.nguong;
        } else if (rule.toantu === '<') {
          isTriggered = currentValue < rule.nguong;
        } else if (rule.toantu === '=') {
          isTriggered = currentValue === rule.nguong;
        }
        
        const targetState = isTriggered ? 1 : 0;

        // Phát hiện edge transition
        const prevTriggered = prevTriggerState[rule.idluat]; // undefined lần đầu
        const isEdgeOn  = isTriggered && !prevTriggered;    // Vừa vượt ngưỡng (OFF→ON)
        const isEdgeOff = !isTriggered && (prevTriggered === true); // Vừa về bình thường (ON→OFF)
        prevTriggerState[rule.idluat] = isTriggered;
        
        // Đọc trạng thái hiện tại của thiết bị trong database
        const device = await supabaseService.getDeviceStatus(rule.idden);
        if (!device) continue;
        
        // Nếu trạng thái tính toán khác với trạng thái hiện tại của thiết bị → Tiến hành thay đổi
        if (device.trangthai !== targetState) {
          const now = Date.now();
          const lastChange = lastStateChangeTime[rule.idden] || 0;
          const timeSinceLastChange = now - lastChange;
          
          // Kiểm tra xem thiết bị có đang trong chế độ Cooldown chống giật rơ-le không
          if (timeSinceLastChange < SETTINGS.AUTOMATION_COOLDOWN_MS) {
            const secondsLeft = Math.ceil((SETTINGS.AUTOMATION_COOLDOWN_MS - timeSinceLastChange) / 1000);
            logger.warn(`[Tự động hóa] Luật ${rule.idluat} thỏa mãn nhưng Thiết bị "${device.tenden}" đang Cooldown (Chờ ${secondsLeft}s nữa). Bỏ qua thao tác.`);
            continue;
          }
          
          logger.info(`[Tự động hóa] Luật ${rule.idluat} kích hoạt! ${sensorName}=${currentValue}${unit} (Ngưỡng ${rule.toantu} ${rule.nguong}${unit}). Đang chuyển trạng thái thiết bị "${device.tenden}" sang: ${targetState === 1 ? 'BẬT' : 'TẮT'}`);
          
          // 1. Cập nhật thời điểm đổi trạng thái tự động
          lastStateChangeTime[rule.idden] = now;
          
          // 2. Cập nhật trạng thái thiết bị trong DB (Supabase Realtime sẽ tự đồng bộ về ESP32)
          await supabaseService.updateDeviceStatus(rule.idden, targetState);
          
          // 3. Ghi nhật ký với logic cooldown + edge:
          //    - Luôn ghi khi vừa mới vượt ngưỡng (edge ON) hoặc vừa trở về bình thường (edge OFF)
          //    - Hoặc ghi nhắc lại sau mỗi ALERT_LOG_COOLDOWN_MS nếu vẫn đang vi phạm
          const lastLog = lastAlertLogTime[rule.idluat] || 0;
          const shouldLog = isEdgeOn || isEdgeOff || (now - lastLog) >= ALERT_LOG_COOLDOWN_MS;

          if (shouldLog) {
            const actionText = targetState === 1 ? 'Tự động Bật' : 'Tự động Tắt';
            await supabaseService.writeActionLog(
              rule.idden, 
              `${actionText} ${device.tenden} (Do ${sensorName} ${currentValue}${unit} ${rule.toantu} ngưỡng ${rule.nguong}${unit})`,
              sensorData.iddl
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
