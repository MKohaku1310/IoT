import { TabKey } from "./types";
import {
  LayoutDashboard,
  LineChart as LineChartIcon,
  CalendarClock,
  History,
  Bell,
  HeartPulse,
  SettingsIcon,
  Home,
  Moon,
  Sunrise,
  Server,
  ShieldAlert,
  Users,
  Users2,
  FileSpreadsheet,
  LifeBuoy,
  Briefcase,
  Droplets,
  Box,
  Flame,
  Thermometer,
  Sun,
  Wind,
  Fan,
  Snowflake,
} from "lucide-react";

export const BUYER_TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "dashboard",  label: "Bảng điều khiển", icon: LayoutDashboard },
  { key: "sensors",    label: "Dữ liệu cảm biến", icon: LineChartIcon },
  { key: "schedule",   label: "Lịch hẹn giờ",    icon: CalendarClock },
  { key: "activity",   label: "Lịch sử hoạt động", icon: History },
  { key: "household",  label: "Thành viên",       icon: Users2 },
  { key: "settings",   label: "Cài đặt tài khoản", icon: SettingsIcon },
  { key: "support",    label: "Yêu cầu hỗ trợ",  icon: LifeBuoy },
];

export const ADMIN_TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "fleet", label: "Quản lý Fleet", icon: Server },
  { key: "alerts", label: "Cảnh báo hệ thống", icon: ShieldAlert },
  { key: "users", label: "Quản lý người dùng", icon: Users },
  { key: "audit", label: "Lịch sử hệ thống", icon: FileSpreadsheet },
  { key: "support", label: "Hỗ trợ & Remote", icon: LifeBuoy },
  { key: "business", label: "Hoạt động kinh doanh", icon: Briefcase },
  { key: "settings", label: "Cài đặt hệ thống", icon: SettingsIcon },
];

export const TABS = BUYER_TABS;

// ============================================================
// NODES_LEGACY — Giữ lại cho tương thích ngược trong giai đoạn chuyển đổi
// Code mới KHÔNG nên dùng mảng này, thay vào đó đọc từ DB qua nodeService
// ============================================================
export const NODES_LEGACY = [
  { id: "living", name: "Phòng khách", chip: "ESP32-S3-Node-01", icon: Home },
  { id: "bedroom", name: "Phòng ngủ", chip: "ESP32-S3-Node-02", icon: Moon },
  { id: "kitchen", name: "Nhà bếp", chip: "ESP32-C3-Kitchen", icon: Sunrise },
];

/** @deprecated Dùng NODES_LEGACY hoặc đọc từ DB qua nodeService */
export const NODES = NODES_LEGACY;

// ============================================================
// Cấu hình hiển thị theo loại phòng (loai_phong trong DB)
// Dùng để render icon + gradient cho từng node khi đọc từ DB
// ============================================================
export const ROOM_TYPE_CONFIG: Record<string, { label: string; icon: any; gradient: string }> = {
  phong_khach: { label: "Phòng khách",  icon: Home,     gradient: "from-blue-500 to-indigo-500" },
  phong_ngu:   { label: "Phòng ngủ",    icon: Moon,     gradient: "from-purple-500 to-pink-500" },
  nha_bep:     { label: "Nhà bếp",      icon: Sunrise,  gradient: "from-orange-500 to-amber-500" },
  phong_tam:   { label: "Phòng tắm",    icon: Droplets, gradient: "from-cyan-500 to-teal-500" },
  ban_cong:    { label: "Ban công",      icon: Sun,      gradient: "from-emerald-500 to-green-500" },
  phong_khac:  { label: "Khu vực khác", icon: Box,      gradient: "from-slate-500 to-gray-500" },
};

// ============================================================
// Cấu hình hiển thị theo loại thiết bị (loai_thietbi trong DB)
// ============================================================
export const DEVICE_TYPE_CONFIG: Record<string, { label: string; icon: any; gradient: string; glow: string }> = {
  den:                { label: "Đèn",              icon: Sun,          gradient: "from-amber-400 to-yellow-300",  glow: "rgba(251,191,36,0.4)" },
  quat:               { label: "Quạt",             icon: Fan,          gradient: "from-sky-400 to-cyan-300",      glow: "rgba(56,189,248,0.4)" },
  dieu_hoa:           { label: "Điều hòa",         icon: Snowflake,    gradient: "from-indigo-400 to-blue-300",   glow: "rgba(129,140,248,0.4)" },
  may_hut_am:         { label: "Máy hút ẩm",       icon: Wind,         gradient: "from-teal-400 to-emerald-300",   glow: "rgba(45,212,191,0.4)" },
  cam_bien_gas:       { label: "Cảm biến Gas",     icon: Flame,        gradient: "from-rose-500 to-red-400",      glow: "rgba(244,63,94,0.4)" },
  cam_bien_nhietdo:   { label: "Cảm biến Nhiệt độ", icon: Thermometer, gradient: "from-rose-400 to-orange-300",   glow: "rgba(251,113,133,0.4)" },
  cam_bien_doam:      { label: "Cảm biến Độ ẩm",  icon: Droplets,     gradient: "from-sky-500 to-blue-400",      glow: "rgba(14,165,233,0.4)" },
  cam_bien_anhsang:   { label: "Cảm biến Ánh sáng", icon: Sun,        gradient: "from-yellow-400 to-amber-300",  glow: "rgba(250,204,21,0.4)" },
  khac:               { label: "Thiết bị khác",    icon: Box,          gradient: "from-slate-400 to-gray-300",    glow: "rgba(148,163,184,0.4)" },
};

/** Lấy label hiển thị của loại thiết bị */
export function getDeviceTypeLabel(loai: string): string {
  return DEVICE_TYPE_CONFIG[loai]?.label || loai;
}

/** Lấy config hiển thị của loại phòng (fallback về phong_khac) */
export function getRoomTypeConfig(loai: string) {
  return ROOM_TYPE_CONFIG[loai] || ROOM_TYPE_CONFIG.phong_khac;
}

/** Lấy config hiển thị của loại thiết bị (fallback về khac) */
export function getDeviceTypeConfig(loai: string) {
  return DEVICE_TYPE_CONFIG[loai] || DEVICE_TYPE_CONFIG.khac;
}

export const CITIES = [
  { name: "Hà Nội", lat: 21.0285, lon: 105.8542 },
  { name: "TP. Hồ Chí Minh", lat: 10.8231, lon: 106.6297 },
  { name: "Đà Nẵng", lat: 16.0544, lon: 108.2022 },
  { name: "Hải Phòng", lat: 20.8449, lon: 106.6881 },
  { name: "Cần Thơ", lat: 10.0452, lon: 105.7469 },
  { name: "Nha Trang", lat: 12.2388, lon: 109.1967 },
  { name: "Đà Lạt", lat: 11.9404, lon: 108.4583 },
  { name: "Huế", lat: 16.4637, lon: 107.5909 },
];
