const supabaseService = require('./supabaseService');
const logger = require('../utils/logger');

let lastCheckedTime = '';

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
              const deviceName = schedule.den ? schedule.den.tenden : `Thiết bị ${schedule.idden}`;
              
              logger.info(`[Hẹn giờ] ✅ Kích hoạt! ID=${schedule.idid}: ${schedule.hanhdong === 'on' ? 'BẬT' : 'TẮT'} ${deviceName}`);
              
              // 1. Cập nhật trạng thái thiết bị trong Supabase
              await supabaseService.updateDeviceStatus(schedule.idden, targetState);
              
              // 2. Ghi nhật ký hoạt động
              await supabaseService.writeActionLog(
                schedule.idden,
                `Hẹn giờ: ${schedule.hanhdong === 'on' ? 'Bật' : 'Tắt'} ${deviceName} (Theo lịch ${schedule.thoigian})`
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
