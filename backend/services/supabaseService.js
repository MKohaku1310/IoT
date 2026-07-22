const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseServiceKey } = require('../config/config');
const logger = require('../utils/logger');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const supabaseService = {
  supabase,
  /**
   * Ghi dữ liệu cảm biến vào database
   * @param {number|null} temp  - Nhiệt độ (°C)
   * @param {number|null} hum   - Độ ẩm (%)
   * @param {number|null} lux   - Ánh sáng (lx)
   * @param {string} nodeId     - ID Node gửi dữ liệu (mặc định: 'ESP32-S3-Node-01')
   */
  async insertSensorData(temp, hum, lux, nodeId = 'ESP32-S3-Node-01') {
    try {
      const { data, error } = await supabase
        .from('dulieucambien')
        .insert([{
          nhietdo: temp,
          doam: hum,
          anhsang: lux,
          cambien: nodeId,
          cambien_idnode: nodeId,
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
   * Ghi dữ liệu cảm biến Gas MQ-2 vào database
   * Gas được ghi riêng (temp/hum/lux = null vì node bếp chỉ có gas)
   * @param {number} gasPpm - Nồng độ khí gas (ppm)
   * @param {string} nodeId - ID Node gửi (mặc định: 'ESP32-C3-Kitchen')
   */
  async insertGasData(gasPpm, nodeId = 'ESP32-C3-Kitchen') {
    try {
      const { data, error } = await supabase
        .from('dulieucambien')
        .insert([{
          gas_ppm: gasPpm,
          cambien: nodeId,
          cambien_idnode: nodeId,
        }])
        .select();

      if (error) throw error;
      return data[0];
    } catch (err) {
      logger.error(`Lỗi khi ghi dữ liệu gas từ Node ${nodeId}:`, err.message);
      throw err;
    }
  },

  /**
   * Lấy trạng thái hiện tại của thiết bị
   */
  async getThietBiStatus(idThietBi) {
    try {
      const { data, error } = await supabase
        .from('thietbi')
        .select('*')
        .eq('id_thietbi', idThietBi)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      logger.error(`Lỗi khi lấy trạng thái thiết bị ID=${idThietBi}:`, err.message);
      throw err;
    }
  },

  /**
   * Cập nhật trạng thái thiết bị trong bảng thietbi
   */
  async updateThietBiStatus(idThietBi, statusVal) {
    try {
      const { data, error } = await supabase
        .from('thietbi')
        .update({ trangthai: statusVal, thoigian_capnhat: new Date().toISOString() })
        .eq('id_thietbi', idThietBi)
        .select();

      if (error) throw error;
      return data[0];
    } catch (err) {
      logger.error(`Lỗi khi cập nhật trạng thái thietbi ID=${idThietBi}:`, err.message);
      throw err;
    }
  },

  /**
   * Cập nhật trạng thái thiết bị theo Node và Loại (cho tương thích ngược)
   */
  async updateThietBiStatusByNodeAndType(idNode, loaiThietBi, statusVal) {
    try {
      const { data, error } = await supabase
        .from('thietbi')
        .update({ trangthai: statusVal, thoigian_capnhat: new Date().toISOString() })
        .eq('idnode', idNode)
        .eq('loai_thietbi', loaiThietBi)
        .select();

      if (error) throw error;
      return data;
    } catch (err) {
      logger.error(`Lỗi khi cập nhật trạng thái thietbi Node=${idNode}, Loại=${loaiThietBi}:`, err.message);
      throw err;
    }
  },

  /**
   * Đọc cấu hình luật tự động tương ứng
   */
  async getRuleByDevice(idThietBi) {
    try {
      const { data, error } = await supabase
        .from('luat')
        .select('automation')
        .eq('id_thietbi', idThietBi)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (err) {
      logger.error(`Lỗi khi đọc luật của thiết bị ID=${idThietBi}:`, err.message);
      throw err;
    }
  },

  /**
   * Cập nhật Chế độ tự động trong database
   */
  async updateRuleAutomation(idThietBi, autoVal) {
    try {
      const { data, error } = await supabase
        .from('luat')
        .update({ automation: autoVal })
        .eq('id_thietbi', idThietBi)
        .select();

      if (error) throw error;
      return data[0];
    } catch (err) {
      logger.error(`Lỗi khi cập nhật chế độ tự động cho thiết bị ID=${idThietBi}:`, err.message);
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
        .select('*, thietbi(*)');

      if (error) throw error;
      return data;
    } catch (err) {
      logger.error('Lỗi khi đọc danh sách lịch hẹn giờ từ Supabase:', err.message);
      throw err;
    }
  },

  /**
   * Ghi nhật ký hoạt động
   * @param {number} idThietBi - ID thiết bị
   * @param {string} actionText - Nội dung hành động
   * @param {number|null} idCambien - ID cảm biến
   * @param {number|null} idNguoidung - ID người dùng
   * @param {string|null} idnode - ID node
   * @param {string} loaiThongbao - Loại thông báo: 'user_action', 'system_alert', 'admin_notification', 'user_to_admin'
   */
  async writeActionLog(idThietBi, actionText, idCambien = null, idNguoidung = null, idnode = null, loaiThongbao = 'user_action') {
    try {
      // Nếu không có idnode, lấy từ idThietBi
      if (!idnode && idThietBi) {
        const { data: dev } = await supabase
          .from('thietbi')
          .select('idnode')
          .eq('id_thietbi', idThietBi)
          .maybeSingle();
        if (dev) idnode = dev.idnode;
      }

      // Nếu không có idNguoidung, tự động lấy từ esp32_nodes dựa trên idnode
      if (!idNguoidung && idnode) {
        const { data: node } = await supabase
          .from('esp32_nodes')
          .select('idnguoidung')
          .eq('idnode', idnode)
          .maybeSingle();
        if (node && node.idnguoidung) {
          idNguoidung = node.idnguoidung;
        }
      }

      const { error } = await supabase
        .from('nhatkyhoatdong')
        .insert([{
          idcambien: idCambien,
          idnguoidung: idNguoidung,
          id_thietbi: idThietBi,
          idnode: idnode,
          hanhdong: actionText,
          loai_thongbao: loaiThongbao
        }]);

      if (error) throw error;
    } catch (err) {
      logger.error('Lỗi khi ghi nhật ký hoạt động:', err.message);
    }
  },

  /**
   * Di chuyển idnode của một node sang idnode mới (migrate MAC address).
   * Cập nhật tất cả các bảng con có FK tham chiếu esp32_nodes.idnode.
   */
  async migrateNodeId(oldId, newId) {
    try {
      logger.info(`[Migrate] Bắt đầu di chuyển node "${oldId}" → "${newId}"`);

      // Lấy dữ liệu cũ trước khi xóa
      const { data: oldNode } = await supabase
        .from('esp32_nodes')
        .select('*')
        .eq('idnode', oldId)
        .maybeSingle();

      // 1. Cập nhật thietbi.idnode (FK ON DELETE CASCADE)
      const { error: e1 } = await supabase.from('thietbi').update({ idnode: newId }).eq('idnode', oldId);
      if (e1) logger.warn(`[Migrate] thietbi: ${e1.message}`);

      // 2. Cập nhật dulieucambien.cambien_idnode (FK ON DELETE SET NULL)
      const { error: e2 } = await supabase.from('dulieucambien').update({ cambien_idnode: newId }).eq('cambien_idnode', oldId);
      if (e2) logger.warn(`[Migrate] dulieucambien.cambien_idnode: ${e2.message}`);

      // 3. Cập nhật dulieucambien.cambien (không phải FK, nhưng dùng cho filter)
      const { error: e3 } = await supabase.from('dulieucambien').update({ cambien: newId }).eq('cambien', oldId);
      if (e3) logger.warn(`[Migrate] dulieucambien.cambien: ${e3.message}`);

      // 4. Cập nhật lichhengio.idnode (FK ON DELETE CASCADE)
      const { error: e4 } = await supabase.from('lichhengio').update({ idnode: newId }).eq('idnode', oldId);
      if (e4) logger.warn(`[Migrate] lichhengio: ${e4.message}`);

      // 5. Cập nhật nhatkyhoatdong.idnode (FK ON DELETE SET NULL)
      const { error: e5 } = await supabase.from('nhatkyhoatdong').update({ idnode: newId }).eq('idnode', oldId);
      if (e5) logger.warn(`[Migrate] nhatkyhoatdong: ${e5.message}`);

      // 6. Cập nhật canh_bao_ky_thuat.idnode (FK ON DELETE CASCADE)
      const { error: e6 } = await supabase.from('canh_bao_ky_thuat').update({ idnode: newId }).eq('idnode', oldId);
      if (e6) logger.warn(`[Migrate] canh_bao_ky_thuat: ${e6.message}`);

      // 7. Xóa node cũ (sau khi tất cả FK đã được chuyển)
      const { error: e7 } = await supabase.from('esp32_nodes').delete().eq('idnode', oldId);
      if (e7) throw new Error(`Không thể xóa node cũ "${oldId}": ${e7.message}`);

      logger.success(`[Migrate] Đã di chuyển node "${oldId}" → "${newId}" thành công.`);
      return oldNode;
    } catch (err) {
      logger.error(`[Migrate] Lỗi khi di chuyển node "${oldId}" → "${newId}":`, err.message);
      return null;
    }
  },

  /**
   * Cập nhật thông tin Heartbeat/Telemetry của Node
   */
  async updateNodeTelemetry(idnode, data) {
    try {
      const { rssi, cpu_temp, flash_used, firmware, ten_phong } = data;

      // Nếu node đã tồn tại → chỉ update telemetry, KHÔNG ghi đè ten_phong
      const { data: existing } = await supabase
        .from('esp32_nodes')
        .select('idnode, ten_phong')
        .eq('idnode', idnode)
        .maybeSingle();

      if (existing) {
        // Node đã có → chỉ update telemetry + heartbeat, giữ nguyên ten_phong
        const updatePayload = {
          rssi: rssi ?? existing.rssi ?? -50,
          cpu_temp: cpu_temp ?? existing.cpu_temp ?? 40.0,
          flash_used: flash_used ?? existing.flash_used ?? 45.0,
          firmware_version: firmware || '1.0.0',
          trang_thai: 'online',
          last_heartbeat: new Date().toISOString()
        };
        // Chỉ set ten_phong nếu caller truyền explicit
        if (ten_phong !== undefined && ten_phong !== null) {
          updatePayload.ten_phong = ten_phong;
        }
        const { data: result, error } = await supabase
          .from('esp32_nodes')
          .update(updatePayload)
          .eq('idnode', idnode)
          .select();
        if (error) throw error;
        return result?.[0];
      } else {
        // Node mới hoàn toàn → upsert với ten_phong mặc định
        const { data: result, error } = await supabase
          .from('esp32_nodes')
          .upsert([{
            idnode: idnode,
            ten_phong: ten_phong || 'Thiết bị chưa đặt tên',
            rssi: rssi ?? -50,
            cpu_temp: cpu_temp ?? 40.0,
            flash_used: flash_used ?? 45.0,
            firmware_version: firmware || '1.0.0',
            trang_thai: 'online',
            last_heartbeat: new Date().toISOString()
          }], { onConflict: 'idnode' })
          .select();
        if (error) throw error;
        return result?.[0];
      }
    } catch (err) {
      logger.error(`Lỗi khi cập nhật telemetry cho Node ID=${idnode}:`, err.message);
    }
  },

  /**
   * Kiểm tra xem node có trong danh sách blocked không
   */
  async isNodeBlocked(idnode) {
    try {
      const { data, error } = await supabase
        .from('blocked_nodes')
        .select('id')
        .eq('idnode', idnode)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (err) {
      logger.error(`Lỗi khi kiểm tra blocked node ${idnode}:`, err.message);
      return false;
    }
  },

  /**
   * Thêm node vào danh sách blocked
   */
  async blockNode(idnode, idnguoidung = null, ly_do = null) {
    try {
      const { error } = await supabase
        .from('blocked_nodes')
        .insert([{ idnode, idnguoidung, ly_do }]);

      if (error) throw error;
      logger.info(`[Blocked] Đã chặn node "${idnode}"`);
    } catch (err) {
      logger.error(`Lỗi khi block node ${idnode}:`, err.message);
    }
  },

  /**
   * Bỏ chặn node
   */
  async unblockNode(idnode) {
    try {
      const { error } = await supabase
        .from('blocked_nodes')
        .delete()
        .eq('idnode', idnode);

      if (error) throw error;
      logger.info(`[Blocked] Đã bỏ chặn node "${idnode}"`);
    } catch (err) {
      logger.error(`Lỗi khi unblock node ${idnode}:`, err.message);
    }
  },

  /**
   * Đặt trạng thái Node thành offline
   */
  async setNodeOffline(idnode) {
    try {
      const { data: result, error } = await supabase
        .from('esp32_nodes')
        .update({ trang_thai: 'offline' })
        .eq('idnode', idnode)
        .select();

      if (error) throw error;
      return result[0];
    } catch (err) {
      logger.error(`Lỗi khi đặt trạng thái offline cho Node ID=${idnode}:`, err.message);
    }
  },

  /**
   * Thêm cảnh báo kỹ thuật vào hệ thống
   */
  async insertTechnicalAlert(idnode, loai_loi, muc_do, chi_tiet) {
    try {
      const { data, error } = await supabase
        .from('canh_bao_ky_thuat')
        .insert([{
          idnode: idnode,
          loai_loi: loai_loi,
          muc_do: muc_do,
          chi_tiet: chi_tiet,
          trang_thai: 'unresolved'
        }])
        .select();

      if (error) throw error;
      return data[0];
    } catch (err) {
      logger.error(`Lỗi khi ghi nhận cảnh báo kỹ thuật Node ID=${idnode}:`, err.message);
    }
  },

  /**
   * Thêm nhật ký audit hành động admin
   */
  async insertAuditLog(idnguoidung, hoten, hanhdong, chi_tiet = null, ip_address = '127.0.0.1') {
    try {
      const { data, error } = await supabase
        .from('audit_log')
        .insert([{
          idnguoidung: idnguoidung,
          hoten: hoten,
          hanhdong: hanhdong,
          chi_tiet: chi_tiet,
          ip_address: ip_address
        }])
        .select();

      if (error) throw error;
      return data[0];
    } catch (err) {
      logger.error('Lỗi khi ghi audit log:', err.message);
    }
  },

  /**
   * Kiểm tra quyền truy cập điều khiển từ xa (Consent)
   */
  async isConsentActive(idnguoidung) {
    try {
      if (!idnguoidung) return false;
      const { data, error } = await supabase
        .from('remote_access_consent')
        .select('idconsent')
        .eq('idnguoidung', idnguoidung)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (err) {
      logger.error(`Lỗi khi kiểm tra consent của User ID=${idnguoidung}:`, err.message);
      return false;
    }
  },

  /**
   * Đăng ký kênh Realtime lắng nghe thay đổi trên bảng 'thietbi'
   */
  subscribeToDeviceChanges(callback) {
    logger.info('Đang kết nối kênh Realtime bảng "thietbi"...');
    const channel = supabase
      .channel('public:thietbi')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'thietbi' }, (payload) => {
        callback(payload.new, payload.old);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.success('Đã kết nối kênh Realtime bảng "thietbi"');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          logger.error(`Kênh Realtime "thietbi" gặp lỗi: ${status}. Vui lòng khởi động lại.`);
        }
      });
    return channel;
  },

  /**
   * Tự động tạo thietbi + luat cho node dựa trên mảng chuc_nang
   * Mapping chuc_nang → loai_thietbi:
   *   temp → cam_bien_nhietdo, humid → cam_bien_doam, light → cam_bien_anhsang
   *   gas_sensor → cam_bien_gas
   *   light_dev → den, fan_dev → quat, ac_dev → dieu_hoa, dehumidifier → may_hut_am
   */
  async createDevicesForNode(idnode, chuc_nang = []) {
    try {
      // Map chuc_nang → loai_thietbi + config mặc định
      const FUNC_MAP = {
        temp:         { loai: 'cam_bien_nhietdo', ten: 'Cảm biến Nhiệt độ',    hw: 'DHT11',     sensor: true,  luat: { loaicambien: 'NhietDo', toantu: '>', nguong: 30.0 } },
        humid:        { loai: 'cam_bien_doam',    ten: 'Cảm biến Độ ẩm',       hw: 'DHT11',     sensor: true,  luat: { loaicambien: 'DoAm',    toantu: '>', nguong: 75.0 } },
        light:        { loai: 'cam_bien_anhsang', ten: 'Cảm biến Ánh sáng',    hw: 'BH1750',    sensor: true,  luat: { loaicambien: 'AnhSang', toantu: '<', nguong: 200.0 } },
        gas_sensor:   { loai: 'cam_bien_gas',     ten: 'Cảm biến Gas MQ-2',    hw: 'ADC-34',    sensor: true,  luat: null },
        light_dev:    { loai: 'den',              ten: 'Đèn',                  hw: 'GPIO-2',    sensor: false },
        fan_dev:      { loai: 'quat',             ten: 'Quạt',                 hw: 'GPIO-4',    sensor: false },
        ac_dev:       { loai: 'dieu_hoa',         ten: 'Điều hòa',             hw: 'IR-TX-5',   sensor: false },
        dehumidifier: { loai: 'may_hut_am',       ten: 'Máy hút ẩm',          hw: 'GPIO-12',   sensor: false },
      };

      // Lấy chuc_nang hiện có trên node để tránh trùng lặp
      const { data: existingDevs } = await supabase
        .from('thietbi')
        .select('loai_thietbi')
        .eq('idnode', idnode);
      const existingTypes = new Set((existingDevs || []).map(d => d.loai_thietbi));

      const devicesToInsert = [];
      const luatToInsert = [];

      // Lấy idluat max hiện có để tránh trùng key
      const { data: maxLuat } = await supabase
        .from('luat')
        .select('idluat')
        .order('idluat', { ascending: false })
        .limit(1);
      let nextLuatId = (maxLuat && maxLuat.length > 0) ? maxLuat[0].idluat + 1 : 1;

      for (const func of chuc_nang) {
        const mapping = FUNC_MAP[func];
        if (!mapping) continue;
        if (existingTypes.has(mapping.loai)) continue;

        devicesToInsert.push({
          idnode,
          loai_thietbi: mapping.loai,
          ten_hienthi: mapping.ten,
          dia_chi_hw: mapping.hw,
          trangthai: 0,
          tu_dong: true,
          cau_hinh: mapping.loai === 'cam_bien_gas'
            ? { threshold: 300, unit: 'ppm', gas_type: 'LPG/Methane', warn_level: 200, danger_level: 300 }
            : {},
        });

        if (mapping.luat) {
          luatToInsert.push({
            idluat: nextLuatId++,
            id_thietbi: null, // sẽ update sau khi có id_thietbi
            loaicambien: mapping.luat.loaicambien,
            toantu: mapping.luat.toantu,
            nguong: mapping.luat.nguong,
            automation: true,
          });
        }
      }

      if (devicesToInsert.length === 0) {
        logger.info(`[Devices] Node "${idnode}" đã có đủ thiết bị hoặc không có chuc_nang mới.`);
        return;
      }

      // Insert thietbi
      const { data: insertedDevs, error: insertErr } = await supabase
        .from('thietbi')
        .insert(devicesToInsert)
        .select('id_thietbi, loai_thietbi');

      if (insertErr) throw insertErr;
      logger.success(`[Devices] Đã tạo ${insertedDevs.length} thiết bị cho node "${idnode}".`);

      // Map loai_thietbi → id_thietbi vừa insert để cập nhật luat
      const devIdMap = {};
      for (const d of insertedDevs) {
        devIdMap[d.loai_thietbi] = d.id_thietbi;
      }

      // Cập nhật luat.id_thietbi rồi insert
      if (luatToInsert.length > 0) {
        const luatWithIds = luatToInsert
          .map(l => {
            // Tìm loai_thietbi tương ứng
            const sensorFuncs = ['temp', 'humid', 'light'];
            for (const func of sensorFuncs) {
              const m = FUNC_MAP[func];
              if (m && m.luat && m.luat.loaicambien === l.loaicambien) {
                const devId = devIdMap[m.loai];
                if (devId) return { ...l, id_thietbi: devId };
              }
            }
            return null;
          })
          .filter(Boolean);

        if (luatWithIds.length > 0) {
          const { error: luatErr } = await supabase.from('luat').insert(luatWithIds);
          if (luatErr) logger.warn(`[Devices] Lỗi tạo luật tự động: ${luatErr.message}`);
          else logger.success(`[Devices] Đã tạo ${luatWithIds.length} luật tự động cho node "${idnode}".`);
        }
      }
    } catch (err) {
      logger.error(`[Devices] Lỗi khi tạo thiết bị cho node "${idnode}":`, err.message);
    }
  },

  /**
   * Tự động kiểm tra và tạo luật còn thiếu trong bảng luat cho các thiết bị
   */
  async ensureRulesExist() {
    try {
      const { data: maxLuat } = await supabase.from('luat').select('idluat').order('idluat', { ascending: false }).limit(1);
      let nextId = (maxLuat && maxLuat.length > 0) ? maxLuat[0].idluat + 1 : 1;

      const { data: devices } = await supabase.from('thietbi').select('*');
      if (!devices) return;

      for (const dev of devices) {
        const loai = dev.loai_thietbi;
        let sensorType = null;
        let operator = '>';
        let defaultThresh = 30.0;

        if (loai === 'cam_bien_nhietdo' || loai === 'dieu_hoa') {
          sensorType = 'NhietDo';
          operator = '>=';
          defaultThresh = Number(dev.cau_hinh?.threshold ?? 30.0);
        } else if (loai === 'cam_bien_doam' || loai === 'quat') {
          sensorType = 'DoAm';
          operator = '>=';
          defaultThresh = Number(dev.cau_hinh?.threshold ?? 75.0);
        } else if (loai === 'cam_bien_anhsang' || loai === 'den') {
          sensorType = 'AnhSang';
          operator = '<';
          defaultThresh = Number(dev.cau_hinh?.threshold ?? 200.0);
        }

        if (sensorType) {
          const { data: existing } = await supabase
            .from('luat')
            .select('*')
            .eq('id_thietbi', dev.id_thietbi)
            .eq('loaicambien', sensorType)
            .maybeSingle();

          if (!existing) {
            // Upsert vào bảng den để thỏa mãn foreign key constraint legacy (luat_idden_fkey)
            await supabase.from('den').upsert([{
              idden: dev.id_thietbi,
              tenden: dev.ten_hienthi || dev.loai_thietbi,
              trangthai: dev.trangthai || 0
            }]);

            await supabase
              .from('luat')
              .insert([{
                idluat: nextId++,
                id_thietbi: dev.id_thietbi,
                loaicambien: sensorType,
                toantu: operator,
                nguong: defaultThresh,
                automation: !!dev.tu_dong
              }]);
          }
        }
      }
    } catch (err) {
      logger.error('Lỗi khi tự động kiểm tra bảng luat:', err.message);
    }
  },

  /**
   * Đăng ký kênh Realtime lắng nghe thay đổi trên bảng 'luat'
   */
  subscribeToRuleChanges(callback) {
    logger.info('Đang kết nối kênh Realtime bảng "luat"...');
    const channel = supabase
      .channel('public:luat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'luat' }, (payload) => {
        callback(payload.new, payload.old);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.success('Đã kết nối kênh Realtime bảng "luat"');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          logger.error(`Kênh Realtime "luat" gặp lỗi: ${status}. Vui lòng khởi động lại.`);
        }
      });
    return channel;
  }
};

module.exports = supabaseService;
