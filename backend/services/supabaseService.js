const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseServiceKey } = require('../config/config');
const logger = require('../utils/logger');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const supabaseService = {
  supabase,
  /**
   * Ghi dữ liệu cảm biến vào database
   */
  async insertSensorData(temp, hum, lux) {
    try {
      const { data, error } = await supabase
        .from('dulieucambien')
        .insert([{
          nhietdo: temp,
          doam: hum,
          anhsang: lux,
          cambien: 'ESP32'
        }])
        .select();

      if (error) throw error;
      return data[0];
    } catch (err) {
      logger.error('Lỗi khi ghi dữ liệu cảm biến lên Supabase:', err.message);
      throw err;
    }
  },

  /**
   * Lấy trạng thái hiện tại của thiết bị
   */
  async getDeviceStatus(idDen) {
    try {
      const { data, error } = await supabase
        .from('den')
        .select('*')
        .eq('idden', idDen)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      logger.error(`Lỗi khi lấy trạng thái thiết bị ID=${idDen}:`, err.message);
      throw err;
    }
  },

  /**
   * Cập nhật trạng thái thiết bị trong database
   */
  async updateDeviceStatus(idDen, statusVal) {
    try {
      const { data, error } = await supabase
        .from('den')
        .update({ trangthai: statusVal })
        .eq('idden', idDen)
        .select();

      if (error) throw error;
      return data[0];
    } catch (err) {
      logger.error(`Lỗi khi cập nhật trạng thái thiết bị ID=${idDen}:`, err.message);
      throw err;
    }
  },

  /**
   * Đọc cấu hình luật tự động tương ứng
   */
  async getRuleByDevice(idDen) {
    try {
      const { data, error } = await supabase
        .from('luat')
        .select('automation')
        .eq('idden', idDen)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      logger.error(`Lỗi khi đọc luật của thiết bị ID=${idDen}:`, err.message);
      throw err;
    }
  },

  /**
   * Cập nhật Chế độ tự động trong database
   */
  async updateRuleAutomation(idDen, autoVal) {
    try {
      const { data, error } = await supabase
        .from('luat')
        .update({ automation: autoVal })
        .eq('idden', idDen)
        .select();

      if (error) throw error;
      return data[0];
    } catch (err) {
      logger.error(`Lỗi khi cập nhật chế độ tự động cho thiết bị ID=${idDen}:`, err.message);
      throw err;
    }
  },

  /**
   * Lấy toàn bộ các luật tự động hóa
   */
  async getAllRules() {
    try {
      const { data, error } = await supabase
        .from('luat')
        .select('*');

      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('Lỗi khi đọc danh sách luật tự động hóa:', err.message);
      throw err;
    }
  },

  /**
   * Lấy danh sách lịch hẹn giờ
   */
  async getActiveSchedules() {
    try {
      const { data, error } = await supabase
        .from('lichhengio')
        .select('*, den(*)');

      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('Lỗi khi đọc danh sách lịch hẹn giờ từ Supabase:', err.message);
      throw err;
    }
  },

  /**
   * Ghi nhật ký hoạt động
   */
  async writeActionLog(idDen, actionText, idCambien = null, idNguoidung = null) {
    try {
      const { error } = await supabase
        .from('nhatkyhoatdong')
        .insert([{
          idden: idDen,
          idcambien: idCambien,
          idnguoidung: idNguoidung,
          hanhdong: actionText
        }]);

      if (error) throw error;
    } catch (err) {
      logger.error('Lỗi khi ghi nhật ký hoạt động:', err.message);
    }
  },

  /**
   * Đăng ký kênh Realtime lắng nghe thay đổi trên bảng 'den'
   */
  subscribeToDeviceChanges(callback) {
    logger.info('Đang kết nối kênh Realtime bảng "den"...');
    return supabase
      .channel('public:den')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'den' }, (payload) => {
        callback(payload.new, payload.old);
      })
      .subscribe((status) => {
        logger.success(`Đã kết nối kênh Realtime bảng "den": trạng thái = ${status}`);
      });
  },

  /**
   * Đăng ký kênh Realtime lắng nghe thay đổi trên bảng 'luat'
   */
  subscribeToRuleChanges(callback) {
    logger.info('Đang kết nối kênh Realtime bảng "luat"...');
    return supabase
      .channel('public:luat')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'luat' }, (payload) => {
        callback(payload.new, payload.old);
      })
      .subscribe((status) => {
        logger.success(`Đã kết nối kênh Realtime bảng "luat": trạng thái = ${status}`);
      });
  }
};

module.exports = supabaseService;
