import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { mqttSubscribe } from "@/lib/mqttClient";
import {
  Clock,
  Wifi,
  Zap,
  Database,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { GlassCard } from "./GlassCard";

function HealthStat({
  icon: Icon, label, value, hint, gradient, progress, badge,
}: {
  icon: any; label: string; value: string; hint: string; gradient: string; progress?: number;
  badge?: { l: string; c: string; bg: string };
}) {
  return (
    <GlassCard>
      <div className="flex items-start justify-between">
        <div className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", gradient)}>
          <Icon className="h-5 w-5" />
        </div>
        {badge && (
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", badge.bg, badge.c)}>{badge.l}</span>
        )}
      </div>
      <div className="mt-4 text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{hint}</div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </GlassCard>
  );
}

function HwRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0">
      <span className="text-xs text-slate-500">{k}</span>
      <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{v}</span>
    </div>
  );
}

function StatusRow({ label, online }: { label: string; online: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className={cn("relative h-2 w-2 rounded-full", online ? "bg-emerald-500" : "bg-rose-500")}>
          {online && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" />}
        </span>
        <span className={cn("text-xs font-medium", online ? "text-emerald-600" : "text-rose-600")}>
          {online ? "Online" : "Offline"}
        </span>
      </span>
    </div>
  );
}

export function HealthTab({
  livingOnline,
  bedroomOnline,
  kitchenOnline,
  supabaseOnline,
  mqttOnline,
  sensorOnline,
  lastSensorTime,
}: {
  livingOnline?: boolean;
  bedroomOnline?: boolean;
  kitchenOnline?: boolean;
  supabaseOnline?: boolean;
  mqttOnline?: boolean;
  sensorOnline?: boolean;
  lastSensorTime?: Date | null;
}) {
  const [rawUptime, setRawUptime] = useState<number | null>(null);
  const [rssi, setRssi] = useState(-58);
  const [latency, setLatency] = useState(42);
  const [storage] = useState({ used: 218, total: 500 });

  useEffect(() => {
    // Đăng ký nhận Uptime thực tế từ ESP32 qua MQTT (retained topic)
    const unsub = mqttSubscribe("buivansang_iot_pj/s3-node-01/uptime", (payload) => {
      const val = parseInt(payload, 10);
      if (!isNaN(val)) {
        setRawUptime(val);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setRssi((r) => Math.max(-85, Math.min(-40, r + (Math.random() - 0.5) * 3)));
      setLatency((l) => Math.max(15, Math.min(320, l + (Math.random() - 0.5) * 40)));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const rssiPct = Math.max(0, Math.min(100, ((rssi + 90) / 50) * 100));
  const rssiLevel = rssi > -60 ? "Xuất sắc" : rssi > -70 ? "Tốt" : rssi > -80 ? "Trung bình" : "Yếu";
  const latencyLevel = latency < 100 ? { l: "Ổn định", c: "text-emerald-600", bg: "bg-emerald-100" } : latency < 200 ? { l: "Chậm nhẹ", c: "text-amber-600", bg: "bg-amber-100" } : { l: "Trễ cao", c: "text-rose-600", bg: "bg-rose-100" };
  const storagePct = (storage.used / storage.total) * 100;

  const latHist = useRef<{ t: number; latency: number }[]>([]);
  useEffect(() => {
    latHist.current.push({ t: Date.now(), latency });
    if (latHist.current.length > 30) latHist.current.shift();
  }, [latency]);

  // Định dạng hiển thị Uptime
  const getUptimeDisplay = () => {
    if (!sensorOnline) {
      return {
        value: "Mất kết nối",
        hint: lastSensorTime
          ? (() => {
              const d = new Date(lastSensorTime);
              const hh = String(d.getHours()).padStart(2, "0");
              const mm = String(d.getMinutes()).padStart(2, "0");
              const dd = String(d.getDate()).padStart(2, "0");
              const mo = String(d.getMonth() + 1).padStart(2, "0");
              return `Lần cuối online: ${hh}:${mm} ${dd}/${mo}`;
            })()
          : "Không có dữ liệu",
      };
    }

    if (rawUptime === null) {
      return {
        value: "Đang kết nối...",
        hint: "Đang nhận từ ESP32...",
      };
    }

    const days = Math.floor(rawUptime / 86400);
    const hh = Math.floor((rawUptime % 86400) / 3600);
    const mm = Math.floor((rawUptime % 3600) / 60);
    return {
      value: `${days}d ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
      hint: "Kể từ lần khởi động cuối",
    };
  };

  const uptimeInfo = getUptimeDisplay();

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <HealthStat
          icon={Clock}
          label="Uptime ESP32"
          value={uptimeInfo.value}
          hint={uptimeInfo.hint}
          gradient="from-emerald-500 to-teal-400"
        />
        <HealthStat
          icon={Wifi}
          label="WiFi RSSI"
          value={`${Math.round(rssi)} dBm`}
          hint={rssiLevel}
          gradient="from-sky-500 to-indigo-500"
          progress={rssiPct}
        />
        <HealthStat
          icon={Zap}
          label="Độ trễ MQTT"
          value={`${Math.round(latency)} ms`}
          hint={latencyLevel.l}
          gradient="from-amber-400 to-orange-400"
          badge={latencyLevel}
        />
        <HealthStat
          icon={Database}
          label="Dung lượng Supabase"
          value={`${storage.used} / ${storage.total} MB`}
          hint={`Đã dùng ${storagePct.toFixed(0)}%`}
          gradient="from-fuchsia-500 to-pink-400"
          progress={storagePct}
        />
      </div>

      <GlassCard>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Độ trễ MQTT theo thời gian</h3>
          <p className="text-xs text-slate-500">Cập nhật mỗi 2 giây</p>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={latHist.current} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="lat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="t" hide />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: number) => `${Math.round(v)} ms`}
                labelFormatter={(l: number) => new Date(l).toLocaleTimeString("vi-VN")}
                contentStyle={{ borderRadius: 12, background: "rgba(255,255,255,0.95)", border: "1px solid rgba(255,255,255,0.7)", fontSize: 12 }}
              />
              <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="latency" stroke="#f59e0b" strokeWidth={2} fill="url(#lat)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <div className="grid gap-5 md:grid-cols-2">
        <GlassCard>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Trạng thái dịch vụ</h3>
          <div className="mt-3 space-y-1">
            <StatusRow label="ESP32-S3 Node-01" online={livingOnline ?? !!sensorOnline} />
            <StatusRow label="ESP32-S3 Node-02" online={bedroomOnline ?? false} />
            <StatusRow label="ESP32-C3 Kitchen" online={kitchenOnline ?? false} />
            <StatusRow label="MQTT Broker (HiveMQ)" online={mqttOnline ?? false} />
            <StatusRow label="Supabase Realtime" online={supabaseOnline ?? false} />
            <StatusRow label="Edge Functions" online={supabaseOnline ?? false} />
          </div>
        </GlassCard>
        <GlassCard>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Thông số phần cứng</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <HwRow k="Firmware" v="v2.4.1 (2026-06-12)" />
            <HwRow k="Chip" v="ESP32-S3 · Xtensa LX7 dual-core 240MHz" />
            <HwRow k="RAM" v="512 KB SRAM · 2 MB PSRAM" />
            <HwRow k="Flash" v="8 MB (4.2 MB đã dùng)" />
            <HwRow k="Địa chỉ IP" v="192.168.1.42" />
            <HwRow k="MAC" v="A4:CF:12:8B:3D:E1" />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
