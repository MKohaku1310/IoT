export type TabKey = "dashboard" | "sensors" | "activity" | "schedule" | "notifications" | "health" | "settings";

export type DeviceState = { on: boolean; mode: "auto" | "manual" };
export type Devices = { ac: DeviceState; fan: DeviceState; light: DeviceState };
export type Sensors = { temp: number; humid: number; light: number };
export type Alert = { id: number; ts: number; title: string; detail: string; level: "error" | "warn" };

export type ScheduleRule = {
  id: number;
  device: "ac" | "fan" | "light";
  action: "on" | "off";
  time: string;
  days: number[]; // 0=CN, 1=T2...
  enabled: boolean;
};
