const supabaseService = require('./supabaseService');
const logger = require('../utils/logger');

let lastCheckedTime = '';

const scheduleService = {
  /**
   * Khởi chạy trình kiểm tra lịch hẹn giờ định kỳ
   */
  start() {
    logger.info('[Hẹn giờ] Bắt đầu khởi chạy dịch vụ lịch hẹn giờ...');
    
    // Kiểm tra mỗi 15 giây để tránh bị trượt phút
    setInterval(async () => {
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMin = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHour}:${currentMin}`; // "HH:MM"
      
      // Nếu đã kiểm tra phút này rồi thì bỏ qua
      if (currentTime === lastCheckedTime) {
        return;
      }
      
      lastCheckedTime = currentTime;
      const currentDay = now.getDay(); // 0: Chủ Nhật, 1: Thứ 2, ..., 6: Thứ 7
      
      try {
        // Lấy tất cả lịch hẹn đang kích hoạt
        const schedules = await supabaseService.getActiveSchedules();
        const activeSchedules = schedules.filter(s => s.kichhoat === true);
        
        if (activeSchedules.length === 0) return;
        
        for (const schedule of activeSchedules) {
          // Lấy phần giờ phút từ thoigian (ví dụ "18:30:00" -> "18:30")
          const scheduleTime = schedule.thoigian.substring(0, 5);
          
          if (scheduleTime === currentTime) {
            // Kiểm tra xem hôm nay có nằm trong các thứ được hẹn không
            if (schedule.thu && schedule.thu.includes(currentDay)) {
              const targetState = schedule.hanhdong === 'on' ? 1 : 0;
              const deviceName = schedule.den ? schedule.den.tenden : `Thiết bị ${schedule.idden}`;
              
              logger.info(`[Hẹn giờ] Đến giờ hẹn! Kích hoạt lịch hẹn ID=${schedule.idid}: ${schedule.hanhdong === 'on' ? 'BẬT' : 'TẮT'} ${deviceName}`);
              
              // 1. Cập nhật trạng thái thiết bị trong Supabase (Realtime sẽ cập nhật về ESP32 qua Bridge)
              await supabaseService.updateDeviceStatus(schedule.idden, targetState);
              
              // 2. Ghi nhật ký hoạt động
              await supabaseService.writeActionLog(
                schedule.idden,
                `Hẹn giờ: ${schedule.hanhdong === 'on' ? 'Bật' : 'Tắt'} ${deviceName} (Theo lịch ${schedule.thoigian})`
              );
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
