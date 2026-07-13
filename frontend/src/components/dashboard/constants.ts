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
} from "lucide-react";

export const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
  { key: "sensors", label: "Dữ liệu cảm biến", icon: LineChartIcon },
  { key: "schedule", label: "Lịch hẹn giờ", icon: CalendarClock },
  { key: "activity", label: "Lịch sử hoạt động", icon: History },
  { key: "notifications", label: "Thông báo", icon: Bell },
  { key: "health", label: "Trạng thái hệ thống", icon: HeartPulse },
  { key: "settings", label: "Cài đặt hệ thống", icon: SettingsIcon },
];

export const NODES = [
  { id: "living", name: "Phòng khách", chip: "ESP32-S3-Node-01", icon: Home },
  { id: "bedroom", name: "Phòng ngủ", chip: "ESP32-S3-Node-02", icon: Moon },
  { id: "kitchen", name: "Nhà bếp", chip: "ESP32-C3-Kitchen", icon: Sunrise },
];

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
