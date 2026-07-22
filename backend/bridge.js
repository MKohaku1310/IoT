const { TOPICS, SETTINGS, TOPIC_PREFIX } = require('./config/config');
const logger = require('./utils/logger');
const supabaseService = require('./services/supabaseService');
const mqttService = require('./services/mqttService');
const automationService = require('./services/automationService');
const scheduleService = require('./services/scheduleService');

// Cấu hình hệ thống giám sát Fleet
let systemConfig = {
  hbTimeout: 60,
  rssiThreshold: -80,
  tempThreshold: 65
};

async function loadSystemConfig() {
  try {
    const { data, error } = await supabaseService.supabase
      .from('esp32_nodes')
      .select('*')
      .eq('idnode', 'SYSTEM_CONFIG')
      .maybeSingle();
    
    if (!error && data) {
      systemConfig.rssiThreshold = (data.rssi != null && !isNaN(Number(data.rssi))) ? Number(data.rssi) : -80;
      systemConfig.tempThreshold = (data.cpu_temp != null && !isNaN(parseFloat(data.cpu_temp))) ? parseFloat(data.cpu_temp) : 65;
      systemConfig.hbTimeout = (data.flash_used != null && !isNaN(parseFloat(data.flash_used))) ? parseFloat(data.flash_used) : 60;
    }
  } catch (err) {
    logger.error('Lỗi khi tải cấu hình hệ thống từ DB:', err.message);
  }
}

// Tải cấu hình hệ thống ban đầu
void loadSystemConfig();

// ==========================================
// 0. BỘ ĐỆM TRẠNG THÁI THIẾT BỊ (CHỐNG VÒNG LẶP DB ↔ MQTT PING-PONG)
// ==========================================
const localDeviceStateCache = new Map();

function updateLocalDeviceCache(idThietBi, trangthai, tuDong) {
  const existing = localDeviceStateCache.get(idThietBi) || {};
  localDeviceStateCache.set(idThietBi, {
    trangthai: trangthai !== undefined ? trangthai : existing.trangthai,
    tu_dong: tuDong !== undefined ? tuDong : existing.tu_dong
  });
}

// ==========================================
// 1. CẤU TRÚC GOM CỤM DỮ LIỆU CẢM BIẾN (BUFFER) - MULTI-NODE
// ==========================================
// Map theo nodeId: mỗi node có buffer telemetry riêng
const nodeTelemetryMap = new Map();

// Timer fallback map: mỗi node có timer riêng
const bufferFallbackTimers = new Map();

function getNodeTelemetry(nodeId) {
  if (!nodeTelemetryMap.has(nodeId)) {
    nodeTelemetryMap.set(nodeId, {
      temp: null,
      hum: null,
      lux: null,
      tempTime: 0,
      humTime: 0,
      luxTime: 0,
      nodeId: nodeId
    });
  }
  return nodeTelemetryMap.get(nodeId);
}

function startBufferFallbackTimer(nodeId) {
  if (bufferFallbackTimers.has(nodeId)) {
    clearTimeout(bufferFallbackTimers.get(nodeId));
  }
  
  const timer = setTimeout(async () => {
    const telemetry = getNodeTelemetry(nodeId);
    const { temp, hum, lux } = telemetry;
    const hasAny = temp !== null || hum !== null || lux !== null;
    if (!hasAny) return;
    
    // Nếu đủ 3 giá trị thì bỏ qua (đã được xử lý bởi logic gom cụm chính)
    if (temp !== null && hum !== null && lux !== null) return;
    
    const missing = [];
    if (temp === null) missing.push('Nhiệt độ');
    if (hum === null) missing.push('Độ ẩm');
    if (lux === null) missing.push('Ánh sáng');
    logger.warn(`[Cảm biến][${nodeId}] Timeout gom cụm! Thiếu: ${missing.join(', ')}. Lưu dữ liệu có sẵn.`);
    
    try {
      const record = await supabaseService.insertSensorData(temp, hum, lux, nodeId);
      if (!record) { logger.error('[Cảm biến] Insert không trả về bản ghi.'); return; }
      logger.success(`[Cảm biến][${nodeId}] Đã lưu bản ghi không đầy đủ ID=${record.iddl}.`);
      await automationService.evaluateRules(record);
    } catch (err) {
      logger.error(`[Cảm biến][${nodeId}] Lỗi khi lưu dữ liệu cảm biến không đầy đủ:`, err.message);
    }
    
    // Reset buffer
    telemetry.temp = null;
    telemetry.hum = null;
    telemetry.lux = null;
    bufferFallbackTimers.delete(nodeId);
  }, SETTINGS.BUFFER_TIMEOUT_MS + 2000);
  
  bufferFallbackTimers.set(nodeId, timer);
}

// Hàm ánh xạ loai_thietbi sang topic tương ứng (có nodeId)
function getDeviceTopics(loaiThietBi, nodeId) {
  const prefix = `${TOPIC_PREFIX}/${nodeId}`;
  if (loaiThietBi === 'dieu_hoa') return { ctrl: `${prefix}/led1`, autoCtrl: `${prefix}/automode1` };
  if (loaiThietBi === 'quat') return { ctrl: `${prefix}/led2`, autoCtrl: `${prefix}/automode2` };
  if (loaiThietBi === 'den') return { ctrl: `${prefix}/led3`, autoCtrl: `${prefix}/automode3` };
  return null;
}

// Hàm ánh xạ topic trạng thái sang loai_thietbi và nodeId
function getDeviceFromTopic(topic) {
  // Pattern: buivansang_iot_pj/{nodeId}/led/state, buivansang_iot_pj/{nodeId}/automode/state
  const parts = topic.split('/');
  if (parts.length < 4) return null;
  
  const nodeId = parts[1];
  const deviceType = parts[2]; // led, led2, led3, automode, automode2, automode3
  const stateType = parts[3]; // state
  
  if (stateType !== 'state') return null;
  
  let loaiThietBi = null;
  let type = null;
  
  if (deviceType === 'led1') { loaiThietBi = 'dieu_hoa'; type = 'status'; }
  else if (deviceType === 'led2') { loaiThietBi = 'quat'; type = 'status'; }
  else if (deviceType === 'led3') { loaiThietBi = 'den'; type = 'status'; }
  else if (deviceType === 'automode1') { loaiThietBi = 'dieu_hoa'; type = 'auto'; }
  else if (deviceType === 'automode2') { loaiThietBi = 'quat'; type = 'auto'; }
  else if (deviceType === 'automode3') { loaiThietBi = 'den'; type = 'auto'; }
  
  if (loaiThietBi) return { loaiThietBi, type, nodeId };
  return null;
}

// ==========================================
// 2. XỬ LÝ LỌC & GHI NHẬN DỮ LIỆU CẢM BIẾN - MULTI-NODE
// ==========================================
async function handleTelemetryInput(nodeId, sensorType, valueStr) {
  const value = parseFloat(valueStr);
  const now = Date.now();

  if (isNaN(value)) {
    logger.warn(`[Cảm biến][${nodeId}] Dữ liệu không hợp lệ (NaN) từ ${sensorType}: "${valueStr}"`);
    return;
  }

  const telemetry = getNodeTelemetry(nodeId);

  // A. Lọc dữ liệu dị thường dựa theo config LIMITS
  if (sensorType === 'temp') {
    if (value < SETTINGS.LIMITS.TEMP.MIN || value > SETTINGS.LIMITS.TEMP.MAX) {
      logger.warn(`[Cảm biến][${nodeId}] Nhiệt độ ngoài ngưỡng thực tế (${value}°C). Bỏ qua.`);
      return;
    }
    telemetry.temp = value;
    telemetry.tempTime = now;
  } 
  
  else if (sensorType === 'hum') {
    if (value < SETTINGS.LIMITS.HUM.MIN || value > SETTINGS.LIMITS.HUM.MAX) {
      logger.warn(`[Cảm biến][${nodeId}] Độ ẩm ngoài ngưỡng thực tế (${value}%). Bỏ qua.`);
      return;
    }
    telemetry.hum = value;
    telemetry.humTime = now;
  } 
  
  else if (sensorType === 'lux') {
    if (value < SETTINGS.LIMITS.LUX.MIN || value > SETTINGS.LIMITS.LUX.MAX) {
      logger.warn(`[Cảm biến][${nodeId}] Độ sáng ngoài ngưỡng thực tế (${value} lx). Bỏ qua.`);
      return;
    }
    telemetry.lux = value;
    telemetry.luxTime = now;
  }

  // Kích hoạt timer fallback mỗi khi nhận gói tin mới
  startBufferFallbackTimer(nodeId);

  // B. Gom cụm dữ liệu: Nếu cả 3 chỉ số đều có giá trị
  if (telemetry.temp !== null && telemetry.hum !== null && telemetry.lux !== null) {
    // Đo độ lệch thời gian lớn nhất giữa 3 gói tin
    const timestamps = [telemetry.tempTime, telemetry.humTime, telemetry.luxTime];
    const maxDiff = Math.max(...timestamps) - Math.min(...timestamps);

    if (maxDiff <= SETTINGS.BUFFER_TIMEOUT_MS) {
      const tempVal = telemetry.temp;
      const humVal = telemetry.hum;
      const luxVal = telemetry.lux;

      // Reset bộ đệm ngay lập tức để đón cụm tiếp theo
      telemetry.temp = null;
      telemetry.hum = null;
      telemetry.lux = null;
      // Hủy timer fallback vì đã ghi thành công đủ bộ
      if (bufferFallbackTimers.has(nodeId)) {
        clearTimeout(bufferFallbackTimers.get(nodeId));
        bufferFallbackTimers.delete(nodeId);
      }

      logger.info(`[Cảm biến][${nodeId}] Nhận đủ bộ: Nhiệt độ=${tempVal}°C, Độ ẩm=${humVal}%, Ánh sáng=${luxVal} lx. Đang ghi vào Supabase...`);

      try {
        const record = await supabaseService.insertSensorData(tempVal, humVal, luxVal, nodeId);
        if (!record) { logger.error('[Cảm biến] Insert không trả về bản ghi.'); return; }
        logger.success(`[Cảm biến][${nodeId}] Đã lưu bản ghi ID=${record.iddl} thành công.`);

        // Đánh giá luật tự động hóa với dữ liệu mới này
        await automationService.evaluateRules(record);
      } catch (err) {
        logger.error(`[Cảm biến][${nodeId}] Lỗi quy trình lưu dữ liệu và kiểm tra tự động:`, err.message);
      }
    } else {
      // Các gói tin lệch nhau quá lâu (quá 5 giây), dọn dẹp các giá trị cũ
      logger.warn(`[Cảm biến][${nodeId}] Các gói tin lệch nhau quá xa (${(maxDiff/1000).toFixed(1)}s). Reset bộ đệm.`);
      const oldestTime = now - SETTINGS.BUFFER_TIMEOUT_MS;
      if (telemetry.tempTime < oldestTime) telemetry.temp = null;
      if (telemetry.humTime < oldestTime) telemetry.hum = null;
      if (telemetry.luxTime < oldestTime) telemetry.lux = null;
    }
  }
}

// ==========================================
// 2.5. XỬ LÝ DỮ LIỆU CẢM BIẾN GAS MQ-2
// Topic: buivansang_iot_pj/{nodeId}/gas
// Ghi riêng vào dulieucambien.gas_ppm (không buffer với temp/hum/lux)
// ==========================================
async function handleGasInput(nodeId, valueStr) {
  const value = parseFloat(valueStr);

  if (isNaN(value)) {
    logger.warn(`[Gas] Dữ liệu gas không hợp lệ từ node ${nodeId}: "${valueStr}"`);
    return;
  }

  if (value < SETTINGS.LIMITS.GAS.MIN || value > SETTINGS.LIMITS.GAS.MAX) {
    logger.warn(`[Gas] Giá trị gas ngoài giới hạn hợp lệ (${value} ppm). Bỏ qua.`);
    return;
  }

  logger.info(`[Gas] Nhận giá trị từ Node=${nodeId}: ${value} ppm`);

  try {
    // Ghi bản ghi riêng cho gas (temp/hum/lux = null vì node bếp không có cảm biến đó)
    const record = await supabaseService.insertGasData(value, nodeId);
    logger.success(`[Gas] Đã lưu bản ghi gas ID=${record.iddl}, PPM=${value}.`);
  } catch (err) {
    logger.error(`[Gas] Lỗi ghi dữ liệu gas từ node ${nodeId}:`, err.message);
  }
}

// ==========================================
// 3. ĐỒNG BỘ TRẠNG THÁI THIẾT BỊ TỪ PHẦN CỨNG - MULTI-NODE
// ==========================================
async function handleDeviceStateInput(deviceInfo, valueStr) {
  const { loaiThietBi, type, nodeId } = deviceInfo;
  
  if (!nodeId) {
    logger.warn(`[Đồng bộ ESP32] Không thể xác định nodeId từ topic. Bỏ qua.`);
    return;
  }
  
  logger.info(`[Đồng bộ ESP32][${nodeId}] Nhận trạng thái phần cứng - Thiết bị Loại=${loaiThietBi}, Trạng thái=${valueStr}`);
  
  try {
    if (type === 'status') {
      const statusVal = valueStr === 'ON' ? 1 : 0;

      const { data: thietbiList } = await supabaseService.supabase
        .from('thietbi')
        .select('*')
        .eq('idnode', nodeId)
        .eq('loai_thietbi', loaiThietBi);

      if (thietbiList && thietbiList.length > 0) {
        const device = thietbiList[0];

        if (device.trangthai !== statusVal) {
          // Chỉ đồng bộ từ phần cứng vào DB khi thiết bị đang ở Chế độ Tự động
          if (device.tu_dong === true) {
            // Cập nhật bộ nhớ tạm ngay lập tức để không bị lặp sự kiện Realtime DB
            updateLocalDeviceCache(device.id_thietbi, statusVal, device.tu_dong);

            await supabaseService.updateThietBiStatus(device.id_thietbi, statusVal);
            logger.success(`[Đồng bộ DB][${nodeId}] Đã cập nhật trạng thái Thiết bị "${device.ten_hienthi}" thành ${statusVal === 1 ? 'Bật' : 'Tắt'} (Chế độ: Tự động)`);

            await supabaseService.writeActionLog(
              device.id_thietbi,
              `Phần cứng đồng bộ: ${statusVal === 1 ? 'Bật' : 'Tắt'} ${device.ten_hienthi}`,
              null,
              null,
              nodeId,
              'user_action'
            );
          } else {
            // Ở chế độ thủ công: Nếu ESP32 tự ý báo trạng thái khác DB, ép ESP32 quay về trạng thái chuẩn trong DB!
            logger.warn(`[Đồng bộ DB][${nodeId}] Thiết bị "${device.ten_hienthi}" đang ở Chế độ Thủ công nhưng ESP32 báo ${statusVal === 1 ? 'BẬT' : 'TẮT'} (DB=${device.trangthai === 1 ? 'BẬT' : 'TẮT'}). Gửi lệnh ép về DB.`);
            const topics = getDeviceTopics(device.loai_thietbi, nodeId);
            if (topics) {
              const expectedPayload = device.trangthai === 1 ? 'ON' : 'OFF';
              mqttService.publish(topics.ctrl, expectedPayload, { qos: 1 });
            }
          }
        } else {
          // Cập nhật cache nếu trạng thái đã khớp
          updateLocalDeviceCache(device.id_thietbi, statusVal, device.tu_dong);
        }
      }
    } 
    
    else if (type === 'auto') {
      const autoVal = valueStr === 'ON';

      const { data: thietbiList } = await supabaseService.supabase
        .from('thietbi')
        .select('id_thietbi, tu_dong')
        .eq('idnode', nodeId)
        .eq('loai_thietbi', loaiThietBi);

      if (thietbiList && thietbiList.length > 0) {
        const idThietBi = thietbiList[0].id_thietbi;
        const currentTuDong = thietbiList[0].tu_dong;

        // Cập nhật bộ nhớ tạm ngay lập tức
        updateLocalDeviceCache(idThietBi, undefined, autoVal);

        logger.info(`[Đồng bộ DB][${nodeId}] Nhận auto mode từ ESP32: ${autoVal ? 'BẬT' : 'TẮT'}, hiện tại trong DB: ${currentTuDong ? 'BẬT' : 'TẮT'}`);

        // Chỉ update nếu giá trị khác nhau
        if (currentTuDong !== autoVal) {
          // Đồng bộ thietbi.tu_dong (nguồn chân lý UI)
          const { error: thietbiErr } = await supabaseService.supabase
            .from('thietbi')
            .update({ tu_dong: autoVal })
            .eq('id_thietbi', idThietBi);
          if (thietbiErr) logger.error(`[Đồng bộ DB][${nodeId}] Lỗi cập nhật thietbi.tu_dong ID=${idThietBi}:`, thietbiErr.message);

          // Đồng bộ luat.automation
          const rule = await supabaseService.getRuleByDevice(idThietBi);
          if (rule && rule.automation !== autoVal) {
            await supabaseService.updateRuleAutomation(idThietBi, autoVal);
          }

          logger.success(`[Đồng bộ DB][${nodeId}] Đã cập nhật Chế độ tự động Thiết bị ID=${idThietBi} thành ${autoVal ? 'Bật' : 'Tắt'}`);
        } else {
          logger.info(`[Đồng bộ DB][${nodeId}] Bỏ qua cập nhật chế độ tự động (giá trị không thay đổi)`);
        }

        // Nếu chuyển sang chế độ tự động, lập tức đánh giá luật tự động hóa với dữ liệu cảm biến mới nhất
        if (autoVal) {
          let sensorData = null;
          const telemetry = getNodeTelemetry(nodeId);
          if (telemetry && (telemetry.temp !== null || telemetry.humid !== null || telemetry.lux !== null)) {
            sensorData = {
              nhietdo: telemetry.temp,
              doam: telemetry.humid,
              anhsang: telemetry.lux,
              idnode: nodeId
            };
          } else {
            // Fallback đọc dữ liệu cảm biến mới nhất từ DB
            const { data: latestRows } = await supabaseService.supabase
              .from('dulieucambien')
              .select('*')
              .or(`cambien.eq.${nodeId},cambien_idnode.eq.${nodeId}`)
              .order('thoigian', { ascending: false })
              .limit(1);
            if (latestRows && latestRows.length > 0) {
              sensorData = {
                nhietdo: latestRows[0].nhietdo != null ? Number(latestRows[0].nhietdo) : null,
                doam: latestRows[0].doam != null ? Number(latestRows[0].doam) : null,
                anhsang: latestRows[0].anhsang != null ? Number(latestRows[0].anhsang) : null,
                idnode: nodeId
              };
            }
          }

          if (sensorData) {
            await automationService.evaluateRules(sensorData);
          }
        }
      }
    }
  } catch (err) {
    logger.error(`[Đồng bộ ESP32][${nodeId}] Lỗi khi đồng bộ dữ liệu từ thiết bị vào database:`, err.message);
  }
}

// ==========================================
// 3.5. XỬ LÝ HEARTBEAT CỦA THIẾT BỊ (FLEET HEALTH)
// ==========================================
async function handleHeartbeatInput(nodeMac, valueStr) {
  try {
    let data = {};
    try {
      data = JSON.parse(valueStr);
    } catch (e) {
      const parsedNum = parseFloat(valueStr);
      if (!isNaN(parsedNum)) {
        data = { uptime: parsedNum };
      } else {
        logger.warn(`Heartbeat payload không phải JSON hợp lệ từ ${nodeMac}: "${valueStr}"`);
        return;
      }
    }
    
    logger.info(`[Heartbeat] Nhận tín hiệu từ Node=${nodeMac} (RSSI=${data.rssi || 'N/A'}, Temp=${data.cpu_temp || 'N/A'}°C)`);

    // Bỏ qua cập nhật telemetry đối với dòng cấu hình hệ thống
    if (nodeMac === 'SYSTEM_CONFIG') return;

    // Bỏ qua heartbeat từ node đã bị chặn (user đã xóa)
    const blocked = await supabaseService.isNodeBlocked(nodeMac);
    if (blocked) return;

    // --- Liên kết MAC address với node của user ---
    // Kiểm tra xem node với MAC này đã tồn tại chưa
    const { data: existingNode } = await supabaseService.supabase
      .from('esp32_nodes')
      .select('idnode')
      .eq('idnode', nodeMac)
      .maybeSingle();

    if (!existingNode) {
      // MAC chưa tồn tại → tìm node user đã tạo (có idnguoidung, chưa có phần cứng thật)
      // Bao gồm cả node 'approved' (đã kích hoạt) và 'pending' (user vừa gửi yêu cầu)
      const { data: userNodes } = await supabaseService.supabase
        .from('esp32_nodes')
        .select('*')
        .not('idnguoidung', 'is', null)
        .in('trang_thai_duyet', ['approved', 'pending']);

      let alreadyHandled = false;
      if (userNodes && userNodes.length > 0) {
        // Lấy node đầu tiên chưa nhận heartbeat (offline hoặc chưa có phần cứng)
        const dormantNode = userNodes.find(n => n.trang_thai !== 'online') || userNodes[0];
        if (dormantNode && dormantNode.idnode !== nodeMac) {
          logger.info(`[Heartbeat] Liên kết MAC "${nodeMac}" với node "${dormantNode.ten_phong}" (idnode cũ: ${dormantNode.idnode})`);
          const oldNode = await supabaseService.migrateNodeId(dormantNode.idnode, nodeMac);
          
          await supabaseService.updateNodeTelemetry(nodeMac, {
            ...data,
            ten_phong: oldNode?.ten_phong || data.ten_phong,
          });

          if (oldNode) {
            await supabaseService.supabase
              .from('esp32_nodes')
              .update({
                idnguoidung: oldNode.idnguoidung,
                id_hogiadinh: oldNode.id_hogiadinh,
                ten_phong: oldNode.ten_phong,
                loai_phong: oldNode.loai_phong,
                mo_ta: oldNode.mo_ta,
                chuc_nang: oldNode.chuc_nang,
                trang_thai_duyet: oldNode.trang_thai_duyet,
              })
              .eq('idnode', nodeMac);
          }

          if (oldNode?.chuc_nang?.length > 0) {
            await supabaseService.createDevicesForNode(nodeMac, oldNode.chuc_nang);
          }

          alreadyHandled = true;
        }
      }
      if (!alreadyHandled) {
        // MAC mới, không có node user nào để liên kết → tạo node mới bình thường
        await supabaseService.updateNodeTelemetry(nodeMac, data);
      }
    } else {
      await supabaseService.updateNodeTelemetry(nodeMac, data);
      
      // Kiểm tra xem node đã có thiết bị chưa, nếu chưa thì tạo tự động
      const { data: existingDevs } = await supabaseService.supabase
        .from('thietbi')
        .select('id_thietbi')
        .eq('idnode', nodeMac)
        .limit(1);
      
      if (!existingDevs || existingDevs.length === 0) {
        // Node chưa có thiết bị → lấy chuc_nang và tạo thiết bị
        const { data: nodeInfo } = await supabaseService.supabase
          .from('esp32_nodes')
          .select('chuc_nang')
          .eq('idnode', nodeMac)
          .maybeSingle();
        
        if (nodeInfo?.chuc_nang?.length > 0) {
          logger.info(`[Heartbeat][${nodeMac}] Node chưa có thiết bị, đang tự động tạo từ chuc_nang: ${nodeInfo.chuc_nang.join(', ')}`);
          await supabaseService.createDevicesForNode(nodeMac, nodeInfo.chuc_nang);
        }
      }
    }

    // 1. Kiểm tra cảnh báo sóng yếu (RSSI)
    if (data.rssi && data.rssi < systemConfig.rssiThreshold) {
      const { data: existing } = await supabaseService.supabase
        .from('canh_bao_ky_thuat')
        .select('*')
        .eq('idnode', nodeMac)
        .eq('loai_loi', 'rssi_weak')
        .eq('trang_thai', 'unresolved')
        .maybeSingle();

      if (!existing) {
        const detail = `Thiết bị ${nodeMac} có tín hiệu sóng Wi-Fi yếu (${data.rssi} dBm), dưới ngưỡng cấu hình (${systemConfig.rssiThreshold} dBm).`;
        await supabaseService.insertTechnicalAlert(nodeMac, 'rssi_weak', 'warning', detail);
        
        // Tự động thông báo cho user sở hữu thiết bị đó qua nhatkyhoatdong để hiển thị trên UI User
        const nodeInfo = await supabaseService.supabase
          .from('esp32_nodes')
          .select('idnguoidung, ten_phong')
          .eq('idnode', nodeMac)
          .maybeSingle();

        if (nodeInfo && nodeInfo.data && nodeInfo.data.idnguoidung) {
          await supabaseService.supabase.from('nhatkyhoatdong').insert([{
            idnguoidung: nodeInfo.data.idnguoidung,
            hanhdong: `[Cảnh báo thiết bị] Sóng Wi-Fi tại phòng ${nodeInfo.data.ten_phong || 'thiết bị'} đang rất yếu (${data.rssi} dBm). Vui lòng di chuyển thiết bị gần router hơn.`,
            loai_thongbao: 'system_alert'
          }]);
        }
      }
    }

    // 2. Kiểm tra cảnh báo quá nhiệt vi xử lý
    if (data.cpu_temp && data.cpu_temp > systemConfig.tempThreshold) {
      const { data: existing } = await supabaseService.supabase
        .from('canh_bao_ky_thuat')
        .select('*')
        .eq('idnode', nodeMac)
        .eq('loai_loi', 'cpu_overheat')
        .eq('trang_thai', 'unresolved')
        .maybeSingle();

      if (!existing) {
        const detail = `Vi xử lý của thiết bị ${nodeMac} bị quá nhiệt (${data.cpu_temp} °C), vượt ngưỡng cấu hình (${systemConfig.tempThreshold} °C).`;
        await supabaseService.insertTechnicalAlert(nodeMac, 'cpu_overheat', 'critical', detail);

        // Tự động thông báo cho user sở hữu thiết bị đó qua nhatkyhoatdong để hiển thị trên UI User
        const nodeInfo = await supabaseService.supabase
          .from('esp32_nodes')
          .select('idnguoidung, ten_phong')
          .eq('idnode', nodeMac)
          .maybeSingle();

        if (nodeInfo && nodeInfo.data && nodeInfo.data.idnguoidung) {
          await supabaseService.supabase.from('nhatkyhoatdong').insert([{
            idnguoidung: nodeInfo.data.idnguoidung,
            hanhdong: `[Cảnh báo thiết bị] Vi xử lý thiết bị tại phòng ${nodeInfo.data.ten_phong || 'thiết bị'} bị quá nhiệt (${data.cpu_temp} °C). Vui lòng tạm ngắt điện hoặc thông báo kỹ thuật viên.`,
            loai_thongbao: 'system_alert'
          }]);
        }
      }
    }
  } catch (err) {
    logger.error(`Lỗi xử lý heartbeat cho node ${nodeMac}:`, err.message);
  }
}

// Thiết lập interval kiểm tra Node offline (Heartbeat Timeout) mỗi 30 giây
setInterval(async () => {
  try {
    // Làm mới cấu hình hệ thống từ DB
    await loadSystemConfig();

    const { data: nodes, error } = await supabaseService.supabase
      .from('esp32_nodes')
      .select('*')
      .eq('trang_thai', 'online');

    if (error) throw error;
    if (!nodes || nodes.length === 0) return;

    const timeoutLimitMs = (systemConfig.hbTimeout || 60) * 1000;
    const now = new Date();

    for (const node of nodes) {
      if (node.idnode === 'SYSTEM_CONFIG') continue; // Bỏ qua dòng cấu hình hệ thống
      
      const lastHb = new Date(node.last_heartbeat);
      const diffMs = now.getTime() - lastHb.getTime();
      
      if (diffMs > timeoutLimitMs) {
        logger.warn(`[Node Timeout] Node "${node.idnode}" (${node.ten_phong}) mất heartbeat quá ${systemConfig.hbTimeout}s! Đổi trạng thái sang offline.`);
        await supabaseService.setNodeOffline(node.idnode);

        const { data: existingOffline } = await supabaseService.supabase
          .from('canh_bao_ky_thuat')
          .select('idcanhbao')
          .eq('idnode', node.idnode)
          .eq('loai_loi', 'mqtt_disconnect')
          .eq('trang_thai', 'unresolved')
          .maybeSingle();

        if (!existingOffline) {

        // Kiểm tra xem các thiết bị khác của cùng người dùng có ngoại tuyến hoặc chuẩn bị ngoại tuyến không
        let hasMultipleNodes = false;
        let isWholeHouseOutage = false;
        if (node.idnguoidung) {
          const { data: siblingNodes, error: siblingError } = await supabaseService.supabase
            .from('esp32_nodes')
            .select('idnode, last_heartbeat, trang_thai')
            .eq('idnguoidung', node.idnguoidung);

          if (!siblingError && siblingNodes) {
            if (siblingNodes.length > 1) {
              hasMultipleNodes = true;
              // Nếu toàn bộ thiết bị khác của người dùng này đều offline hoặc đã quá timeoutLimitMs
              isWholeHouseOutage = siblingNodes.every(sn => {
                if (sn.idnode === node.idnode) return true;
                if (sn.trang_thai === 'offline') return true;
                const snLastHb = new Date(sn.last_heartbeat);
                const snDiffMs = now.getTime() - snLastHb.getTime();
                return snDiffMs > timeoutLimitMs;
              });
            }
          }
        }

        let alertDetail = `Thiết bị ${node.idnode} (${node.ten_phong}) bị ngắt kết nối. `;
        if (hasMultipleNodes) {
          alertDetail += isWholeHouseOutage
            ? `Hệ thống phát hiện toàn bộ thiết bị thuộc tài khoản này đều mất liên lạc (Nghi ngờ mất điện hoặc mất Internet toàn nhà).`
            : `Các thiết bị khác cùng tài khoản vẫn hoạt động bình thường (Nghi ngờ lỗi cục bộ hoặc mất nguồn tại thiết bị này).`;
        } else {
          alertDetail += `Tài khoản chỉ có 1 thiết bị duy nhất nên không thể đối chiếu chéo trạng thái (Nghi ngờ mất điện nguồn hoặc mất kết nối Wi-Fi).`;
        }
        alertDetail += ` Heartbeat cuối nhận được lúc ${lastHb.toLocaleTimeString()}.`;

        await supabaseService.insertTechnicalAlert(
          node.idnode,
          'mqtt_disconnect',
          'critical',
          alertDetail
        );

          // Tự động gửi thông báo mất kết nối cho user qua nhatkyhoatdong
          if (node.idnguoidung) {
            await supabaseService.supabase.from('nhatkyhoatdong').insert([{
              idnguoidung: node.idnguoidung,
              hanhdong: `[Mất kết nối thiết bị] Thiết bị tại phòng ${node.ten_phong} đã ngoại tuyến. ${hasMultipleNodes && isWholeHouseOutage ? "Nghi ngờ mất điện hoặc mất kết nối Internet toàn nhà." : "Vui lòng kiểm tra nguồn điện hoặc kết nối Wi-Fi cục bộ."}`,
              loai_thongbao: 'system_alert'
            }]);
          }
        }
      }
    }
  } catch (err) {
    logger.error('Lỗi khi quét heartbeat node offline:', err.message);
  }
}, 30000);

// ==========================================
// 4. KHỞI CHẠY BRIDGE & ĐĂNG KÝ SỰ KIỆN
// ==========================================
function startBridge() {
  logger.info('--- KHỞI ĐỘNG HỆ THỐNG SMART HOME BRIDGE ---');

  // A. Kết nối MQTT và đăng ký lắng nghe tin nhắn
  mqttService.connect((topic, valueStr) => {
    // Kiểm tra loại topic nhận được
    const parts = topic.split('/');

    if (parts.length < 2) {
      logger.warn(`Topic MQTT không hợp lệ (thiếu phần): ${topic}`);
      return;
    }

    // Heartbeat: buivansang_iot_pj/{nodeId}/heartbeat
    if (topic.startsWith(`${TOPIC_PREFIX}/`) && topic.endsWith('/heartbeat')) {
      const nodeMac = parts[1];
      handleHeartbeatInput(nodeMac, valueStr);
    }
    // Gas sensor: buivansang_iot_pj/{nodeId}/gas
    else if (topic.startsWith(`${TOPIC_PREFIX}/`) && topic.endsWith('/gas')) {
      const nodeMac = parts[1];
      handleGasInput(nodeMac, valueStr);
    }
    // Telemetry cảm biến (temp/hum/lux) với nodeId: buivansang_iot_pj/{nodeId}/temp, /hum, /lux
    // Exclude threshold topics
    else if (topic.startsWith(`${TOPIC_PREFIX}/`) && !topic.includes('/threshold/') && (topic.endsWith('/temp') || topic.endsWith('/hum') || topic.endsWith('/lux'))) {
      const parts = topic.split('/');
      const nodeId = parts[1];
      const sensorType = topic.endsWith('/temp') ? 'temp' : topic.endsWith('/hum') ? 'hum' : 'lux';
      handleTelemetryInput(nodeId, sensorType, valueStr);
    }
    // Legacy topics cho backward compatibility (ESP32-S3-Node-01 cũ)
    else if (topic === TOPICS.TEMP_LEGACY || topic === TOPICS.HUM_LEGACY || topic === TOPICS.LUX_LEGACY) {
      const sensorType = topic === TOPICS.TEMP_LEGACY ? 'temp' : topic === TOPICS.HUM_LEGACY ? 'hum' : 'lux';
      // Sử dụng node mặc định PK1 cho legacy topics
      const nodeId = '98:2F:F6:75:06:DC';
      handleTelemetryInput(nodeId, sensorType, valueStr);
    }
    // Trạng thái thiết bị (LED state / automode state)
    else {
      const deviceInfo = getDeviceFromTopic(topic);
      if (deviceInfo) {
        handleDeviceStateInput(deviceInfo, valueStr);
      }
    }
  }, () => {
    logger.info('[MQTT Connected] Bắt đầu đồng bộ trạng thái ban đầu từ Database lên MQTT...');
    
    // Nạp cache ban đầu từ DB để tránh vòng lặp Realtime
    supabaseService.supabase.from('thietbi').select('id_thietbi, trangthai, tu_dong').then(({ data }) => {
      if (data) {
        data.forEach((d) => updateLocalDeviceCache(d.id_thietbi, d.trangthai, d.tu_dong));
        logger.info(`[State Cache] Đã nạp cache ban đầu cho ${data.length} thiết bị.`);
      }
    });

    // Chuẩn hóa và đồng bộ hai chiều giữa bảng luat và cau_hinh.threshold của thietbi trên tất cả các node
    supabaseService.ensureRulesExist().then(() => {
      supabaseService.supabase.from('thietbi').select('*').then(async ({ data: allDevs }) => {
      if (allDevs) {
        for (const dev of allDevs) {
          const loai = dev.loai_thietbi;
          const sensorType = loai === 'cam_bien_nhietdo' || loai === 'dieu_hoa' ? 'NhietDo'
            : loai === 'cam_bien_doam' || loai === 'quat' ? 'DoAm'
            : loai === 'cam_bien_anhsang' || loai === 'den' ? 'AnhSang' : null;

          if (sensorType) {
            const { data: rule } = await supabaseService.supabase
              .from('luat')
              .select('nguong')
              .eq('id_thietbi', dev.id_thietbi)
              .eq('loaicambien', sensorType)
              .maybeSingle();

            if (dev.cau_hinh && dev.cau_hinh.threshold !== undefined) {
              const thresh = Number(dev.cau_hinh.threshold);
              await supabaseService.supabase
                .from('luat')
                .update({ nguong: thresh })
                .eq('id_thietbi', dev.id_thietbi)
                .eq('loaicambien', sensorType);
            } else if (rule && rule.nguong != null) {
              const updatedCfg = { ...(dev.cau_hinh || {}), threshold: Number(rule.nguong) };
              await supabaseService.supabase
                .from('thietbi')
                .update({ cau_hinh: updatedCfg })
                .eq('id_thietbi', dev.id_thietbi);
            }
          }
        }
      }

      // Cập nhật các ngưỡng hiện có và chế độ tự động từ Database lên MQTT với cờ retain
      const rules = await supabaseService.getAllRules();
      const threshMap = {};

      for (const rule of rules) {
        try {
          if (rule.nguong !== undefined && rule.nguong !== null) {
            threshMap[rule.loaicambien] = Number(rule.nguong);
          }

          // Đồng bộ chế độ tự động hóa (Auto Mode) cho tất cả nodes
          const { data: tb } = await supabaseService.supabase.from('thietbi').select('loai_thietbi, idnode').eq('id_thietbi', rule.id_thietbi).maybeSingle();
          if (tb) {
            const deviceTopics = getDeviceTopics(tb.loai_thietbi, tb.idnode);
            if (deviceTopics) {
              const autoPayload = rule.automation ? 'ON' : 'OFF';
              logger.info(`[Đồng bộ Khởi chạy][${tb.idnode}] Gửi chế độ tự động hóa -> ${deviceTopics.autoCtrl}: ${autoPayload}`);
              mqttService.publish(deviceTopics.autoCtrl, autoPayload, { retain: true, qos: 1 });
            }
          }
        } catch (ruleErr) {
          logger.error(`[Đồng bộ Khởi chạy] Lỗi xử lý rule ID=${rule.idluat}:`, ruleErr.message);
        }
      }

      // Gửi các ngưỡng chuẩn lên MQTT với cờ retain (tránh bị trùng lặp / ghi đè bởi rule cũ)
      if (threshMap['NhietDo'] !== undefined) {
        logger.info(`[Đồng bộ Khởi chạy] Gửi ngưỡng cảm biến Nhiệt độ -> ${TOPICS.THRESHOLD_TEMP}: ${threshMap['NhietDo']}`);
        mqttService.publish(TOPICS.THRESHOLD_TEMP, String(threshMap['NhietDo']), { retain: true, qos: 1 });
      }
      if (threshMap['DoAm'] !== undefined) {
        logger.info(`[Đồng bộ Khởi chạy] Gửi ngưỡng cảm biến Độ ẩm -> ${TOPICS.THRESHOLD_HUM}: ${threshMap['DoAm']}`);
        mqttService.publish(TOPICS.THRESHOLD_HUM, String(threshMap['DoAm']), { retain: true, qos: 1 });
      }
      if (threshMap['AnhSang'] !== undefined) {
        logger.info(`[Đồng bộ Khởi chạy] Gửi ngưỡng cảm biến Ánh sáng -> ${TOPICS.THRESHOLD_LUX}: ${threshMap['AnhSang']}`);
        mqttService.publish(TOPICS.THRESHOLD_LUX, String(threshMap['AnhSang']), { retain: true, qos: 1 });
      }
      }).catch(err => {
        logger.error('Lỗi khi lấy quy tắc ban đầu từ database:', err.message);
      });
    });
  });

  // B. Đăng ký Realtime lắng nghe thay đổi trên bảng 'thietbi' (từ Web dashboard) để gửi xuống ESP32
  supabaseService.subscribeToDeviceChanges((updatedDevice) => {
    try {
      const cached = localDeviceStateCache.get(updatedDevice.id_thietbi);

      // Chỉ coi là thay đổi nếu khác với giá trị đã lưu trong cache cục bộ
      const statusChanged = cached && cached.trangthai !== undefined
        ? cached.trangthai !== updatedDevice.trangthai
        : true;
      const tuDongChanged = cached && cached.tu_dong !== undefined
        ? cached.tu_dong !== updatedDevice.tu_dong
        : true;

      // Cập nhật lại bộ nhớ tạm ngay lập tức
      updateLocalDeviceCache(updatedDevice.id_thietbi, updatedDevice.trangthai, updatedDevice.tu_dong);

      logger.info(`[Realtime DB] ↓ Nhận sự kiện UPDATE bảng "thietbi" - Thiết bị: "${updatedDevice.ten_hienthi}" (ID=${updatedDevice.id_thietbi})`);
      logger.info(`  Trạng thái mới: ${updatedDevice.trangthai === 1 ? 'BẬT' : 'TẮT'} | Thay đổi: ${statusChanged ? 'CÓ' : 'KHÔNG'}`);
      logger.info(`  Chế độ tự động mới: ${updatedDevice.tu_dong ? 'BẬT' : 'TẮT'} | Thay đổi: ${tuDongChanged ? 'CÓ' : 'KHÔNG'}`);

      if (statusChanged) {
        const topics = getDeviceTopics(updatedDevice.loai_thietbi, updatedDevice.idnode);
        if (topics) {
          const payloadStr = updatedDevice.trangthai === 1 ? 'ON' : 'OFF';
          logger.info(`  → [${updatedDevice.idnode}] Gửi lệnh MQTT: ${topics.ctrl} = ${payloadStr} (Chế độ: ${updatedDevice.tu_dong ? 'Tự động' : 'Thủ công'})`);
          mqttService.publish(topics.ctrl, payloadStr, { qos: 1 });
        } else {
          logger.warn(`  ⚠ [${updatedDevice.idnode}] Không tìm được topic MQTT cho thiết bị loại=${updatedDevice.loai_thietbi}`);
        }
      }

      // Gửi lệnh auto mode xuống ESP32 khi tu_dong thay đổi
      if (tuDongChanged) {
        const topics = getDeviceTopics(updatedDevice.loai_thietbi, updatedDevice.idnode);
        if (topics && topics.autoCtrl) {
          const autoPayload = updatedDevice.tu_dong ? 'ON' : 'OFF';
          logger.info(`  → [${updatedDevice.idnode}] Gửi lệnh MQTT auto mode: ${topics.autoCtrl} = ${autoPayload}`);
          mqttService.publish(topics.autoCtrl, autoPayload, { retain: true, qos: 1 });
        } else {
          logger.warn(`  ⚠ [${updatedDevice.idnode}] Không tìm được topic auto mode cho thiết bị loại=${updatedDevice.loai_thietbi}`);
        }
      }
    } catch (err) {
      logger.error('[Realtime DB] Lỗi xử lý thay đổi device:', err.message);
    }
  });

  // C. Đăng ký Realtime lắng nghe thay đổi trên bảng 'luat' (từ Web dashboard) để gửi xuống ESP32
  supabaseService.subscribeToRuleChanges(async (updatedRule, oldRule) => {
    try {
      const cached = localDeviceStateCache.get(updatedRule.id_thietbi);
      const autoChanged = cached && cached.tu_dong !== undefined
        ? cached.tu_dong !== updatedRule.automation
        : (oldRule ? updatedRule.automation !== oldRule.automation : true);
      
      updateLocalDeviceCache(updatedRule.id_thietbi, undefined, updatedRule.automation);

      const nguongChanged = !oldRule || updatedRule.nguong !== oldRule.nguong;
      const sensorLabel = updatedRule.loaicambien === 'NhietDo' ? 'Nhiệt độ' : updatedRule.loaicambien === 'DoAm' ? 'Độ ẩm' : 'Ánh sáng';
      logger.info(`[Realtime DB] ↓ Nhận sự kiện UPDATE bảng "luat" - Luật ID=${updatedRule.idluat} (Thiết bị ID=${updatedRule.id_thietbi}, Cảm biến: ${sensorLabel})`);

      if (autoChanged) {
        const { data: tb } = await supabaseService.supabase.from('thietbi').select('loai_thietbi, idnode').eq('id_thietbi', updatedRule.id_thietbi).maybeSingle();
        if (tb) {
          const topics = getDeviceTopics(tb.loai_thietbi, tb.idnode);
          if (topics) {
            const payloadStr = updatedRule.automation ? 'ON' : 'OFF';
            logger.info(`  → [${tb.idnode}] Gửi lệnh MQTT chế độ tự động: ${topics.autoCtrl} = ${payloadStr}`);
            mqttService.publish(topics.autoCtrl, payloadStr, { qos: 1 });
          }
        }
      }
      
      // Gửi ngưỡng mới xuống ESP32 qua MQTT nếu người dùng đổi trên Web
      if (nguongChanged) {
        let topic = '';
        if (updatedRule.loaicambien === 'NhietDo') topic = TOPICS.THRESHOLD_TEMP;
        else if (updatedRule.loaicambien === 'DoAm') topic = TOPICS.THRESHOLD_HUM;
        else if (updatedRule.loaicambien === 'AnhSang') topic = TOPICS.THRESHOLD_LUX;
        
        if (topic) {
          logger.info(`  → Gửi ngưỡng mới MQTT: ${topic} = ${updatedRule.nguong}`);
          mqttService.publish(topic, String(updatedRule.nguong), { retain: true, qos: 1 });
        }

        // Đồng bộ thietbi.cau_hinh.threshold
        const { data: tb } = await supabaseService.supabase
          .from('thietbi')
          .select('cau_hinh')
          .eq('id_thietbi', updatedRule.id_thietbi)
          .maybeSingle();

        if (tb) {
          const updatedCfg = { ...(tb.cau_hinh || {}), threshold: Number(updatedRule.nguong) };
          await supabaseService.supabase
            .from('thietbi')
            .update({ cau_hinh: updatedCfg })
            .eq('id_thietbi', updatedRule.id_thietbi);
        }
      }

      // Đánh giá lại luật ngay lập tức với dữ liệu cảm biến mới nhất của node
      if (nguongChanged || autoChanged) {
        const { data: tb } = await supabaseService.supabase
          .from('thietbi')
          .select('idnode')
          .eq('id_thietbi', updatedRule.id_thietbi)
          .maybeSingle();

        if (tb && tb.idnode) {
          const telemetry = getNodeTelemetry(tb.idnode);
          if (telemetry && (telemetry.temp !== null || telemetry.hum !== null || telemetry.lux !== null)) {
            logger.info(`  → Đang đánh giá lại luật tự động hóa cho Node [${tb.idnode}]...`);
            await automationService.evaluateRules({
              nhietdo: telemetry.temp,
              doam: telemetry.hum,
              anhsang: telemetry.lux,
              idnode: tb.idnode
            });
          }
        }
      }
      
      if (!autoChanged && !nguongChanged) {
        logger.info('  (Không có thay đổi cần đồng bộ xuống ESP32)');
      }
    } catch (err) {
      logger.error('[Realtime DB] Lỗi xử lý thay đổi rule:', err.message);
    }
  });

  // D. Khởi chạy tiến trình kiểm tra hẹn giờ
  scheduleService.start();
}

// Chạy ứng dụng
startBridge();

// ==========================================
// HTTP Health-Check Server (Dùng để Render luôn tồn tại)
// UptimeRobot hoặc cron-job.org có thể ping endpoint này mỗi 10 phút
// để ngăn Render Free Tier tự tắt (spin-down sau 15 phút không có traffic)
// ==========================================
const http = require('http');
const https = require('https');
const PORT = process.env.PORT || 10000;

let serverStartTime = Date.now();

http.createServer((req, res) => {
  const url = req.url || '/';

  // Endpoint /health trả về JSON chi tiết cho uptime monitor
  if (url === '/health' || url === '/') {
    const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
    const status = {
      status: 'ok',
      service: 'Smart Home IoT Bridge',
      uptime_seconds: uptimeSeconds,
      mqtt_connected: mqttService.isConnected ? mqttService.isConnected() : 'unknown',
      timestamp: new Date().toISOString(),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found\n');
  }
}).listen(PORT, () => {
  logger.info(`Health-Check HTTP Server đang lắng nghe tại cổng ${PORT}`);

  // ==========================================
  // Self-Ping: Tự động gọi /health mỗi 10 phút
  // Giữ cho Render Free Tier không bao giờ spin-down
  // Không cần cấu hình UptimeRobot bên ngoài
  // ==========================================
  const SELF_PING_INTERVAL_MS = 10 * 60 * 1000; // 10 phút
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || null;

  if (RENDER_URL) {
    logger.info(`[Self-Ping] Đã bật tự động ping ${RENDER_URL}/health mỗi 10 phút để giữ Render luôn thức.`);
    setInterval(() => {
      const pingUrl = `${RENDER_URL}/health`;
      const httpMod = pingUrl.startsWith('https') ? https : http;
      httpMod.get(pingUrl, (res) => {
        res.resume();
        logger.info(`[Self-Ping] Đã ping thành công: ${pingUrl} → HTTP ${res.statusCode}`);
      }).on('error', (err) => {
        logger.warn(`[Self-Ping] Lỗi ping: ${err.message}`);
      });
    }, SELF_PING_INTERVAL_MS);
  } else {
    logger.info('[Self-Ping] Biến RENDER_EXTERNAL_URL chưa được đặt. Self-ping bị tắt (chế độ local/dev).');
  }
});

// Dọn dẹp tài nguyên khi tắt chương trình
function gracefulShutdown() {
  logger.info('Đang tắt tiến trình Bridge...');
  mqttService.close();
  setTimeout(() => process.exit(0), 2000);
}
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

