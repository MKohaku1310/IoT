/**
 * AI Data Service — Data Retrieval + Anomaly Detection Engine
 *
 * Cung cấp 2 khả năng chính:
 * 1. Anomaly Detection: phát hiện bất thường từ sensor data + device usage
 * 2. Data Context Retrieval: truy vấn dữ liệu thật từ Supabase để inject vào Gemini prompt
 */

import { supabase } from './supabase';

// ============================================================
// Types
// ============================================================

export interface AnomalyAlert {
  id: string;
  type: 'gas_creep' | 'device_overtime' | 'sensor_deviation' | 'night_activity';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  metric?: string;
  nodeId?: string;
  nodeName?: string;
  timestamp: Date;
  suggestedQuestion?: string; // câu hỏi gợi ý khi user muốn hỏi AI thêm
}

export interface HourlyStats {
  hour_slot: number;
  avg_temp: number | null;
  stddev_temp: number | null;
  avg_humid: number | null;
  stddev_humid: number | null;
  avg_light: number | null;
  stddev_light: number | null;
  avg_gas: number | null;
  stddev_gas: number | null;
  sample_count: number;
}

export interface GasReading {
  iddl: number;
  gas_ppm: number;
  thoigian: string;
}

export interface DeviceUsageStat {
  idnode: string;
  ten_phong: string;
  device_name: string;
  loai_thietbi: string;
  total_toggles: number;
  on_count: number;
  off_count: number;
  peak_hour: number | null;
  earliest_event: string | null;
  latest_event: string | null;
}

export interface ChatDataContext {
  sensorSummary: string;
  hourlyBreakdown: Array<{ hour: string; values: string }>;
  deviceStatus: Array<{ device: string; status: string }>;
  recentActivity: Array<{ time: string; action: string }>;
  schedules: Array<{ id: string; detail: string }>;
  technicalAlerts: Array<{ type: string; detail: string }>;
}

export interface SmartSuggestion {
  emoji: string;
  label: string;
  prompt: string;
  priority: number; // lower = higher priority
}

export interface NodeInfo {
  idnode: string;
  ten_phong: string;
  loai_phong: string;
}

// ============================================================
// Intent Detection — phân tích câu hỏi user
// ============================================================

export interface ParsedIntent {
  timeRange: 'today' | '7d' | '30d';
  nodeId: string | null;
  nodeName: string | null;
  metrics: string[];   // ['nhietdo', 'doam', 'anhsang', 'gas_ppm']
  isComparison: boolean; // so sánh giữa các phòng
  isTrend: boolean;      // hỏi về xu hướng
  isPeak: boolean;       // hỏi về giờ cao/thấp nhất
}

const TIME_KEYWORDS: Record<string, 'today' | '7d' | '30d'> = {
  'hôm nay': 'today',
  'hôm qua': 'today',
  'ngày nay': 'today',
  'sáng nay': 'today',
  'chiều nay': 'today',
  'tối nay': 'today',
  'tuần này': '7d',
  'tuần qua': '7d',
  'tuần trước': '7d',
  '7 ngày': '7d',
  'tháng này': '30d',
  'tháng qua': '30d',
  'tháng trước': '30d',
  '30 ngày': '30d',
};

const METRIC_KEYWORDS: Record<string, string> = {
  'nhiệt độ': 'nhietdo',
  'nóng': 'nhietdo',
  'lạnh': 'nhietdo',
  'mát': 'nhietdo',
  'nóng nhất': 'nhietdo',
  'lạnh nhất': 'nhietdo',
  'temp': 'nhietdo',
  'độ ẩm': 'doam',
  'ẩm': 'doam',
  'khô': 'doam',
  'humid': 'doam',
  'ánh sáng': 'anhsang',
  'sáng': 'anhsang',
  'tối': 'anhsang',
  'light': 'anhsang',
  'gas': 'gas_ppm',
  'khí gas': 'gas_ppm',
  'khí ga': 'gas_ppm',
  'rò rỉ': 'gas_ppm',
  'điện': 'nhietdo', // "tốn điện" → liên quan thiết bị, dùng temp như proxy
};

const COMPARISON_KEYWORDS = ['so sánh', 'so với', 'khác nhau', 'chênh lệch', 'hơn', 'kém'];
const TREND_KEYWORDS = ['xu hướng', 'biến thiên', 'thay đổi', 'biến động', 'trend', 'tăng', 'giảm'];
const PEAK_KEYWORDS = ['nhất', 'cao nhất', 'thấp nhất', 'đỉnh', 'peak', 'lúc nào', 'giờ nào', 'khi nào', 'bao giờ'];

export function parseUserIntent(query: string, nodes: NodeInfo[]): ParsedIntent {
  const q = query.toLowerCase().normalize('NFC');

  // 1. Detect time range
  let timeRange: 'today' | '7d' | '30d' = 'today';
  for (const [keyword, range] of Object.entries(TIME_KEYWORDS)) {
    if (q.includes(keyword)) {
      timeRange = range;
      break;
    }
  }

  // 2. Detect target node
  let nodeId: string | null = null;
  let nodeName: string | null = null;
  for (const node of nodes) {
    const name = node.ten_phong.toLowerCase();
    if (q.includes(name)) {
      nodeId = node.idnode;
      nodeName = node.ten_phong;
      break;
    }
  }
  // Fuzzy: "bếp" → "Nhà bếp", "khách" → "Phòng khách", "ngủ" → "Phòng ngủ"
  if (!nodeId) {
    const fuzzyMap: Record<string, string> = {};
    for (const node of nodes) {
      const n = node.ten_phong.toLowerCase();
      if (n.includes('bếp')) fuzzyMap['bếp'] = node.idnode;
      if (n.includes('khách')) fuzzyMap['khách'] = node.idnode;
      if (n.includes('ngủ')) fuzzyMap['ngủ'] = node.idnode;
      if (n.includes('tắm')) fuzzyMap['tắm'] = node.idnode;
    }
    for (const [keyword, id] of Object.entries(fuzzyMap)) {
      if (q.includes(keyword)) {
        nodeId = id;
        nodeName = nodes.find(n => n.idnode === id)?.ten_phong || null;
        break;
      }
    }
  }

  // 3. Detect metrics
  const metrics: string[] = [];
  for (const [keyword, metric] of Object.entries(METRIC_KEYWORDS)) {
    if (q.includes(keyword) && !metrics.includes(metric)) {
      metrics.push(metric);
    }
  }

  // 4. Detect question type
  const isComparison = COMPARISON_KEYWORDS.some(k => q.includes(k));
  const isTrend = TREND_KEYWORDS.some(k => q.includes(k));
  const isPeak = PEAK_KEYWORDS.some(k => q.includes(k));

  return { timeRange, nodeId, nodeName, metrics, isComparison, isTrend, isPeak };
}

// ============================================================
// Data Retrieval — truy vấn Supabase
// ============================================================

/**
 * Lấy thống kê theo giờ cho anomaly detection
 */
export async function fetchAnomalyContext(nodeId?: string): Promise<HourlyStats[]> {
  try {
    const { data, error } = await supabase.rpc('get_anomaly_context', {
      p_node_id: nodeId || null,
    });
    if (error) throw error;
    return (data || []) as HourlyStats[];
  } catch (err) {
    console.warn('[AI] Lỗi lấy anomaly context (RPC có thể chưa được tạo):', err);
    // Fallback: query trực tiếp
    return fetchAnomalyContextFallback(nodeId);
  }
}

async function fetchAnomalyContextFallback(nodeId?: string): Promise<HourlyStats[]> {
  try {
    let query = supabase
      .from('dulieucambien')
      .select('nhietdo, doam, anhsang, gas_ppm, thoigian')
      .gte('thoigian', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('thoigian', { ascending: false })
      .limit(300);

    if (nodeId) {
      query = query.eq('cambien_idnode', nodeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Group by hour and compute stats
    const hourGroups: Record<number, { temps: number[]; humids: number[]; lights: number[]; gases: number[] }> = {};

    for (const row of data) {
      const h = new Date(row.thoigian).getHours();
      if (!hourGroups[h]) hourGroups[h] = { temps: [], humids: [], lights: [], gases: [] };
      if (row.nhietdo != null) hourGroups[h].temps.push(Number(row.nhietdo));
      if (row.doam != null) hourGroups[h].humids.push(Number(row.doam));
      if (row.anhsang != null) hourGroups[h].lights.push(Number(row.anhsang));
      if (row.gas_ppm != null) hourGroups[h].gases.push(Number(row.gas_ppm));
    }

    return Object.entries(hourGroups).map(([hour, g]) => ({
      hour_slot: Number(hour),
      avg_temp: avg(g.temps),
      stddev_temp: stddev(g.temps),
      avg_humid: avg(g.humids),
      stddev_humid: stddev(g.humids),
      avg_light: avg(g.lights),
      stddev_light: stddev(g.lights),
      avg_gas: avg(g.gases),
      stddev_gas: stddev(g.gases),
      sample_count: g.temps.length + g.gases.length,
    }));
  } catch {
    return [];
  }
}

/**
 * Lấy gas readings gần nhất
 */
export async function fetchRecentGasReadings(nodeId = 'ESP32-C3-Kitchen', limit = 10): Promise<GasReading[]> {
  try {
    const { data, error } = await supabase.rpc('get_recent_gas_readings', {
      p_node_id: nodeId,
      p_limit: limit,
    });
    if (error) throw error;
    return (data || []) as GasReading[];
  } catch {
    // Fallback
    try {
      const { data, error } = await supabase
        .from('dulieucambien')
        .select('iddl, gas_ppm, thoigian')
        .eq('cambien_idnode', nodeId)
        .not('gas_ppm', 'is', null)
        .order('thoigian', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as GasReading[];
    } catch {
      return [];
    }
  }
}

/**
 * Lấy data context cho AI Chat
 */
export async function fetchChatDataContext(
  timeRange: 'today' | '7d' | '30d',
  nodeId?: string | null
): Promise<ChatDataContext> {
  const result: ChatDataContext = {
    sensorSummary: '',
    hourlyBreakdown: [],
    deviceStatus: [],
    recentActivity: [],
    schedules: [],
    technicalAlerts: [],
  };

  try {
    const { data, error } = await supabase.rpc('get_ai_chat_context', {
      p_range: timeRange,
      p_node_id: nodeId || null,
    });
    if (error) throw error;

    for (const row of (data || [])) {
      switch (row.context_type) {
        case 'sensor_summary':
          result.sensorSummary = row.context_value;
          break;
        case 'hourly_breakdown':
          result.hourlyBreakdown.push({ hour: row.context_key, values: row.context_value });
          break;
        case 'device_status':
          result.deviceStatus.push({ device: row.context_key, status: row.context_value });
          break;
        case 'recent_activity':
          result.recentActivity.push({ time: row.context_key, action: row.context_value });
          break;
        case 'schedules':
          result.schedules.push({ id: row.context_key, detail: row.context_value });
          break;
        case 'technical_alerts':
          result.technicalAlerts.push({ type: row.context_key, detail: row.context_value });
          break;
      }
    }
  } catch (err) {
    console.warn('[AI] Lỗi lấy chat context (RPC có thể chưa được tạo), dùng fallback:', err);
    return await fetchChatDataContextFallback(timeRange, nodeId);
  }

  return result;
}

/**
 * Fallback khi RPC chưa được tạo — query trực tiếp các bảng song song
 */
async function fetchChatDataContextFallback(
  timeRange: 'today' | '7d' | '30d',
  nodeId?: string | null
): Promise<ChatDataContext> {
  const result: ChatDataContext = {
    sensorSummary: '',
    hourlyBreakdown: [],
    deviceStatus: [],
    recentActivity: [],
    schedules: [],
    technicalAlerts: [],
  };

  const intervalMs = timeRange === 'today' ? 24 * 3600000 : timeRange === '7d' ? 7 * 24 * 3600000 : 30 * 24 * 3600000;
  const since = new Date(Date.now() - intervalMs).toISOString();

  try {
    // 1. Chuẩn bị các queries
    let sQuery = supabase
      .from('dulieucambien')
      .select('nhietdo, doam, anhsang, gas_ppm, thoigian')
      .gte('thoigian', since)
      .order('thoigian', { ascending: false })
      .limit(300);
    if (nodeId) sQuery = sQuery.eq('cambien_idnode', nodeId);

    let dQuery = supabase
      .from('thietbi')
      .select('ten_hienthi, trangthai, tu_dong, thoigian_capnhat, idnode, esp32_nodes!inner(ten_phong)')
      .neq('idnode', 'SYSTEM_CONFIG');
    if (nodeId) dQuery = dQuery.eq('idnode', nodeId);

    let aQuery = supabase
      .from('nhatkyhoatdong')
      .select('hanhdong, thoigian, idnode')
      .gte('thoigian', since)
      .order('thoigian', { ascending: false })
      .limit(15);
    if (nodeId) aQuery = aQuery.eq('idnode', nodeId);

    let schQuery = supabase
      .from('lichhengio')
      .select('idid, id_thietbi, hanhdong, thoigian, thu, kichhoat, idnode');
    if (nodeId) schQuery = schQuery.eq('idnode', nodeId);

    // 2. Chạy tất cả query song song để tối ưu tốc độ
    const [
      { data: sensorRows },
      { data: deviceRows },
      { data: actRows },
      { data: schRows },
    ] = await Promise.all([sQuery, dQuery, aQuery, schQuery]);

    if (sensorRows && sensorRows.length > 0) {
      const temps = sensorRows.map(r => r.nhietdo).filter((v): v is number => v != null);
      const humids = sensorRows.map(r => r.doam).filter((v): v is number => v != null);
      const lights = sensorRows.map(r => r.anhsang).filter((v): v is number => v != null);
      const gases = sensorRows.map(r => r.gas_ppm).filter((v): v is number => v != null);

      result.sensorSummary = [
        temps.length > 0 ? `Nhiệt độ: min=${Math.min(...temps).toFixed(1)}°C, max=${Math.max(...temps).toFixed(1)}°C, avg=${avg(temps)?.toFixed(1)}°C` : '',
        humids.length > 0 ? `Độ ẩm: min=${Math.min(...humids).toFixed(1)}%, max=${Math.max(...humids).toFixed(1)}%, avg=${avg(humids)?.toFixed(1)}%` : '',
        lights.length > 0 ? `Ánh sáng: min=${Math.min(...lights).toFixed(0)} lx, max=${Math.max(...lights).toFixed(0)} lx, avg=${avg(lights)?.toFixed(0)} lx` : '',
        gases.length > 0 ? `Gas: min=${Math.min(...gases).toFixed(0)} ppm, max=${Math.max(...gases).toFixed(0)} ppm, avg=${avg(gases)?.toFixed(0)} ppm` : '',
        `Tổng mẫu: ${sensorRows.length}`,
      ].filter(Boolean).join(' | ');

      // Hourly breakdown
      const hourGroups: Record<number, typeof sensorRows> = {};
      for (const row of sensorRows) {
        const h = new Date(row.thoigian).getHours();
        if (!hourGroups[h]) hourGroups[h] = [];
        hourGroups[h].push(row);
      }
      for (const [hour, rows] of Object.entries(hourGroups)) {
        const t = avg(rows.map(r => r.nhietdo).filter((v): v is number => v != null));
        const hu = avg(rows.map(r => r.doam).filter((v): v is number => v != null));
        const l = avg(rows.map(r => r.anhsang).filter((v): v is number => v != null));
        const g = avg(rows.map(r => r.gas_ppm).filter((v): v is number => v != null));
        result.hourlyBreakdown.push({
          hour: `${String(hour).padStart(2, '0')}:00`,
          values: `temp=${t?.toFixed(1) ?? 'N/A'}, humid=${hu?.toFixed(1) ?? 'N/A'}, light=${l?.toFixed(0) ?? 'N/A'}, gas=${g?.toFixed(0) ?? 'N/A'}`,
        });
      }
      result.hourlyBreakdown.sort((a, b) => a.hour.localeCompare(b.hour));
    }

    if (deviceRows) {
      for (const d of deviceRows) {
        const nodePh = (d as any).esp32_nodes?.ten_phong || '';
        result.deviceStatus.push({
          device: `${d.ten_hienthi} (${nodePh})`,
          status: `trạng thái=${d.trangthai === 1 ? 'BẬT' : 'TẮT'}, chế_độ=${d.tu_dong ? 'Tự động' : 'Thủ công'}`,
        });
      }
    }

    if (actRows) {
      for (const a of actRows) {
        const t = new Date(a.thoigian);
        result.recentActivity.push({
          time: `${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')} ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`,
          action: `${a.hanhdong} [node: ${a.idnode || 'N/A'}]`,
        });
      }
    }

    if (schRows) {
      for (const s of schRows) {
        result.schedules.push({
          id: `ID ${s.idid}`,
          detail: `Thiết bị id=${s.id_thietbi ?? 'N/A'}, hành_động=${s.hanhdong}, giờ=${s.thoigian}, các_thứ=${(s.thu || []).join(',')}, kích_hoạt=${s.kichhoat ? 'Có' : 'Không'}`,
        });
      }
    }
  } catch (err) {
    console.warn('[AI] Fallback chat context cũng bị lỗi:', err);
  }

  return result;
}

// ============================================================
// Anomaly Detection Engine
// ============================================================

/**
 * Phát hiện bất thường từ dữ liệu hiện tại + thống kê lịch sử
 */
export async function detectAnomalies(
  currentSensors: { temp: number | null; humid: number | null; light: number | null; gas?: number },
  nodeId?: string,
  nodeName?: string,
  allNodes?: NodeInfo[]
): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = [];
  const now = new Date();
  const currentHour = now.getHours();

  try {
    // 1. Lấy thống kê lịch sử theo giờ
    const hourlyStats = await fetchAnomalyContext(nodeId);
    const currentHourStats = hourlyStats.find(h => h.hour_slot === currentHour);

    // 2. Gas Creep Detection — gas tăng dần dù chưa vượt ngưỡng cứng
    if (currentSensors.gas !== undefined && currentSensors.gas > 0) {
      // Lấy node bếp nếu không chỉ định
      const kitchenNodeId = nodeId || allNodes?.find(n => n.loai_phong === 'nha_bep')?.idnode || 'ESP32-C3-Kitchen';
      const gasReadings = await fetchRecentGasReadings(kitchenNodeId, 5);

      if (gasReadings.length >= 3) {
        const values = gasReadings.map(r => Number(r.gas_ppm)).reverse(); // oldest first
        let consecutiveIncreases = 0;
        for (let i = 1; i < values.length; i++) {
          if (values[i] > values[i - 1] * 1.05) { // tăng >5%
            consecutiveIncreases++;
          } else {
            consecutiveIncreases = 0;
          }
        }

        if (consecutiveIncreases >= 2) {
          const increasePercent = ((values[values.length - 1] - values[0]) / values[0] * 100).toFixed(1);
          const severity = currentSensors.gas > 200 ? 'critical' : currentSensors.gas > 100 ? 'warning' : 'info';
          alerts.push({
            id: `gas_creep_${Date.now()}`,
            type: 'gas_creep',
            severity,
            title: '🔥 Gas tăng dần bất thường',
            detail: `Nồng độ gas đang tăng liên tục ${consecutiveIncreases + 1} lần đọc (${values[0].toFixed(0)} → ${values[values.length - 1].toFixed(0)} ppm, +${increasePercent}%). Hiện tại: ${currentSensors.gas.toFixed(0)} ppm. Ngưỡng cứng: 300 ppm.`,
            metric: 'gas_ppm',
            nodeId: kitchenNodeId,
            nodeName: 'Nhà bếp',
            timestamp: now,
            suggestedQuestion: 'Phân tích chi tiết xu hướng gas nhà bếp và đánh giá mức độ nguy hiểm',
          });
        }
      }
    }

    // 3. Sensor Deviation — nhiệt độ/độ ẩm bất thường so với cùng khung giờ
    if (currentHourStats) {
      // Temperature deviation
      if (currentSensors.temp != null && currentHourStats.avg_temp != null && currentHourStats.stddev_temp != null && currentHourStats.stddev_temp > 0) {
        const zScore = Math.abs(currentSensors.temp - Number(currentHourStats.avg_temp)) / Number(currentHourStats.stddev_temp);
        if (zScore > 2) {
          const direction = currentSensors.temp > Number(currentHourStats.avg_temp) ? 'cao hơn' : 'thấp hơn';
          alerts.push({
            id: `temp_dev_${Date.now()}`,
            type: 'sensor_deviation',
            severity: zScore > 3 ? 'warning' : 'info',
            title: `🌡️ Nhiệt độ ${direction} bất thường`,
            detail: `Nhiệt độ hiện tại ${currentSensors.temp}°C ${direction} trung bình khung giờ ${currentHour}h (TB: ${Number(currentHourStats.avg_temp).toFixed(1)}°C ± ${Number(currentHourStats.stddev_temp).toFixed(1)}°C). Z-score: ${zScore.toFixed(1)}.`,
            metric: 'nhietdo',
            nodeId,
            nodeName,
            timestamp: now,
            suggestedQuestion: `Tại sao nhiệt độ ${nodeName || 'phòng'} hôm nay bất thường so với các ngày trước?`,
          });
        }
      }

      // Humidity deviation
      if (currentSensors.humid != null && currentHourStats.avg_humid != null && currentHourStats.stddev_humid != null && currentHourStats.stddev_humid > 0) {
        const zScore = Math.abs(currentSensors.humid - Number(currentHourStats.avg_humid)) / Number(currentHourStats.stddev_humid);
        if (zScore > 2) {
          const direction = currentSensors.humid > Number(currentHourStats.avg_humid) ? 'cao hơn' : 'thấp hơn';
          alerts.push({
            id: `humid_dev_${Date.now()}`,
            type: 'sensor_deviation',
            severity: zScore > 3 ? 'warning' : 'info',
            title: `💧 Độ ẩm ${direction} bất thường`,
            detail: `Độ ẩm hiện tại ${currentSensors.humid}% ${direction} trung bình khung giờ ${currentHour}h (TB: ${Number(currentHourStats.avg_humid).toFixed(1)}% ± ${Number(currentHourStats.stddev_humid).toFixed(1)}%). Z-score: ${zScore.toFixed(1)}.`,
            metric: 'doam',
            nodeId,
            nodeName,
            timestamp: now,
            suggestedQuestion: `Phân tích xu hướng độ ẩm ${nodeName || 'phòng'} trong tuần qua`,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[AI] Lỗi detect anomaly:', err);
  }

  return alerts;
}

// ============================================================
// Smart Suggestions — gợi ý câu hỏi thông minh theo context dự án Smart Home
// ============================================================

export function buildSmartSuggestions(
  sensors: { temp: number | null; humid: number | null; light: number | null; gas?: number },
  anomalies: AnomalyAlert[],
  nodeName: string,
  _currentHour: number
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const roomLabel = nodeName || "Phòng";

  // 1. Ưu tiên hàng đầu cho Anomaly Alerts nếu có
  for (const anomaly of anomalies.slice(0, 2)) {
    if (anomaly.suggestedQuestion) {
      suggestions.push({
        emoji: anomaly.type === 'gas_creep' ? '🔥' : anomaly.type === 'sensor_deviation' ? '📊' : '⚠️',
        label: anomaly.title.replace(/^[^\s]+\s*/, ''), // bỏ emoji prefix
        prompt: anomaly.suggestedQuestion,
        priority: 0,
      });
    }
  }

  // 2. Gợi ý an toàn Gas (Đặc biệt cho Bếp hoặc khi có chỉ số Gas)
  if (sensors.gas !== undefined && sensors.gas !== null) {
    if (sensors.gas > 100) {
      suggestions.push({
        emoji: '🚨',
        label: `Cảnh báo Gas ${sensors.gas.toFixed(0)} ppm`,
        prompt: `Nồng độ khí Gas tại ${roomLabel} hiện đang là ${sensors.gas.toFixed(0)} ppm. Hãy đánh giá độ an toàn và đưa ra hướng dẫn xử lý khẩn cấp!`,
        priority: 1,
      });
    } else {
      suggestions.push({
        emoji: '⛽',
        label: `An toàn Gas ${roomLabel}`,
        prompt: `Kiểm tra chỉ số khí Gas hiện tại (${sensors.gas.toFixed(0)} ppm) tại ${roomLabel} và đánh giá nguy cơ rò rỉ.`,
        priority: 2,
      });
    }
  } else if (roomLabel.toLowerCase().includes('bếp')) {
    suggestions.push({
      emoji: '⛽',
      label: `An toàn Gas ${roomLabel}`,
      prompt: `Kiểm tra tình trạng cảm biến Gas và mức độ an toàn phòng cháy chữa cháy tại ${roomLabel}.`,
      priority: 2,
    });
  }

  // 3. Gợi ý theo cảm biến Nhiệt độ / Độ ẩm thực tế của phòng
  if (sensors.temp != null) {
    if (sensors.temp > 30) {
      suggestions.push({
        emoji: '🌡️',
        label: `${roomLabel} ${sensors.temp}°C`,
        prompt: `Nhiệt độ ${roomLabel} đang khá cao (${sensors.temp}°C, độ ẩm ${sensors.humid ?? "—"}%). Phân tích xu hướng và gợi ý cách làm mát hiệu quả.`,
        priority: 1,
      });
    } else {
      suggestions.push({
        emoji: '🌡️',
        label: `Thời tiết ${roomLabel}`,
        prompt: `Đánh giá điều kiện môi trường tại ${roomLabel} hiện tại (Nhiệt độ ${sensors.temp}°C, Độ ẩm ${sensors.humid ?? "—"}%).`,
        priority: 2,
      });
    }
  }

  // 4. Gợi ý Hẹn giờ & Tự động hóa thiết bị
  suggestions.push({
    emoji: '⏰',
    label: `Hẹn giờ ${roomLabel}`,
    prompt: `Dựa vào nhiệt độ phòng ${roomLabel} và thời tiết ngoài trời, hãy đề xuất lịch hẹn giờ tự động bật/tắt thiết bị tối ưu điện năng.`,
    priority: 3,
  });

  // 5. Phân tích xu hướng 24h
  suggestions.push({
    emoji: '📈',
    label: `Biến động 24h ${roomLabel}`,
    prompt: `Cho tôi xem phân tích biến động nhiệt độ và độ ẩm trong 24 giờ qua của ${roomLabel}.`,
    priority: 4,
  });

  // 6. So sánh các phòng trong nhà
  suggestions.push({
    emoji: '🏠',
    label: 'So sánh các phòng',
    prompt: 'So sánh nhiệt độ và độ ẩm giữa tất cả các phòng trong nhà hiện tại.',
    priority: 5,
  });

  // Lọc label trùng lặp, sắp xếp theo ưu tiên và lấy 4 gợi ý phù hợp nhất
  const seenLabels = new Set<string>();
  const result: SmartSuggestion[] = [];

  for (const item of suggestions.sort((a, b) => a.priority - b.priority)) {
    if (!seenLabels.has(item.label)) {
      seenLabels.add(item.label);
      result.push(item);
      if (result.length >= 4) break;
    }
  }

  return result;
}

// ============================================================
// Context Builder — format data cho Gemini prompt
// ============================================================

/**
 * Xây dựng data context string để inject vào Gemini system prompt
 * Giới hạn ~2000 tokens (~1500 words) để không vượt context window
 */
export function buildDataContextPrompt(
  chatContext: ChatDataContext,
  intent: ParsedIntent
): string {
  const parts: string[] = [];

  parts.push('=== DỮ LIỆU THẬT TỪ HỆ THỐNG (không phải ước tính) ===');

  if (chatContext.sensorSummary) {
    parts.push(`\n📊 TỔNG HỢP CẢM BIẾN (${intent.timeRange === 'today' ? '24h qua' : intent.timeRange === '7d' ? '7 ngày qua' : '30 ngày qua'})${intent.nodeName ? ` — ${intent.nodeName}` : ' — Tất cả phòng'}:`);
    parts.push(chatContext.sensorSummary);
  }

  // Hourly breakdown (giới hạn để tiết kiệm tokens)
  if (chatContext.hourlyBreakdown.length > 0 && (intent.isPeak || intent.isTrend)) {
    parts.push('\n⏰ CHI TIẾT THEO GIỜ:');
    for (const h of chatContext.hourlyBreakdown.slice(0, 24)) {
      parts.push(`  ${h.hour}: ${h.values}`);
    }
  }

  // Device status
  if (chatContext.deviceStatus.length > 0) {
    parts.push('\n🔌 TRẠNG THÁI THIẾT BỊ HIỆN TẠI:');
    for (const d of chatContext.deviceStatus) {
      parts.push(`  - ${d.device}: ${d.status}`);
    }
  }

  // Recent activity (top 10)
  if (chatContext.recentActivity.length > 0) {
    parts.push('\n📋 HOẠT ĐỘNG GẦN ĐÂY (mới nhất trước):');
    for (const a of chatContext.recentActivity.slice(0, 10)) {
      parts.push(`  [${a.time}] ${a.action}`);
    }
  }

  // Schedules
  if (chatContext.schedules.length > 0) {
    parts.push('\n⏰ LỊCH HẸN GIỜ HIỆN TẠI:');
    for (const s of chatContext.schedules) {
      parts.push(`  - ${s.id}: ${s.detail}`);
    }
  }

  // Technical alerts
  if (chatContext.technicalAlerts.length > 0) {
    parts.push('\n⚠️ CẢNH BÁO KỸ THUẬT:');
    for (const t of chatContext.technicalAlerts) {
      parts.push(`  - ${t.type}: ${t.detail}`);
    }
  }

  parts.push('\n=== KẾT THÚC DỮ LIỆU THẬT ===');
  parts.push('CHÚ Ý: Hãy trả lời dựa trên dữ liệu thật ở trên. Nếu dữ liệu không đủ để trả lời, hãy nói rõ thay vì bịa số liệu.');

  return parts.join('\n');
}

// ============================================================
// Math Helpers
// ============================================================

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stddev(arr: number[]): number | null {
  if (arr.length < 2) return null;
  const mean = avg(arr)!;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}
