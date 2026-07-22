import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { mqttSubscribe } from "@/lib/mqttClient";
import {
  Wind,
  Fan,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Thermometer,
  Droplets,
  Sun,
  Clock,
  Sparkles,
  Bot,
  CloudRain,
  CheckCircle2,
  Cpu,
  Wifi,
  Activity,
  Pencil,
  Server,
  Info,
  Flame,
  Snowflake,
  Box,
  Loader2,
  LayoutGrid,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAnimatedNumber, useRelativeTime } from "@/hooks/use-smart-home";
import { GlassCard } from "@/components/ui/glass-card";
import { CITIES, DEVICE_TYPE_CONFIG, getDeviceTypeConfig } from "../shared/constants";
import { Devices, Sensors, Alert, DeviceState, DeviceData } from "../shared/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Tooltip,
  ComposedChart,
  Bar,
} from "recharts";

/* -------------------- Forecast Card -------------------- */
function ForecastCard({ sensors }: { sensors: Sensors }) {
  const hist = useRef<{ t: number; temp: number; humid: number }[]>([]);
  const [tick, setTick] = useState(0);

  const hasData = sensors.temp != null && sensors.humid != null;
  const temp = sensors.temp ?? 0;
  const humid = sensors.humid ?? 0;

  useEffect(() => {
    if (!hasData) return;
    hist.current.push({ t: Date.now(), temp: sensors.temp!, humid: sensors.humid! });
    if (hist.current.length > 30) hist.current.shift();
    setTick((x) => x + 1);
  }, [sensors.temp, sensors.humid, hasData]);

  const slope = (key: "temp" | "humid") => {
    const arr = hist.current.slice(-10);
    if (arr.length < 2) return 0;
    const first = arr[0][key];
    const last = arr[arr.length - 1][key];
    return (last - first) / arr.length;
  };
  const tempSlope = slope("temp");
  const humidSlope = slope("humid");

  const chart = useMemo(() => {
    if (!hasData) return [];
    const arr: { label: string; temp: number; forecast?: number }[] = [];
    for (let i = 0; i < 12; i++) {
      arr.push({ label: `-${(11 - i) * 5}m`, temp: +(temp - tempSlope * (11 - i) * 2 + (Math.random() - 0.5) * 0.3).toFixed(1) });
    }
    arr.push({ label: "now", temp: temp, forecast: temp });
    for (let i = 1; i <= 6; i++) {
      arr.push({ label: `+${i * 10}m`, temp: NaN as unknown as number, forecast: +(temp + tempSlope * i * 2).toFixed(1) });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, hasData, temp, tempSlope]);

  if (!hasData) {
    return (
      <GlassCard className="p-5">
        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-400 dark:text-slate-500">
          <TrendingUp className="h-4.5 w-4.5" />
          Chưa có dữ liệu cảm biến để dự báo
        </div>
      </GlassCard>
    );
  }

  const forecastTemp = +(temp + tempSlope * 15).toFixed(1);
  const forecastHumid = Math.round(humid + humidSlope * 15);

  const trend = (v: number) =>
    v > 0.05 ? { label: "tăng", color: "text-rose-600", arrow: "↗" } : v < -0.05 ? { label: "giảm", color: "text-sky-600", arrow: "↘" } : { label: "ổn định", color: "text-emerald-600", arrow: "→" };
  const tT = trend(tempSlope);
  const tH = trend(humidSlope);

  return (
    <GlassCard className="p-5">
      <div className="mb-4 border-b border-slate-100/50 dark:border-slate-800/50 pb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
          Xu hướng & Dự báo ngắn hạn (15 phút tới)
        </h3>
        <span className="text-[10px] text-slate-400 font-semibold">Cập nhật động theo dữ liệu cảm biến</span>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-rose-50 to-orange-50 p-4 dark:border-slate-800 dark:from-rose-950/10 dark:to-orange-950/10">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-400">
            <Thermometer className="h-3.5 w-3.5" /> Nhiệt độ dự báo
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{forecastTemp}</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">°C</span>
          </div>
          <div className={cn("mt-1 text-xs font-semibold", tT.color)}>{tT.arrow} Xu hướng {tT.label}</div>
        </div>

        <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-sky-50 to-cyan-50 p-4 dark:border-slate-800 dark:from-sky-950/10 dark:to-cyan-950/10">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-400">
            <Droplets className="h-3.5 w-3.5" /> Độ ẩm dự báo
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{forecastHumid}</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">%</span>
          </div>
          <div className={cn("mt-1 text-xs font-semibold", tH.color)}>{tH.arrow} Xu hướng {tH.label}</div>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/60 p-2 md:col-span-1 dark:border-slate-800 dark:bg-slate-900/40">
          <ResponsiveContainer width="100%" height={110}>
            <AreaChart data={chart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" hide />
              <YAxis hide domain={["dataMin-1", "dataMax+1"]} />
              <ReferenceLine x="now" stroke="#94a3b8" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={2} fill="url(#fc)" />
              <Area type="monotone" dataKey="forecast" stroke="#6366f1" strokeDasharray="4 3" strokeWidth={2} fill="url(#fc)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="px-2 pb-1 text-[9px] text-slate-500 text-center">Đường liền: thực tế · Đường đứt: dự báo</div>
        </div>
      </div>
    </GlassCard>
  );
}

/* -------------------- Device Card -------------------- */
function DeviceCard({
  name,
  icon: Icon,
  gradient,
  glow,
  state,
  onToggle,
  onMode,
  spinIcon,
  lightHalo,
  acBreeze,
}: {
  name: string;
  icon: typeof Wind;
  gradient: string;
  glow: string;
  state: DeviceState;
  onToggle: (on: boolean) => void;
  onMode: (m: "auto" | "manual") => void;
  spinIcon?: boolean;
  lightHalo?: boolean;
  acBreeze?: boolean;
}) {
  return (
    <div
      className="relative"
      style={
        state.on
          ? ({
            ["--glow" as string]: glow,
            animation: "breathing 3s ease-in-out infinite",
            borderRadius: "1.5rem",
          } as React.CSSProperties)
          : undefined
      }
    >
      {lightHalo && state.on && (
        <div
          className="pointer-events-none absolute -inset-6 rounded-[2rem] blur-2xl opacity-70 animate-pulse"
          style={{ background: "radial-gradient(circle at center, rgba(251,191,36,0.55), transparent 70%)" }}
        />
      )}
      <GlassCard className="relative p-3 sm:p-5">
        {/* Mobile compact layout */}
        <div className="flex flex-col items-center gap-2 sm:hidden">
          <div
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md transition",
              gradient,
              !state.on && "opacity-40 grayscale",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                spinIcon && "animate-spin",
                !spinIcon && !acBreeze && state.on && "animate-pulse",
              )}
              style={{
                ...(spinIcon ? { animationDuration: "1.4s" } : {}),
                ...(acBreeze ? { animation: "wind-sway 1.6s ease-in-out infinite" } : {}),
              }}
            />
          </div>
          <div className="text-center">
            <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{name}</div>
            <div className={cn("text-[10px] font-bold", state.on ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300")}>
              {state.on ? "BẬT" : "TẮT"}
            </div>
          </div>
          <Switch
            checked={state.on}
            onCheckedChange={onToggle}
            disabled={state.mode === "auto"}
            title={state.mode === "auto" ? "Đang ở chế độ Tự động. Vui lòng chuyển sang Thủ công để bật/tắt bằng tay." : ""}
          />
          <div className="w-full grid grid-cols-2 gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
            {(["manual", "auto"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onMode(m)}
                className={cn(
                  "rounded-md py-1 text-[10px] font-bold transition-all cursor-pointer",
                  state.mode === m ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-600 dark:text-slate-300",
                )}
              >
                {m === "manual" ? "TC" : "TĐ"}
              </button>
            ))}
          </div>
        </div>
        {/* Desktop layout */}
        <div className="hidden sm:block">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition",
                  gradient,
                  !state.on && "opacity-40 grayscale",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    spinIcon && "animate-spin",
                    !spinIcon && !acBreeze && state.on && "animate-pulse",
                  )}
                  style={{
                    ...(spinIcon ? { animationDuration: "1.4s" } : {}),
                    ...(acBreeze ? { animation: "wind-sway 1.6s ease-in-out infinite" } : {}),
                  }}
                />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{name}</h4>
                <span className={cn("text-[11px] font-bold leading-none mt-1 inline-block", state.on ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300")}>
                  {state.on ? "Đang bật" : "Đang tắt"}
                </span>
              </div>
            </div>
            <Switch
              checked={state.on}
              onCheckedChange={onToggle}
              disabled={state.mode === "auto"}
              title={state.mode === "auto" ? "Đang ở chế độ Tự động. Vui lòng chuyển sang Thủ công để bật/tắt bằng tay." : ""}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
            {(["manual", "auto"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onMode(m)}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-bold transition cursor-pointer",
                  state.mode === m
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white",
                )}
              >
                {m === "manual" ? "Thủ công" : "Tự động"}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}


// ==========================================
// Node Device Card — Thiết bị điều khiển (den/quat/dieu_hoa/khac)
// Render động theo loai_thietbi từ bảng thietbi
// ==========================================
const SENSOR_TYPES = new Set(["cam_bien_gas", "cam_bien_nhietdo", "cam_bien_doam", "cam_bien_anhsang"]);

function NodeDeviceCard({
  device,
  onToggle,
  onMode,
}: {
  device: DeviceData;
  onToggle: (device: DeviceData, on: boolean) => void;
  onMode: (device: DeviceData, mode: "auto" | "manual") => void;
}) {
  const cfg = getDeviceTypeConfig(device.loai_thietbi);
  const Icon = cfg.icon;
  const isOn = device.trangthai === 1;
  const mode = device.tu_dong ? "auto" : "manual";
  const displayName = device.ten_hienthi || cfg.label;

  const lightHalo = device.loai_thietbi === "den" || device.loai_thietbi === "light";
  const spinIcon = (device.loai_thietbi === "quat" || device.loai_thietbi === "fan") && isOn;
  const acBreeze = (device.loai_thietbi === "dieu_hoa" || device.loai_thietbi === "dieuhoa" || device.loai_thietbi === "ac") && isOn;

  return (
    <div
      className="relative"
      style={
        isOn
          ? ({
            ["--glow" as string]: cfg.glow,
            animation: "breathing 3s ease-in-out infinite",
            borderRadius: "1.5rem",
          } as React.CSSProperties)
          : undefined
      }
    >
      {lightHalo && isOn && (
        <div
          className="pointer-events-none absolute -inset-6 rounded-[2rem] blur-2xl opacity-70 animate-pulse"
          style={{ background: "radial-gradient(circle at center, rgba(251,191,36,0.55), transparent 70%)" }}
        />
      )}
      <GlassCard className="relative p-3 sm:p-5">
        {/* Mobile */}
        <div className="flex flex-col items-center gap-2 sm:hidden">
          <div
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md transition",
              cfg.gradient,
              !isOn && "opacity-40 grayscale",
            )}
          >
            <Icon
              className={cn("h-4 w-4", spinIcon && "animate-spin", !spinIcon && !acBreeze && isOn && "animate-pulse")}
              style={{
                ...(spinIcon ? { animationDuration: "1.4s" } : {}),
                ...(acBreeze ? { animation: "wind-sway 1.6s ease-in-out infinite" } : {}),
              }}
            />
          </div>
          <div className="text-center">
            <div className="text-xs font-semibold text-slate-900 leading-tight">{displayName}</div>
            <div className={cn("text-[10px] font-medium", isOn ? "text-emerald-600" : "text-slate-400")}>
              {isOn ? "BẬT" : "TẮT"}
            </div>
          </div>
          <Switch
            checked={isOn}
            onCheckedChange={(v) => onToggle(device, v)}
            disabled={mode === "auto"}
            title={mode === "auto" ? "Đang ở chế độ Tự động. Vui lòng chuyển sang Thủ công để bật/tắt." : ""}
          />
          <div className="w-full grid grid-cols-2 gap-1 rounded-lg bg-slate-100/80 p-0.5">
            {(["manual", "auto"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onMode(device, m)}
                className={cn(
                  "rounded-md py-1 text-[10px] font-medium transition-all cursor-pointer",
                  mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                )}
              >
                {m === "manual" ? "TC" : "TĐ"}
              </button>
            ))}
          </div>
        </div>
        {/* Desktop */}
        <div className="hidden sm:block">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition",
                  cfg.gradient,
                  !isOn && "opacity-40 grayscale",
                )}
              >
                <Icon
                  className={cn("h-5 w-5", spinIcon && "animate-spin", !spinIcon && !acBreeze && isOn && "animate-pulse")}
                  style={{
                    ...(spinIcon ? { animationDuration: "1.4s" } : {}),
                    ...(acBreeze ? { animation: "wind-sway 1.6s ease-in-out infinite" } : {}),
                  }}
                />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 leading-tight">{displayName}</h4>
                <span className={cn("text-[11px] font-medium leading-none mt-1 inline-block", isOn ? "text-emerald-600" : "text-slate-400")}>
                  {isOn ? "Đang bật" : "Đang tắt"}
                </span>
                {device.dia_chi_hw && (
                  <span className="ml-2 text-[10px] text-slate-400">{device.dia_chi_hw}</span>
                )}
              </div>
            </div>
            <Switch
              checked={isOn}
              onCheckedChange={(v) => onToggle(device, v)}
              disabled={mode === "auto"}
              title={mode === "auto" ? "Đang ở chế độ Tự động. Vui lòng chuyển sang Thủ công để bật/tắt bằng tay." : ""}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100/85 p-0.5 border border-slate-200/50">
            {(["manual", "auto"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onMode(device, m)}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer",
                  mode === m
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {m === "manual" ? "Thủ công" : "Tự động"}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ==========================================
// Sensor Device Card — Cảm biến (gas, nhiệt độ, độ ẩm, ánh sáng)
// Hiển thị giá trị real-time với màu cảnh báo nếu vượt ngưỡng
// ==========================================
function SensorDeviceCard({
  device,
  sensors,
  thresholds,
}: {
  device: DeviceData;
  sensors: Sensors;
  thresholds?: Record<string, number>;
}) {
  const cfg = getDeviceTypeConfig(device.loai_thietbi);
  const Icon = cfg.icon;
  const displayName = device.ten_hienthi || cfg.label;

  // Lấy giá trị cảm biến tương ứng
  const getSensorValue = (): { value: number | null; unit: string } => {
    switch (device.loai_thietbi) {
      case "cam_bien_gas":      return { value: sensors.gas ?? null, unit: "ppm" };
      case "cam_bien_nhietdo":  return { value: sensors.temp, unit: "°C" };
      case "cam_bien_doam":     return { value: sensors.humid, unit: "%" };
      case "cam_bien_anhsang":  return { value: sensors.light, unit: "lx" };
      default:                  return { value: null, unit: "" };
    }
  };

  // Kiểm tra vượt ngưỡng nguy hiểm
  const isOverThreshold = (): boolean => {
    const { value } = getSensorValue();
    if (value === null) return false;
    const deviceThreshold = device.cau_hinh?.threshold ?? device.cau_hinh?.danger_level ?? null;
    switch (device.loai_thietbi) {
      case "cam_bien_gas":      return value >= (deviceThreshold ?? 300);
      case "cam_bien_nhietdo":  return value >= (deviceThreshold ?? thresholds?.temp ?? 30);
      case "cam_bien_doam":     return value >= (deviceThreshold ?? thresholds?.humid ?? 75);
      case "cam_bien_anhsang":  return value < (deviceThreshold ?? thresholds?.light ?? 200);
      default:                  return false;
    }
  };

  // Kiểm tra vượt ngưỡng cảnh báo (warn_level < danger_level)
  const isWarning = (): boolean => {
    const { value } = getSensorValue();
    if (value === null) return false;
    const warnLevel = device.cau_hinh?.warn_level ?? null;
    if (warnLevel === null) return false;
    if (device.loai_thietbi === "cam_bien_gas") return value >= warnLevel && !isOverThreshold();
    return false;
  };

  const { value, unit } = getSensorValue();
  const over = isOverThreshold();
  const warn = isWarning();
  const hasData = value !== null;

  return (
    <GlassCard
      className={cn(
        "relative p-3.5 sm:p-5 flex flex-col gap-3 overflow-hidden transition-all duration-300",
        over && "ring-2 ring-rose-400 ring-offset-1",
        warn && "ring-2 ring-amber-400 ring-offset-1",
      )}
    >
      {/* Cảnh báo nền pulse khi nguy hiểm */}
      {over && (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] animate-pulse"
          style={{ background: "radial-gradient(circle at center, rgba(244,63,94,0.08), transparent 70%)" }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm",
            over ? "from-rose-500 to-red-600" : warn ? "from-amber-400 to-orange-400" : cfg.gradient,
          )}>
            <Icon className={cn("h-4 w-4", over && "animate-pulse")} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{displayName}</div>
            <div className="text-[10px] text-slate-400">{device.dia_chi_hw || "Cảm biến"}</div>
          </div>
        </div>
        <Badge
          className={cn(
            "rounded-full border-transparent text-[10px] font-semibold px-2.5 py-0.5",
            over  ? "bg-rose-100 text-rose-700"   :
            warn  ? "bg-amber-100 text-amber-700"  :
                    "bg-emerald-100 text-emerald-700",
          )}
        >
          {over ? "⚠️ Nguy hiểm" : warn ? "⚠️ Cảnh báo" : "✅ Bình thường"}
        </Badge>
      </div>

      {/* Giá trị hiển thị */}
      <div className={cn(
        "flex items-end gap-2 px-1",
        over ? "text-rose-600" : warn ? "text-amber-600" : "text-slate-900 dark:text-white"
      )}>
        {hasData ? (
          <>
            <span className="text-4xl font-black tabular-nums leading-none">
              {device.loai_thietbi === "cam_bien_gas" || device.loai_thietbi === "cam_bien_anhsang"
                ? Math.round(value!)
                : value!.toFixed(1)}
            </span>
            <span className="text-base font-semibold mb-1">{unit}</span>
          </>
        ) : (
          <span className="text-sm text-slate-400 italic">Chưa có dữ liệu</span>
        )}
      </div>

      {/* Ngưỡng cảnh báo */}
      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
        <span>Ngưỡng cảnh báo:</span>
        <span className="font-bold text-slate-600 dark:text-slate-300">
          {device.loai_thietbi === "cam_bien_gas"     && `≥ ${device.cau_hinh?.danger_level ?? 300} ppm`}
          {device.loai_thietbi === "cam_bien_nhietdo" && `≥ ${device.cau_hinh?.threshold ?? thresholds?.temp ?? 30}°C`}
          {device.loai_thietbi === "cam_bien_doam"    && `≥ ${device.cau_hinh?.threshold ?? thresholds?.humid ?? 75}%`}
          {device.loai_thietbi === "cam_bien_anhsang" && `< ${device.cau_hinh?.threshold ?? thresholds?.light ?? 200} lx`}
        </span>
      </div>

      {/* Gas type info */}
      {device.loai_thietbi === "cam_bien_gas" && device.cau_hinh?.gas_type && (
        <div className="text-[10px] text-slate-400">
          Loại khí: {device.cau_hinh.gas_type} ·{" "}
          {over ? "NGUY HIỂM! Thoát hiểm ngay!" : warn ? "Cảnh báo, kiểm tra lại." : "Nồng độ bình thường."}
        </div>
      )}
    </GlassCard>
  );
}

// Cấu hình giá trị tối đa (ngưỡng max) của từng gauge cảm biến

const GAUGE_MAX = {
  temp: 50,    // Nhiệt độ tối đa (°C)
  humid: 100,  // Độ ẩm tối đa (%)
  light: 10000, // Ánh sáng tối đa (lx) - BH1750 max ~65535 lx, dùng 10000 cho phù hợp hiển thị
  gas: 1000,   // Gas tối đa (PPM)
};

interface SensorGaugeProps {
  value: string;
  rawValue: number;
  max: number;
  unit: string;
  colorKey: "temp" | "humid" | "light" | "gas";
}


function SensorGauge({
  value,
  rawValue,
  max,
  unit,
  colorKey,
}: SensorGaugeProps) {
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [transitionStyle, setTransitionStyle] = useState("stroke-dashoffset 400ms cubic-bezier(0.4, 0, 0.2, 1)");

  // Kích thước SVG cố định và co giãn theo phần trăm
  const size = 100;
  const center = 50;
  const radius = 43; // Tăng bán kính để đồ thị vòng to sát biên
  const strokeWidth = 5.5; // Stroke thanh mảnh hiện đại hơn
  const c = 2 * Math.PI * radius; // ~270.17

  // Vòng cung 270 độ
  const arcLength = 0.75 * c;

  useEffect(() => {
    // Animation khởi động quét giống táp-lô xe đua
    setTransitionStyle("stroke-dashoffset 450ms cubic-bezier(0.4, 0, 0.2, 1)");
    setAnimatedPercent(100);

    const t1 = setTimeout(() => {
      setAnimatedPercent(0);
    }, 450);

    const t2 = setTimeout(() => {
      setIsMounted(true);
    }, 900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (isMounted) {
      setTransitionStyle("stroke-dashoffset 500ms cubic-bezier(0.16, 1, 0.3, 1)");
      const targetPct = Math.min(Math.max((rawValue / max) * 100, 0), 100);
      setAnimatedPercent(targetPct);
    }
  }, [rawValue, max, isMounted]);

  const strokeDashoffset = arcLength - (animatedPercent / 100) * arcLength;
  const gradientId = `gauge-grad-${colorKey}`;

  // Tính toán tọa độ chấm sáng chạy ở đầu cung tròn
  const angle = 135 + (animatedPercent * 270) / 100;
  const rad = (angle * Math.PI) / 180;
  const dotX = center + radius * Math.cos(rad);
  const dotY = center + radius * Math.sin(rad);

  return (
    <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 xl:w-36 xl:h-36 my-1">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
      >
        <defs>
          {colorKey === "temp" && (
            <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
          )}
          {colorKey === "humid" && (
            <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          )}
          {colorKey === "light" && (
            <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fef08a" />
            </linearGradient>
          )}
          {colorKey === "gas" && (
            <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          )}
        </defs>

        {/* Vòng nền mảnh cùng tông màu */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={
            colorKey === "temp"
              ? "rgba(239, 68, 68, 0.1)"
              : colorKey === "humid"
              ? "rgba(14, 165, 233, 0.1)"
              : colorKey === "light"
              ? "rgba(245, 158, 11, 0.1)"
              : "rgba(239, 68, 68, 0.1)"
          }
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${c}`}
          transform={`rotate(135 ${center} ${center})`}
          className="dark:opacity-20"
        />

        {/* Vòng chia vạch đứt mảnh la bàn 360 độ trang trí ở lòng trong */}
        <circle
          cx={center}
          cy={center}
          r={radius - 8}
          stroke="currentColor"
          strokeWidth={0.75}
          strokeDasharray="1.5 3"
          className="text-slate-200 dark:text-slate-800/80"
        />

        {/* Vòng chỉ hướng mảnh song song chạy đồng bộ (Double Ring Effect) */}
        <circle
          cx={center}
          cy={center}
          r={radius - 4.5}
          stroke={`url(#${gradientId})`}
          strokeWidth={0.75}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${c}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(135 ${center} ${center})`}
          opacity={0.4}
          style={{
            transition: transitionStyle,
          }}
        />

        {/* Vòng fill chính sắc nét */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${c}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(135 ${center} ${center})`}
          style={{
            transition: transitionStyle,
          }}
        />

        {/* Chấm chỉ vị trí sắc nét ở đầu cung */}
        {isMounted && (
          <circle
            cx={dotX}
            cy={dotY}
            r={2.5}
            fill="#ffffff"
            stroke={
              colorKey === "temp"
                ? "#ef4444"
                : colorKey === "humid"
                ? "#0ea5e9"
                : colorKey === "light"
                ? "#f59e0b"
                : "#f97316"
            }
            strokeWidth={1.5}
            className="shadow-sm"
          />
        )}
      </svg>

      {/* Trị số đo và đơn vị ở chính giữa lòng đồng hồ */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl sm:text-2xl xl:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 tabular-nums leading-none">
          {value}
        </span>
        <span className="text-[9px] sm:text-[10px] xl:text-xs font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase">
          {unit}
        </span>
      </div>
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-800">
      <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.1)]" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const count = payload[0]?.payload?.count;
    return (
      <div className="rounded-2xl border border-white/70 bg-white/95 dark:bg-slate-900/95 dark:border-slate-800 p-3.5 shadow-xl backdrop-blur-md text-xs space-y-2.5 min-w-[180px]">
        <div className="font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-indigo-500" />
          <span>Thời gian: {label}</span>
        </div>
        <div className="space-y-2">
          {payload.map((p: any) => {
            const isTemp = p.dataKey === "temp";
            const isHumid = p.dataKey === "humid";
            const isGas = p.dataKey === "gas";
            const unit = isTemp ? "°C" : isHumid ? "%" : isGas ? "ppm" : "lx";
            return (
              <div key={p.dataKey} className="flex items-center justify-between gap-4">
                <span className="font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.stroke || p.fill }} />
                  {p.name}
                </span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {p.value !== null ? `${typeof p.value === "number" ? p.value.toFixed(1) : p.value} ${unit}` : "N/A"}
                </span>
              </div>
            );
          })}
        </div>
        {count != null && count > 1 && (
          <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-1.5">
            Trung bình từ {count} mẫu dữ liệu
          </div>
        )}
      </div>
    );
  }
  return null;
}

export function DashboardTab({
  devices,
  onToggle,
  onMode,
  sensors,
  sensorHistory,
  alerts,
  nodeName,
  nodeId = "living",
  thresholds,
  currentUserRole = "buyer",
  livingOnline = false,
  bedroomOnline = false,
  kitchenOnline = false,
  supabaseOnline = false,
  mqttOnline = false,
  nodeDevices = [],
  nodeDevicesLoading = false,
  onNodeDeviceToggle,
  onNodeDeviceModeChange,
  readAlertIds = [],
  onMarkAsRead,
}: {
  devices: Devices;
  onToggle: (key: "ac" | "fan" | "light", idden: number, on: boolean) => void;
  onMode: (key: "ac" | "fan" | "light", idden: number, mode: "auto" | "manual") => void;
  sensors: Sensors;
  sensorHistory: any[];
  alerts: Alert[];
  nodeName: string;
  nodeId?: string;
  thresholds?: Record<string, number>;
  currentUserRole?: string;
  livingOnline?: boolean;
  bedroomOnline?: boolean;
  kitchenOnline?: boolean;
  supabaseOnline?: boolean;
  mqttOnline?: boolean;
  /** Danh sách thiết bị thuộc node hiện tại */
  nodeDevices?: DeviceData[];
  /** Đang tải dữ liệu thiết bị */
  nodeDevicesLoading?: boolean;
  /** Toggle bật/tắt thiết bị (node-aware) */
  onNodeDeviceToggle?: (device: DeviceData, on: boolean) => void;
  /** Chuyển chế độ auto/manual (node-aware) */
  onNodeDeviceModeChange?: (device: DeviceData, mode: "auto" | "manual") => void;
  readAlertIds?: number[];
  onMarkAsRead?: (id: number) => void;
}) {
  const tempA = useAnimatedNumber(sensors.temp);
  const humidA = useAnimatedNumber(sensors.humid);
  const lightA = useAnimatedNumber(sensors.light);

  const [mqttLatency, setMqttLatency] = useState<number | null>(null);
  const [mqttLatHist, setMqttLatHist] = useState<{ t: number; v: number }[]>([]);

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    unsubs.push(mqttSubscribe("buivansang_iot_pj/s3-node-01/latency", (payload) => {
      const val = parseInt(payload, 10);
      if (!isNaN(val)) {
        setMqttLatency(val);
        setMqttLatHist((prev) => {
          const next = [...prev, { t: Date.now(), v: val }];
          return next.length > 30 ? next.slice(-30) : next;
        });
      }
    }));
    return () => unsubs.forEach((u) => u());
  }, []);

  const acDev = nodeDevices.find(d => d.loai_thietbi === "dieu_hoa");
  const fanDev = nodeDevices.find(d => d.loai_thietbi === "quat");
  const lightDev = nodeDevices.find(d => d.loai_thietbi === "den");

  const [customNames, setCustomNames] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("sh-sensor-names");
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const saveCustomName = (sensorKey: string, newName: string) => {
    const key = `${nodeId}-${sensorKey}`;
    const nextNames = { ...customNames, [key]: newName };
    setCustomNames(nextNames);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("sh-sensor-names", JSON.stringify(nextNames));
        toast.success("Đã đổi tên cảm biến thành công");
      } catch {}
    }
  };

  const handleRename = (sensorKey: string, currentName: string) => {
    const newName = prompt(`Nhập tên mới cho cảm biến này (tại ${nodeName}):`, currentName);
    if (newName !== null) {
      const trimmed = newName.trim();
      if (trimmed) {
        saveCustomName(sensorKey, trimmed);
      }
    }
  };

  const sensorStats = useMemo(() => {
    const defaultStats = {
      temp: { min: sensors.temp ?? 0, max: sensors.temp ?? 0, avg: sensors.temp ?? 0 },
      humid: { min: sensors.humid ?? 0, max: sensors.humid ?? 0, avg: sensors.humid ?? 0 },
      light: { min: sensors.light ?? 0, max: sensors.light ?? 0, avg: sensors.light ?? 0 },
      gas: { min: sensors.gas ?? 0, max: sensors.gas ?? 0, avg: sensors.gas ?? 0 },
    };

    if (!sensorHistory || sensorHistory.length === 0) {
      return defaultStats;
    }

    const temps = sensorHistory.map((row) => row.nhietdo).filter((v) => v !== null && v !== undefined).map(Number);
    const humids = sensorHistory.map((row) => row.doam).filter((v) => v !== null && v !== undefined).map(Number);
    const lights = sensorHistory.map((row) => row.anhsang).filter((v) => v !== null && v !== undefined).map(Number);
    const gases = sensorHistory.map((row) => row.gas_ppm).filter((v) => v !== null && v !== undefined).map(Number);

    const calc = (arr: number[], current: number | null) => {
      if (arr.length === 0) return { min: current ?? 0, max: current ?? 0, avg: current ?? 0 };
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      return { min, max, avg };
    };

    return {
      temp: calc(temps, sensors.temp),
      humid: calc(humids, sensors.humid),
      light: calc(lights, sensors.light),
      gas: calc(gases, sensors.gas ?? null),
    };
  }, [sensorHistory, sensors]);

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [chartDateFilter, setChartDateFilter] = useState(() => getTodayDateString());
  const [chartHourFilter, setChartHourFilter] = useState(-1);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTrend = async (silent = false) => {
      if (!silent) setTrendLoading(true);
      try {
        // 1. Chọn một giờ cụ thể trong ngày (ví dụ: 10h hay 17h)
        if (chartHourFilter !== -1) {
          const hourStr = String(chartHourFilter).padStart(2, "0");
          const dayStart = new Date(`${chartDateFilter}T${hourStr}:00:00`).toISOString();
          const dayEnd = new Date(`${chartDateFilter}T${hourStr}:59:59.999`).toISOString();

          let query = supabase.from("dulieucambien").select("*");
          if (nodeId) {
            query = query.or(`cambien.eq.${nodeId},cambien_idnode.eq.${nodeId}`);
          }
          query = query
            .gte("thoigian", dayStart)
            .lte("thoigian", dayEnd)
            .order("thoigian", { ascending: true })
            .limit(1000);

          const { data, error } = await query;
          if (!error && data && isMounted) {
            const formatted = data.map((row) => {
              const date = new Date(row.thoigian);
              const hours = String(date.getHours()).padStart(2, "0");
              const minutes = String(date.getMinutes()).padStart(2, "0");
              const seconds = String(date.getSeconds()).padStart(2, "0");
              return {
                label: isNaN(date.getTime()) ? "" : `${hours}:${minutes}:${seconds}`,
                temp: row.nhietdo != null ? +Number(row.nhietdo).toFixed(1) : null,
                humid: row.doam != null ? +Number(row.doam).toFixed(0) : null,
                light: row.anhsang != null ? Math.round(Number(row.anhsang)) : null,
                gas: row.gas_ppm != null ? Math.round(Number(row.gas_ppm)) : null,
              };
            });
            setTrendData(formatted);
          }
        }
        // 2. Chọn "Tất cả giờ" cho ngày hôm nay -> Dùng RPC get_sensor_trend để có kết quả tổng hợp đầy đủ từ SQL mà không bị xén giới hạn dòng
        else if (chartDateFilter === getTodayDateString()) {
          const { data, error } = await supabase.rpc("get_sensor_trend", {
            range_type: "today",
            p_node_id: nodeId || null,
          });

          if (!error && data && isMounted) {
            setTrendData(data);
          } else if (error) {
            console.error("Lỗi khi gọi RPC get_sensor_trend:", error);
          }
        }
        // 3. Chọn "Tất cả giờ" cho ngày khác -> Truy vấn bảng dữ liệu và gom nhóm theo giờ
        else {
          const dayStart = new Date(`${chartDateFilter}T00:00:00`).toISOString();
          const dayEnd = new Date(`${chartDateFilter}T23:59:59.999`).toISOString();

          let query = supabase.from("dulieucambien").select("*");
          if (nodeId) {
            query = query.or(`cambien.eq.${nodeId},cambien_idnode.eq.${nodeId}`);
          }
          query = query
            .gte("thoigian", dayStart)
            .lte("thoigian", dayEnd)
            .order("thoigian", { ascending: false })
            .limit(3000);

          const { data, error } = await query;
          if (!error && data && isMounted) {
            const grouped: Record<string, any[]> = {};
            data.forEach((row) => {
              const h = new Date(row.thoigian).getHours();
              const key = String(h).padStart(2, "0");
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(row);
            });

            const formatted = Object.entries(grouped)
              .map(([hour, items]) => {
                const avg = (vals: (number | null)[]) => {
                  const valid = vals.filter((v) => v != null) as number[];
                  return valid.length ? +(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
                };
                return {
                  label: `${hour}:00`,
                  temp: avg(items.map((i) => (i.nhietdo != null ? +Number(i.nhietdo) : null))),
                  humid: avg(items.map((i) => (i.doam != null ? +Number(i.doam) : null))),
                  light: avg(items.map((i) => (i.anhsang != null ? +Number(i.anhsang) : null))),
                  gas: avg(items.map((i) => (i.gas_ppm != null ? +Number(i.gas_ppm) : null))),
                  count: items.length,
                };
              })
              .sort((a, b) => a.label.localeCompare(b.label));

            setTrendData(formatted);
          }
        }
      } catch (e) {
        console.error("Lỗi fetch trend:", e);
      }
      if (!silent && isMounted) setTrendLoading(false);
    };

    fetchTrend();
    const interval = setInterval(() => fetchTrend(true), 10000); // 10s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [nodeId, chartDateFilter, chartHourFilter]);

  const formattedTrendData = trendData;

  // Lấy ngưỡng từ nodeDevices.cau_hinh (nguồn chân lý từ SettingsTab)
  const tempSensorDev = nodeDevices.find(d => d.loai_thietbi === "cam_bien_nhietdo") || nodeDevices.find(d => d.loai_thietbi === "dieu_hoa");
  const humidSensorDev = nodeDevices.find(d => d.loai_thietbi === "cam_bien_doam") || nodeDevices.find(d => d.loai_thietbi === "quat");
  const lightSensorDev = nodeDevices.find(d => d.loai_thietbi === "cam_bien_anhsang") || nodeDevices.find(d => d.loai_thietbi === "den");
  const gasSensorDev = nodeDevices.find(d => d.loai_thietbi === "cam_bien_gas");

  const tempThreshold = tempSensorDev?.cau_hinh?.threshold ?? thresholds?.temp ?? 30;
  const humidThreshold = humidSensorDev?.cau_hinh?.threshold ?? thresholds?.humid ?? 75;
  const lightThreshold = lightSensorDev?.cau_hinh?.threshold ?? thresholds?.light ?? 200;
  const gasThreshold = gasSensorDev?.cau_hinh?.threshold ?? gasSensorDev?.cau_hinh?.danger_level ?? thresholds?.gas ?? 300;

  const isCurrentNodeOnline = useMemo(() => {
    const nid = (nodeId || "").toLowerCase();
    const nname = (nodeName || "").toLowerCase();
    if (nid.includes("bed") || nname.includes("phòng ngủ") || nid.includes("c3")) return bedroomOnline ?? false;
    if (nid.includes("kitchen") || nid.includes("bep") || nname.includes("bếp")) return kitchenOnline ?? false;
    return livingOnline ?? false;
  }, [nodeId, nodeName, livingOnline, bedroomOnline, kitchenOnline]);

  const hasNodeDevicesLoaded = nodeDevices.length > 0;

  const hasTemp = !hasNodeDevicesLoaded || nodeDevices.some(d => d.loai_thietbi === "cam_bien_nhietdo" || d.loai_thietbi === "dieu_hoa") || sensors.temp != null;
  const hasHumid = !hasNodeDevicesLoaded || nodeDevices.some(d => d.loai_thietbi === "cam_bien_doam" || d.loai_thietbi === "quat") || sensors.humid != null;
  const hasLight = nodeDevices.some(d => d.loai_thietbi === "cam_bien_anhsang" || d.loai_thietbi === "den") || (!hasNodeDevicesLoaded && sensors.light != null && sensors.light > 0);
  const hasGas = nodeDevices.some(d => d.loai_thietbi === "cam_bien_gas") || (sensors.gas != null && sensors.gas > 0) || nodeId === "kitchen" || nodeId === "bep" || nodeId.toLowerCase().includes("bep") || nodeName.toLowerCase().includes("bếp");

  const sensorCards = [
    ...(hasTemp ? [{
      key: "temp",
      label: "Nhiệt độ",
      value: (isCurrentNodeOnline && sensors.temp != null) ? tempA.toFixed(1) : "—",
      rawValue: (isCurrentNodeOnline && sensors.temp != null) ? sensors.temp : 0,
      max: GAUGE_MAX.temp,
      unit: "°C",
      icon: Thermometer,
      alert: isCurrentNodeOnline && sensors.temp != null && sensors.temp >= tempThreshold,
      thresholdText: `>= ${tempThreshold.toFixed(1)}°C`,
      color: "from-rose-500 to-orange-400"
    }] : []),
    ...(hasHumid ? [{
      key: "humid",
      label: "Độ ẩm",
      value: (isCurrentNodeOnline && sensors.humid != null) ? humidA.toFixed(0) : "—",
      rawValue: (isCurrentNodeOnline && sensors.humid != null) ? sensors.humid : 0,
      max: GAUGE_MAX.humid,
      unit: "%",
      icon: Droplets,
      alert: isCurrentNodeOnline && sensors.humid != null && sensors.humid >= humidThreshold,
      thresholdText: `>= ${humidThreshold}%`,
      color: "from-sky-500 to-cyan-400"
    }] : []),
    ...(hasLight ? [{
      key: "light",
      label: "Ánh sáng",
      value: (isCurrentNodeOnline && sensors.light != null) ? Math.round(lightA).toString() : "—",
      rawValue: (isCurrentNodeOnline && sensors.light != null) ? sensors.light : 0,
      max: GAUGE_MAX.light,
      unit: "LX",
      icon: Sun,
      alert: isCurrentNodeOnline && sensors.light != null && sensors.light < lightThreshold,
      thresholdText: `< ${lightThreshold} LX`,
      color: "from-amber-400 to-yellow-300"
    }] : []),
    ...(hasGas ? [{
      key: "gas",
      label: "Khí Gas",
      value: (isCurrentNodeOnline && sensors.gas != null) ? Math.round(sensors.gas).toString() : "—",
      rawValue: (isCurrentNodeOnline && sensors.gas != null) ? sensors.gas : 0,
      max: GAUGE_MAX.gas,
      unit: "PPM",
      icon: Flame,
      alert: isCurrentNodeOnline && sensors.gas != null && sensors.gas >= gasThreshold,
      thresholdText: `>= ${gasThreshold} PPM`,
      color: "from-orange-500 to-red-600"
    }] : [])
  ];

  const totalNodes = 3;
  const activeNodes = [
    livingOnline,
    bedroomOnline,
    kitchenOnline
  ].filter(Boolean).length;

  const latestAlert = alerts.find((a) => a.level === "error" && (!readAlertIds || !readAlertIds.includes(a.id)));

  return (
    <div className="space-y-6">
      {latestAlert && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-gradient-to-r from-rose-50 to-orange-50 p-4 text-rose-800 shadow-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 animate-pulse" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{latestAlert.title}</div>
            <div className="text-xs text-rose-700/80">{latestAlert.detail} · Hệ thống đã phản ứng tự động.</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkAsRead?.(latestAlert.id)}
            className="text-rose-700 hover:bg-rose-100 cursor-pointer"
          >
            Bỏ qua
          </Button>
        </div>
      )}

      {currentUserRole === "admin" ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
          {/* Card 1: Active Nodes */}
          <GlassCard className="relative p-3 sm:p-5 flex flex-col items-center justify-center text-center">
            <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4">
              <Badge className="rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-transparent text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2.5 sm:py-0.5">
                ✓ Hoạt động
              </Badge>
            </div>
            
            <div className="text-2xl sm:text-4xl font-black text-slate-800 dark:text-white mt-4 sm:mt-6 mb-1">
              {activeNodes}/{totalNodes} Node
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-medium mb-4 sm:mb-6 uppercase tracking-wider">
              PK: {livingOnline ? "On" : "Off"} · PN: {bedroomOnline ? "On" : "Off"} · NB: {kitchenOnline ? "On" : "Off"}
            </div>

            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="grid h-6 w-6 sm:h-8 sm:w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-sm">
                <Cpu className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Trạm cảm biến
              </span>
            </div>
          </GlassCard>

          {/* Card 2: MQTT Broker Status */}
          <GlassCard className="relative p-3 sm:p-5 flex flex-col items-center justify-center text-center">
            <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4">
              <Badge className={cn(
                "rounded-full border-transparent text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2.5 sm:py-0.5",
                mqttOnline
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
              )}>
                {mqttOnline ? "✓ Sẵn sàng" : "⚠ Ngoại tuyến"}
              </Badge>
            </div>
            
            <div className="text-2xl sm:text-4xl font-black text-slate-800 dark:text-white mt-4 sm:mt-6 mb-1 truncate max-w-full px-1">
              {mqttOnline ? "CONNECTED" : "OFFLINE"}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-medium mb-4 sm:mb-6 uppercase tracking-wider">
              Broker: hivemq.com (1883)
            </div>

            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="grid h-6 w-6 sm:h-8 sm:w-8 place-items-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-sm">
                <Wifi className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                MQTT Broker
              </span>
            </div>
          </GlassCard>

          {/* Card 3: Avg Network Latency - Real MQTT data */}
          <GlassCard className="relative p-3 sm:p-5 flex flex-col items-center justify-center text-center">
            <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4">
              <Badge className={cn(
                "rounded-full border-transparent text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2.5 sm:py-0.5",
                mqttLatency != null && mqttLatency < 100
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                  : mqttLatency != null
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
                  : "bg-slate-100 text-slate-500"
              )}>
                {mqttLatency != null ? (mqttLatency < 100 ? "✓ Phản hồi tốt" : "⚠ Chậm") : "Đang chờ..."}
              </Badge>
            </div>
            
            <div className="text-2xl sm:text-4xl font-black text-slate-800 dark:text-white mt-4 sm:mt-6 mb-1">
              {mqttLatency != null ? `${mqttLatency} ms` : "—"}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 font-medium mb-4 sm:mb-6 uppercase tracking-wider">
              MQTT Latency (Real-time)
            </div>

            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <div className="grid h-6 w-6 sm:h-8 sm:w-8 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 text-white shadow-sm">
                <Activity className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                Độ trễ phản hồi
              </span>
            </div>
          </GlassCard>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-3 sm:gap-4 lg:gap-5",
            sensorCards.length === 1 && "grid-cols-1 max-w-md mx-auto",
            sensorCards.length === 2 && "grid-cols-1 sm:grid-cols-2",
            sensorCards.length === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            sensorCards.length >= 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          )}
        >
          {sensorCards.map((s) => {
            const Icon = s.icon;
            const stats = sensorStats[s.key as "temp" | "humid" | "light" | "gas"];

            return (
              <GlassCard
                key={s.key}
                className={cn(
                  "relative p-3.5 sm:p-5 flex flex-col gap-3.5 overflow-hidden transition-all duration-300",
                  !isCurrentNodeOnline && "opacity-60 grayscale-[25%]"
                )}
              >
                {/* Header row: Tiêu đề, Icon và Badge trạng thái */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 group">
                    <div className={cn("grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br text-white shadow-sm", s.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm xl:text-base font-extrabold text-slate-900 dark:text-slate-100">
                      {customNames[`${nodeId}-${s.key}`] || s.label}
                    </span>
                    <button
                      onClick={() => handleRename(s.key, customNames[`${nodeId}-${s.key}`] || s.label)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100/50 dark:hover:bg-slate-800/40 cursor-pointer"
                      title="Đổi tên cảm biến"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Badge
                    className={cn(
                      "rounded-full border-transparent text-[10px] xl:text-xs font-semibold px-2.5 py-0.5 shadow-sm transition-all",
                      !isCurrentNodeOnline
                        ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        : s.alert
                          ? "bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400",
                    )}
                  >
                    {!isCurrentNodeOnline ? "Offline" : s.alert ? "Vượt ngưỡng" : "Bình thường"}
                  </Badge>
                </div>

                {/* Đường chia ngang mờ */}
                <div className="h-px w-full bg-slate-100/70 dark:bg-slate-800/50" />

                {/* Thân thẻ chia cột linh hoạt */}
                <div className="flex flex-row sm:flex-col lg:flex-row items-center sm:items-stretch justify-between gap-4 w-full">
                  {/* Cột trái/trên: Vòng Gauge hiển thị thông số */}
                  <div className="flex-shrink-0 flex items-center justify-center">
                    <SensorGauge
                      value={s.value}
                      rawValue={s.rawValue}
                      max={s.max}
                      unit={s.unit}
                      colorKey={s.key as "temp" | "humid" | "light" | "gas"}
                    />
                  </div>

                  {/* Vạch phân cách dọc */}
                  <div className="block sm:hidden lg:block w-px self-stretch bg-gradient-to-b from-slate-100/80 via-slate-200/50 to-slate-100/80 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-800" />

                  {/* Cột phải/dưới: Chi tiết statistics & ngưỡng */}
                  <div className="flex-1 w-full flex flex-col justify-center space-y-2 lg:space-y-3">
                    {/* Ngưỡng an toàn */}
                    <div className="text-[10px] xl:text-xs font-semibold text-slate-400 dark:text-slate-500 text-left sm:text-center lg:text-left">
                      Ngưỡng: <span className="font-bold text-slate-600 dark:text-slate-400">{s.thresholdText}</span>
                    </div>

                    {/* Bảng mini thống kê: Max - Min - Avg */}
                    <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 p-2 border border-slate-100/50 dark:border-slate-800/40 text-center">
                      <div className="space-y-0.5">
                        <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cao nhất</div>
                        <div className="text-[10px] sm:text-[11px] xl:text-xs font-black text-rose-500/90 dark:text-rose-400 tabular-nums">
                          {stats.max.toFixed(s.key === "light" ? 0 : 1)} {s.unit}
                        </div>
                      </div>
                      <div className="space-y-0.5 border-x border-slate-100 dark:border-slate-800/50">
                        <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Thấp nhất</div>
                        <div className="text-[10px] sm:text-[11px] xl:text-xs font-black text-sky-500/90 dark:text-sky-400 tabular-nums">
                          {stats.min.toFixed(s.key === "light" ? 0 : 1)} {s.unit}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tr.Bình</div>
                        <div className="text-[10px] sm:text-[11px] xl:text-xs font-black text-indigo-500/90 dark:text-indigo-400 tabular-nums">
                          {stats.avg.toFixed(s.key === "light" ? 0 : 1)} {s.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {currentUserRole === "admin" ? (
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="h-5 w-5 text-indigo-500" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Giám sát Vận hành Kỹ thuật</h3>
              <p className="text-xs text-slate-500">Thông số kết nối và cổng kết nối phần cứng của ngôi nhà</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Device 1: AC */}
            <div className="p-4 rounded-2xl bg-white/40 border border-slate-100/50 dark:bg-slate-900/40 dark:border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center text-sky-500">
                  <Wind className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{acDev?.ten_hienthi || "Điều hòa"}</h4>
                  <p className="text-[10px] text-slate-500">{acDev ? `Trạng thái: ${acDev.trangthai ? "Bật" : "Tắt"}` : "Chưa kết nối"}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  acDev?.trangthai
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-500"
                )}>
                  <span className={cn("h-1 w-1 rounded-full", acDev?.trangthai ? "bg-emerald-500" : "bg-slate-400")} />
                  {acDev?.trangthai ? "Đang bật" : "Đang tắt"}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">{acDev ? `Chế độ: ${acDev?.tu_dong ? "auto" : "manual"}` : "Chưa kết nối"}</p>
              </div>
            </div>

            {/* Device 2: Fan */}
            <div className="p-4 rounded-2xl bg-white/40 border border-slate-100/50 dark:bg-slate-900/40 dark:border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Fan className="h-5 w-5" style={{ animationDuration: '4s' }} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fanDev?.ten_hienthi || "Quạt thông gió"}</h4>
                  <p className="text-[10px] text-slate-500">{fanDev ? `Trạng thái: ${fanDev.trangthai ? "Bật" : "Tắt"}` : "Chưa kết nối"}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  fanDev?.trangthai
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-500"
                )}>
                  <span className={cn("h-1 w-1 rounded-full", fanDev?.trangthai ? "bg-emerald-500" : "bg-slate-400")} />
                  {fanDev?.trangthai ? "Đang bật" : "Đang tắt"}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">{fanDev ? `Chế độ: ${fanDev.tu_dong ? "auto" : "manual"}` : ""}</p>
              </div>
            </div>

            {/* Device 3: Light */}
            <div className="p-4 rounded-2xl bg-white/40 border border-slate-100/50 dark:bg-slate-900/40 dark:border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{lightDev?.ten_hienthi || "Hệ thống đèn trần"}</h4>
                  <p className="text-[10px] text-slate-500">{lightDev ? `Trạng thái: ${lightDev.trangthai ? "Bật" : "Tắt"}` : "Chưa kết nối"}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  lightDev?.trangthai
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-slate-100 text-slate-500"
                )}>
                  <span className={cn("h-1 w-1 rounded-full", lightDev?.trangthai ? "bg-emerald-500" : "bg-slate-400")} />
                  {lightDev?.trangthai ? "Đang bật" : "Đang tắt"}
                </span>
                <p className="text-[10px] text-slate-400 mt-1">{lightDev ? `Chế độ: ${lightDev.tu_dong ? "auto" : "manual"}` : ""}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      ) : (
        // Buyer: Hiển thị thiết bị theo node hiện tại
        nodeDevicesLoading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Đang tải thiết bị...</span>
          </div>
        ) : nodeDevices.length === 0 ? (
          <GlassCard className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <LayoutGrid className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <div className="text-sm font-semibold text-slate-500">
              Node “{nodeName}” chưa có thiết bị nào
            </div>
            <div className="text-xs text-slate-400">
              Vào mục Cài đặt → Quản lý Node để thêm thiết bị cho phòng này.
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Thiết bị điều khiển */}
            {nodeDevices.filter((d) => !SENSOR_TYPES.has(d.loai_thietbi)).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {nodeDevices
                  .filter((d) => !SENSOR_TYPES.has(d.loai_thietbi))
                  .sort((a, b) => {
                    const order = { "dieu_hoa": 1, "quat": 2, "den": 3 };
                    const orderA = order[a.loai_thietbi as keyof typeof order] ?? 99;
                    const orderB = order[b.loai_thietbi as keyof typeof order] ?? 99;
                    return orderA - orderB;
                  })
                  .map((device) => (
                    <NodeDeviceCard
                      key={device.id_thietbi}
                      device={device}
                      onToggle={onNodeDeviceToggle || (() => {})}
                      onMode={onNodeDeviceModeChange || (() => {})}
                    />
                  ))}
              </div>
            )}
          </>
        )
      )}

      {/* 24h Trend Chart / Network Monitor depending on role */}
      {/* 24h Trend Chart / Network Monitor depending on role */}
      {currentUserRole === "admin" ? (
        <GlassCard className="p-5">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/50 dark:border-slate-800/50 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Giám sát Truyền thông & Băng thông</h3>
              <p className="text-xs text-slate-500">Độ trễ MQTT thời gian thực (30 mẫu gần nhất)</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LegendChip color="#a855f7" label={`Độ trễ: ${mqttLatency != null ? `${mqttLatency}ms` : "—"}`} />
            </div>
          </div>

          {mqttLatHist.length === 0 ? (
            <div className="h-72 w-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 animate-pulse">
              Đang chờ dữ liệu MQTT...
            </div>
          ) : (
            <div className="h-72 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mqttLatHist} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                  <defs>
                    <filter id="glow-latency" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:stroke-slate-800/50" />
                  <XAxis
                    dataKey="t"
                    hide
                  />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 'auto']}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    dx={-5}
                  />
                  <Tooltip
                    formatter={(v: number) => `${Math.round(v)} ms`}
                    labelFormatter={(l: number) => new Date(l).toLocaleTimeString("vi-VN")}
                    contentStyle={{ borderRadius: 12, background: "rgba(255,255,255,0.95)", border: "1px solid rgba(255,255,255,0.7)", fontSize: 12 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="v"
                    stroke="#a855f7"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 1, stroke: "#fff", fill: "#a855f7" }}
                    name="Độ trễ (ms)"
                    connectNulls
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      ) : (
        <GlassCard className="p-5">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/50 dark:border-slate-800/50 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Báo cáo cảm biến & Xu hướng</h3>
              <p className="text-xs text-slate-500">Biểu đồ xu hướng thực tế cập nhật liên tục 10s</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Lọc Ngày/Giờ */}
              <input
                type="date"
                value={chartDateFilter}
                onChange={(e) => setChartDateFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-200 bg-white/80 dark:bg-slate-900 dark:border-slate-700 px-2 text-xs text-slate-700 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => setChartDateFilter(getTodayDateString())}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900 px-2.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hôm nay
              </button>
              <select
                value={chartHourFilter}
                onChange={(e) => setChartHourFilter(Number(e.target.value))}
                className="h-8 rounded-lg border border-slate-200 bg-white/80 dark:bg-slate-900 dark:border-slate-700 px-2 text-xs text-slate-700 dark:text-slate-200"
              >
                <option value={-1}>Tất cả giờ</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>

              <LegendChip color="#ef4444" label={`Nhiệt độ: ${sensors.temp != null ? sensors.temp.toFixed(1) : "—"}°C`} />
              <LegendChip color="#0ea5e9" label={`Độ ẩm: ${sensors.humid != null ? sensors.humid.toFixed(0) : "—"}%`} />
              {sensors.light != null && <LegendChip color="#f59e0b" label={`Ánh sáng: ${Math.round(sensors.light)} lx`} />}
              {sensors.gas != null && <LegendChip color="#f43f5e" label={`Khí gas: ${Math.round(sensors.gas)} ppm`} />}
            </div>
          </div>

          {trendLoading && trendData.length === 0 ? (
            <div className="h-72 w-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 animate-pulse">
              Đang tải biểu đồ xu hướng...
            </div>
          ) : trendData.length === 0 ? (
            <div className="h-72 w-full flex items-center justify-center text-sm text-slate-400">
              Không có dữ liệu cho thời gian này
            </div>
          ) : (
            <div className="h-72 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} className="dark:stroke-slate-800/50" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  {/* Left YAxis for Temp & Humid (0-100) */}
                  <YAxis
                    yAxisId="left"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    dx={-5}
                  />
                  {/* Right YAxis for Light & Gas (0-1000) */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 1000]}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    dx={5}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {nodeDevices.some(d => d.loai_thietbi === "cam_bien_anhsang") && (
                    <Bar
                      yAxisId="right"
                      dataKey="light"
                      fill="#f59e0b"
                      opacity={0.85}
                      name="Ánh sáng"
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                  {nodeDevices.some(d => d.loai_thietbi === "cam_bien_gas") && (
                    <Bar
                      yAxisId="right"
                      dataKey="gas"
                      fill="#f43f5e"
                      opacity={0.85}
                      name="Khí gas"
                      radius={[4, 4, 0, 0]}
                    />
                  )}
                  
                  {(nodeDevices.some(d => d.loai_thietbi === "cam_bien_nhietdo") || nodeDevices.some(d => d.loai_thietbi === "dieu_hoa")) && (
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="temp"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 1, stroke: "#fff", fill: "#ef4444" }}
                      name="Nhiệt độ"
                      connectNulls
                    />
                  )}
                  {(nodeDevices.some(d => d.loai_thietbi === "cam_bien_doam") || nodeDevices.some(d => d.loai_thietbi === "quat")) && (
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="humid"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 1, stroke: "#fff", fill: "#0ea5e9" }}
                      name="Độ ẩm"
                      connectNulls
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
      )}

      <ForecastCard sensors={sensors} />
    </div>
  );
}
