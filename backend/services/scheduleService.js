const supabaseService = require('./supabaseService');
const mqttService = require('./mqttService');
const logger = require('../utils/logger');

let lastCheckedTime = '';

const { TOPIC_PREFIX } = require('../config/config');

const DEVICE_CTRL_TOPICS = {
  dieu_hoa: `${TOPIC_PREFIX}/led`,
  quat: `${TOPIC_PREFIX}/led2`,
  den: `${TOPIC_PREFIX}/led3`,
};

// Chuyển đổi sang múi giờ Việt Nam (UTC+7) để so sánh lịch hẹn
function getVietnamTime() {
  const now = new Date();
  // Tính offset UTC+7 = 7*60 phút
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 7 * 60 * 60 * 1000);
}

const scheduleService = {
  /**
   * Khởi chạy trình kiểm tra lịch hẹn giờ định kỳ
   */
  start() {
    logger.info('[Hẹn giờ] Bắt đầu khởi chạy dịch vụ lịch hẹn giờ (múi giờ: UTC+7 Việt Nam)...');
    
    // Kiểm tra mỗi 15 giây để tránh bị trượt phút
    setInterval(async () => {
      // Dùng giờ Việt Nam thay vì giờ máy chủ
      const vnNow = getVietnamTime();
      const currentHour = String(vnNow.getHours()).padStart(2, '0');
      const currentMin = String(vnNow.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHour}:${currentMin}`; // "HH:MM"
      
      // Nếu đã kiểm tra phút này rồi thì bỏ qua
      if (currentTime === lastCheckedTime) {
        return;
      }
      
      lastCheckedTime = currentTime;
      const currentDay = vnNow.getDay(); // 0: CN, 1: T2, ..., 6: T7 (theo giờ VN)
      
      logger.info(`[Hẹn giờ] Kiểm tra lịch lúc ${currentTime} (Thứ ${currentDay === 0 ? 'CN' : currentDay + 1}, giờ VN)`);

      try {
        // Lấy tất cả lịch hẹn đang kích hoạt
        const schedules = await supabaseService.getActiveSchedules();
        const activeSchedules = schedules.filter(s => s.kichhoat === true);
        
        if (activeSchedules.length === 0) {
          return;
        }
        
        for (const schedule of activeSchedules) {
          // Lấy phần giờ phút từ thoigian (ví dụ "18:30:00" -> "18:30")
          const scheduleTime = schedule.thoigian.substring(0, 5);
          
          if (scheduleTime === currentTime) {
            // Kiểm tra xem hôm nay có nằm trong các thứ được hẹn không
            const daysArray = Array.isArray(schedule.thu) ? schedule.thu : [];
            if (daysArray.includes(currentDay)) {
              const targetState = schedule.hanhdong === 'on' ? 1 : 0;
              
              // Lấy tên thiết bị mới nhất
              let deviceName = 'Thiết bị không xác định';
              const id_thietbi = schedule.id_thietbi;
              
              if (schedule.thietbi) {
                deviceName = schedule.thietbi.ten_hienthi || (schedule.thietbi.loai_thietbi === 'dieu_hoa' ? 'Điều hòa' : schedule.thietbi.loai_thietbi === 'quat' ? 'Quạt' : 'Đèn');
              }
              
              logger.info(`[Hẹn giờ] ✅ Kích hoạt! ID=${schedule.idid}: ${schedule.hanhdong === 'on' ? 'BẬT' : 'TẮT'} ${deviceName}`);
              
              if (!id_thietbi) {
                logger.warn(`[Hẹn giờ] Bỏ qua lịch ID=${schedule.idid}: không có id_thietbi`);
                continue;
              }

              // Kiểm tra chế độ thiết bị trước khi thực hiện bất kỳ hành động nào
              const isAutoMode = schedule.thietbi && schedule.thietbi.tu_dong === true;

              if (!isAutoMode) {
                logger.info(`[Hẹn giờ] Bỏ qua lịch ID=${schedule.idid} cho ${deviceName} (Thiết bị ở chế độ thủ công)`);
                continue;
              }

              // 1. Cập nhật trạng thái thiết bị trong Supabase (chỉ khi ở chế độ tự động)
              await supabaseService.updateThietBiStatus(id_thietbi, targetState);

              // 2. Gửi lệnh MQTT trực tiếp đến ESP32 (phòng trường hợp Realtime mất kết nối)
              if (schedule.thietbi && schedule.thietbi.idnode === 'ESP32-S3-Node-01') {
                const ctrlTopic = DEVICE_CTRL_TOPICS[schedule.thietbi.loai_thietbi];
                if (ctrlTopic) {
                  const payload = targetState === 1 ? 'ON' : 'OFF';
                  mqttService.publish(ctrlTopic, payload, { qos: 1 });
                  logger.info(`[Hẹn giờ] Gửi MQTT trực tiếp: ${ctrlTopic} = ${payload} (Chế độ: Tự động)`);
                }
              }
              
              // 2. Ghi nhật ký hoạt động
              await supabaseService.writeActionLog(
                id_thietbi,
                `Hẹn giờ: ${schedule.hanhdong === 'on' ? 'Bật' : 'Tắt'} ${deviceName} (Theo lịch ${schedule.thoigian})`,
                null,
                null, // idnguoidung = null để writeActionLog tự động lấy từ esp32_nodes
                null, // idnode = null để writeActionLog tự động lấy từ thietbi
                'user_action' // Hẹn giờ do user set, nên là user_action
              );
            } else {
              logger.info(`[Hẹn giờ] Bỏ qua lịch ID=${schedule.idid}: hôm nay (${currentDay}) không nằm trong danh sách [${schedule.thu}]`);
            }
          }
        }
      } catch (err) {
        logger.error('Lỗi trong tiến trình kiểm tra lịch hẹn giờ:', err.message);
      }
    }, 15000);
  }
};

module.exports = scheduleService;
