export type TabKey = "dashboard" | "sensors" | "activity" | "schedule" | "notifications" | "health" | "settings" | "fleet" | "alerts" | "users" | "audit" | "support" | "business" | "nodes" | "household";

// ============================================================
// Types cũ — giữ nguyên cho tương thích ngược
// ============================================================
export type DeviceState = { on: boolean; mode: "auto" | "manual" };
export type Devices = { ac: DeviceState; fan: DeviceState; light: DeviceState };
export type Sensors = { temp: number | null; humid: number | null; light: number | null; gas?: number | null };
export type Alert = { id: number; ts: number; title: string; detail: string; level: "error" | "warn" | "info" };

export type ScheduleRule = {
  id: number;
  device: "ac" | "fan" | "light";
  action: "on" | "off";
  time: string;
  days: number[]; // 0=CN, 1=T2...
  enabled: boolean;
  node?: string;
};

// ============================================================
// Types mới — Node Data Model
// ============================================================

/** Node = 1 khu vực vật lý (phòng) chứa nhiều thiết bị */
export type NodeData = {
  idnode: string;
  id_hogiadinh: number | null;
  ten_phong: string;
  mo_ta: string | null;
  loai_phong: string; // 'phong_ngu' | 'phong_khach' | 'nha_bep' | 'phong_tam' | 'ban_cong' | 'phong_khac'
  trang_thai: string; // 'online' | 'offline'
  firmware_version: string | null;
  last_heartbeat: string | null;
  rssi: number | null;
  cpu_temp: number | null;
  chuc_nang: string[] | null;
};

/** Thiết bị thuộc về 1 Node */
export type DeviceData = {
  id_thietbi: number;
  idnode: string;
  loai_thietbi: string; // 'den' | 'quat' | 'dieu_hoa' | 'cam_bien_gas' | 'cam_bien_nhietdo' | 'cam_bien_doam' | 'cam_bien_anhsang' | 'khac'
  ten_hienthi: string | null;    // Custom name — NULL = dùng tên loại mặc định
  dia_chi_hw: string | null;     // GPIO / I2C / ADC address
  trangthai: number;             // 0: Tắt, 1: Bật
  tu_dong: boolean;              // true: Tự động, false: Thủ công
  cau_hinh: Record<string, any>; // {threshold, unit, gas_type, warn_level, danger_level, ...}
  thoigian_tao: string;
  thoigian_capnhat: string;
};

/** Node kèm danh sách thiết bị */
export type NodeWithDevices = NodeData & {
  thietbi: DeviceData[];
};

/** Hộ gia đình */
export type HouseholdData = {
  id_hogiadinh: number;
  ten_nha: string;
  dia_chi: string | null;
  id_chuho: number | null;
  thoigian_tao: string;
};

/** Thành viên hộ gia đình */
export type HouseholdMemberData = {
  id_thanhvien: number;
  id_hogiadinh: number;
  idnguoidung: number;
  vaitro: 'owner' | 'member';
  quyen_dieu_khien: 'full_control' | 'view_only';
  thoigian_thamgia: string;
  nguoidung?: {
    hoten: string;
    email: string;
    anhdaidien: string | null;
  };
};

/** Mã mời vào hộ gia đình */
export type InviteCodeData = {
  id_ma: number;
  id_hogiadinh: number;
  ma_moi: string;  // UUID dạng string
  quyen_dieu_khien: 'full_control' | 'view_only';
  expires_at: string;
  is_used: boolean;
  used_by: number | null;
  thoigian_tao: string;
};
