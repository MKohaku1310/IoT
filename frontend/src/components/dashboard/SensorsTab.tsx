import React, { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  Thermometer,
  Droplets,
  Sun,
  Filter,
  Download,
  Activity,
  Database,
  Smile,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  Area,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassCard } from "./GlassCard";
import { Sparkline } from "@/components/sparkline";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

/* -------------------- Mock Data Generators -------------------- */
function genSeries(base: number, amp: number, n: number, noise = 0.4) {
  return Array.from({ length: n }).map((_, i) => {
    const t = (i / n) * Math.PI * 2;
    return +(base + Math.sin(t) * amp + (Math.random() - 0.5) * amp * noise).toFixed(1);
  });
}
const TEMP_24 = genSeries(28, 4, 24);
const HUMID_24 = genSeries(62, 10, 24);
const LIGHT_24 = Array.from({ length: 24 }).map((_, i) => {
  const t = (i - 6) / 24;
  return Math.max(0, Math.round(600 * Math.sin(t * Math.PI) + (Math.random() - 0.5) * 80));
});



/* -------------------- Table Helpers -------------------- */
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-3 text-left font-semibold">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3.5 text-slate-700 dark:text-slate-300", className)}>{children}</td>;
}

/* -------------------- Mini Sparkline Chart -------------------- */
function MiniChart({
  title,
  data,
  color,
  unit,
  stats,
  icon: Icon,
}: {
  title: string;
  data: number[];
  color: string;
  unit: string;
  stats: { min: string; max: string; avg: string };
  icon: typeof Thermometer;
}) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color }} />
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
        </div>
        <div className="text-xs text-slate-500">TB {stats.avg} {unit}</div>
      </div>
      <div className="mt-3 h-14 w-full">
        <Sparkline data={data} color={color} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
        <span>Min: <b className="text-slate-700 dark:text-slate-300">{stats.min}</b></span>
        <span>Max: <b className="text-slate-700 dark:text-slate-300">{stats.max}</b></span>
      </div>
    </GlassCard>
  );
}

/* -------------------- Heatmap Card -------------------- */
const HEAT_METRICS = [
  { key: "temp", label: "Nhiệt độ", unit: "°C", base: 28, amp: 5, palette: ["#ecfeff", "#a5f3fc", "#67e8f9", "#facc15", "#fb923c", "#ef4444"] },
  { key: "humid", label: "Độ ẩm", unit: "%", base: 60, amp: 15, palette: ["#fef9c3", "#bbf7d0", "#a5f3fc", "#93c5fd", "#818cf8", "#4f46e5"] },
  { key: "light", label: "Ánh sáng", unit: "lx", base: 400, amp: 350, palette: ["#1e293b", "#334155", "#64748b", "#facc15", "#fde68a", "#fef3c7"] },
] as const;

function HeatmapCard({ rawData, loading }: { rawData: any[]; loading: boolean }) {
  const [metricIdx, setMetricIdx] = useState(0);
  const metric = HEAT_METRICS[metricIdx];

  const data = useMemo(() => {
    const daysOfWeek = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    return daysOfWeek.map((day, di) => {
      const dowValue = di + 1; // 1 for T2, ..., 7 for CN
      return {
        day,
        values: Array.from({ length: 24 }).map((_, h) => {
          const match = rawData?.find((r) => r.dow === dowValue && r.hr === h);
          if (match) {
            if (metric.key === "temp") return Number(match.avg_temp);
            if (metric.key === "humid") return Number(match.avg_humid);
            if (metric.key === "light") return Number(match.avg_light);
          }
          return metric.base; // default fallback if no data
        }),
      };
    });
  }, [rawData, metric]);

  if (loading) {
    return (
      <GlassCard>
        <div className="text-center py-12 text-sm text-slate-500 font-medium animate-pulse">
          Đang tải bản đồ nhiệt cảm biến...
        </div>
      </GlassCard>
    );
  }

  const all = data.flatMap((r) => r.values);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const color = (v: number) => {
    const p = (v - min) / (max - min + 1e-6);
    const idx = Math.min(metric.palette.length - 1, Math.floor(p * metric.palette.length));
    return metric.palette[idx];
  };

  return (
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Bản đồ nhiệt theo giờ</h3>
          <p className="text-xs text-slate-500">Pattern trung bình 7 ngày qua · {metric.label} ({metric.unit})</p>
        </div>
        <div className="inline-flex rounded-xl bg-slate-100/80 p-1 text-xs">
          {HEAT_METRICS.map((m, i) => (
            <button
              key={m.key}
              onClick={() => setMetricIdx(i)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-medium transition cursor-pointer",
                metricIdx === i ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="flex text-[10px] font-medium text-slate-500">
            <div className="w-10" />
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="w-6 text-center tabular-nums">{h % 3 === 0 ? h : ""}</div>
            ))}
          </div>
          {data.map((row) => (
            <div key={row.day} className="mt-0.5 flex items-center">
              <div className="w-10 text-xs font-medium text-slate-500">{row.day}</div>
              {row.values.map((v, h) => (
                <div
                  key={h}
                  title={`${row.day} · ${h}:00 · ${v}${metric.unit}`}
                  className="mx-[1px] h-6 w-6 rounded-md transition hover:scale-125 hover:z-10 hover:ring-2 hover:ring-white"
                  style={{ background: color(v) }}
                />
              ))}
            </div>
          ))}
          <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-500">
            <span>Thấp {min.toFixed(0)}{metric.unit}</span>
            <div className="flex overflow-hidden rounded-md">
              {metric.palette.map((c) => (
                <div key={c} className="h-3 w-6" style={{ background: c }} />
              ))}
            </div>
            <span>Cao {max.toFixed(0)}{metric.unit}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/* -------------------- Sensors Tab Main -------------------- */
export function SensorsTab() {
  const [range, setRange] = useState<"today" | "7d" | "30d">("today");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [history, setHistory] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleSeries, setVisibleSeries] = useState({
    temp: true,
    humid: true,
    light: true,
  });

  const toggleSeries = (e: any) => {
    const { dataKey } = e;
    setVisibleSeries((prev: any) => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }));
  };

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      try {
        let limit = 100;
        if (range === "7d") limit = 500;
        if (range === "30d") limit = 1000;

        const { data, error } = await supabase
          .from("dulieucambien")
          .select("*")
          .order("thoigian", { ascending: false })
          .limit(limit);

        if (data) {
          setHistory(data);
        }
      } catch (e) {
        console.error("Lỗi khi tải lịch sử cảm biến:", e);
      }
      setLoading(false);
    }

    async function fetchChartData(isSilent = false) {
      if (!isSilent) setChartLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_sensor_trend", {
          range_type: range,
        });
        if (error) {
          console.error("Lỗi khi tải dữ liệu xu hướng (RPC):", error);
        } else if (data) {
          console.log("[SensorsTab] fetchChartData data:", JSON.stringify(data));
          setChartData(data);
        }
      } catch (e) {
        console.error("Lỗi khi gọi RPC get_sensor_trend:", e);
      }
      if (!isSilent) setChartLoading(false);
    }

    async function fetchHeatmapData(isSilent = false) {
      if (!isSilent) setHeatmapLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_sensor_heatmap");
        if (error) {
          console.error("Lỗi khi tải dữ liệu bản đồ nhiệt (RPC):", error);
        } else if (data) {
          setHeatmapData(data);
        }
      } catch (e) {
        console.error("Lỗi khi gọi RPC get_sensor_heatmap:", e);
      }
      if (!isSilent) setHeatmapLoading(false);
    }

    fetchHistory();
    fetchChartData(false);
    fetchHeatmapData(false);

    const channel = supabase
      .channel("sensors-tab-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dulieucambien" },
        (payload) => {
          setHistory((prev) => [payload.new, ...prev].slice(0, 100));
          fetchChartData(true);
          fetchHeatmapData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [range]);

  const devicesList = useMemo(() => {
    const list = new Set<string>();
    history.forEach((h) => {
      if (h.cambien) {
        list.add(h.cambien);
      }
    });
    if (list.size === 0) {
      list.add("ESP32");
    }
    return Array.from(list);
  }, [history]);

  const stats = useMemo(() => {
    if (history.length === 0) {
      return {
        temp: { min: "0", max: "0", avg: "0" },
        humid: { min: "0", max: "0", avg: "0" },
        light: { min: "0", max: "0", avg: "0" },
      };
    }
    const temps = history.map(h => Number(h.nhietdo));
    const humids = history.map(h => Number(h.doam));
    const lights = history.map(h => Number(h.anhsang));

    const s = (arr: number[]) => ({
      min: Math.min(...arr).toFixed(1),
      max: Math.max(...arr).toFixed(1),
      avg: (arr.reduce((a: number, b: number) => a + b, 0) / arr.length).toFixed(1),
    });

    return { temp: s(temps), humid: s(humids), light: s(lights) };
  }, [history]);

  const sparkData = useMemo(() => {
    const sliced = history.slice(0, 24).reverse();
    return {
      temp: sliced.map(h => Number(h.nhietdo)),
      humid: sliced.map(h => Number(h.doam)),
      light: sliced.map(h => Number(h.anhsang)),
    };
  }, [history]);

  const isOnline = useMemo(() => {
    if (history.length === 0) return false;
    const lastTime = new Date(history[0].thoigian).getTime();
    const now = new Date().getTime();
    return (now - lastTime) < 5 * 60 * 1000;
  }, [history]);

  const lastSeenStr = useMemo(() => {
    if (history.length === 0) return "Chưa có dữ liệu";
    const lastTime = new Date(history[0].thoigian).getTime();
    const now = new Date().getTime();
    const diffSec = Math.round((now - lastTime) / 1000);
    if (diffSec < 60) return `${diffSec} giây trước`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    return new Date(history[0].thoigian).toLocaleTimeString("vi-VN");
  }, [history]);

  const uptimeStats = useMemo(() => {
    if (history.length === 0) return { uptimeStr: "0 phút", percent: 0 };
    const todayStr = new Date().toDateString();
    const todayRecords = history.filter(h => new Date(h.thoigian).toDateString() === todayStr);
    if (todayRecords.length < 2) return { uptimeStr: "Đang tính...", percent: 100 };
    
    const sorted = [...todayRecords].sort((a, b) => new Date(a.thoigian).getTime() - new Date(b.thoigian).getTime());
    let totalActiveMs = 0;
    let lastTime = new Date(sorted[0].thoigian).getTime();
    
    for (let i = 1; i < sorted.length; i++) {
      const currentTime = new Date(sorted[i].thoigian).getTime();
      const diff = currentTime - lastTime;
      if (diff < 300000) {
        totalActiveMs += diff;
      }
      lastTime = currentTime;
    }
    
    const totalMinutes = Math.round(totalActiveMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    const uptimeStr = hours > 0 ? `${hours}h ${minutes}p` : `${minutes} phút`;
    const totalSpanMs = new Date(sorted[sorted.length - 1].thoigian).getTime() - new Date(sorted[0].thoigian).getTime();
    const percent = totalSpanMs > 0 ? Math.min(100, Math.round((totalActiveMs / totalSpanMs) * 100)) : 100;
    
    return { uptimeStr, percent };
  }, [history]);

  const todayRecordsCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return history.filter(h => new Date(h.thoigian).toDateString() === todayStr).length;
  }, [history]);

  const avgIntervalStr = useMemo(() => {
    if (history.length < 2) return "Đang tính...";
    let sum = 0;
    let count = 0;
    for (let i = 0; i < history.length - 1; i++) {
      const diff = Math.abs(new Date(history[i].thoigian).getTime() - new Date(history[i+1].thoigian).getTime());
      if (diff < 300000) {
        sum += diff;
        count++;
      }
    }
    if (count === 0) return "Không ổn định";
    const sec = Math.round((sum / count) / 1000);
    return `~${sec} giây/lần`;
  }, [history]);

  const comfortScore = useMemo(() => {
    if (history.length === 0) return { score: 100, status: "Chưa rõ", color: "#64748b" };
    const temp = Number(history[0].nhietdo);
    const humid = Number(history[0].doam);
    
    if (isNaN(temp) || isNaN(humid)) return { score: 100, status: "Chưa rõ", color: "#64748b" };
    
    let tempPenalty = 0;
    if (temp < 22) tempPenalty = (22 - temp) * 6;
    else if (temp > 26) tempPenalty = (temp - 26) * 6;
    
    let humidPenalty = 0;
    if (humid < 45) humidPenalty = (45 - humid) * 1.5;
    else if (humid > 60) humidPenalty = (humid - 60) * 1.5;
    
    const score = Math.max(0, Math.min(100, Math.round(100 - tempPenalty - humidPenalty)));
    
    let status = "Rất thoải mái";
    let color = "#10b981";
    if (score < 40) {
      status = "Không thoải mái";
      color = "#ef4444";
    } else if (score < 70) {
      status = "Hơi khó chịu";
      color = "#f59e0b";
    } else if (score < 85) {
      status = "Khá thoải mái";
      color = "#10b981";
    }
    
    return { score, status, color };
  }, [history]);

  const comboData = useMemo(() => {
    if (!chartData) return [];
    return chartData.map((d) => ({
      ...d,
      temp: d.temp != null ? Number(d.temp) : null,
      humid: d.humid != null ? Number(d.humid) : null,
      light: d.light != null ? Number(d.light) : 0,
      temp_prev_avg: d.temp_prev_avg != null ? Number(d.temp_prev_avg) : null,
      humid_prev_avg: d.humid_prev_avg != null ? Number(d.humid_prev_avg) : null,
      light_prev_avg: d.light_prev_avg != null ? Number(d.light_prev_avg) : 0,
    }));
  }, [chartData]);

  const hasNoChartData = useMemo(() => {
    if (!comboData || comboData.length === 0) return true;
    return comboData.every(d => d.temp == null && d.humid == null);
  }, [comboData]);

  console.log("[SensorsTab] comboData:", JSON.stringify(comboData));


  const filtered = useMemo(() => {
    // Sắp xếp lịch sử theo iddl giảm dần để đảm bảo dòng mới nhất luôn ở trên cùng
    const sortedHistory = [...history].sort((a, b) => Number(b.iddl) - Number(a.iddl));

    const mapped = sortedHistory.map((h) => ({
      id: Number(h.iddl),
      time: new Date(h.thoigian).toLocaleString("vi-VN"),
      rawTime: h.thoigian,
      temp: Number(h.nhietdo).toFixed(1),
      humid: Number(h.doam).toFixed(0),
      light: Math.round(Number(h.anhsang)),
      device: h.cambien || "ESP32",
    }));

    return deviceFilter === "all"
      ? mapped
      : mapped.filter((r) => r.device === deviceFilter);
  }, [history, deviceFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deviceFilter, range]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const exportCSV = () => {
    const header = "\uFEFFsep=,\n\"STT\",\"Date\",\"Time\",\"Temp (C)\",\"Humidity (%)\",\"Light (lx)\",\"Device\"\n";
    const rows = filtered.map((r) => {
      const d = new Date(r.rawTime);
      let dateStr = "";
      let timeStr = "";
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        dateStr = `\t${day}/${mo}/${y}`;
        timeStr = `\t${h}:${min}:${s}`;
      } else {
        dateStr = `\t${r.time}`;
        timeStr = "";
      }
      return `"${r.id}","${dateStr}","${timeStr}","${r.temp}","${r.humid}","${r.light}","${r.device}"`;
    }).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    const a = document.createElement("a");
    a.href = url;
    a.download = `lich-su-do-dac-${y}${m}${day}-${h}${min}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất file CSV chuẩn Excel thành công!");
  };

  return (
    <div className="space-y-6">
      {/* Mini sparklines */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Card 1: Trạng thái & Uptime */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className={cn("h-5 w-5", isOnline ? "text-emerald-500 animate-pulse" : "text-slate-400")} />
              <span className="text-sm font-semibold text-slate-950 dark:text-white">Trạng thái cảm biến</span>
            </div>
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              isOnline ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", isOnline ? "bg-emerald-600 dark:bg-emerald-400 animate-ping" : "bg-rose-600 dark:bg-rose-400")} />
              {isOnline ? "Hoạt động" : "Ngoại tuyến"}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {uptimeStats.uptimeStr}
            </div>
            <div className="text-xs text-slate-500">Thời gian chạy hôm nay (Uptime: {uptimeStats.percent}%)</div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between">
            <span>Thiết bị: <b className="text-slate-700 dark:text-slate-300">{deviceFilter === "all" ? "ESP32-S3" : deviceFilter}</b></span>
            <span>Lần cuối: <b className="text-slate-700 dark:text-slate-300">{lastSeenStr}</b></span>
          </div>
        </GlassCard>

        {/* Card 2: Thống kê truyền nhận */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-500" />
              <span className="text-sm font-semibold text-slate-950 dark:text-white">Thống kê truyền nhận</span>
            </div>
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
              Ổn định
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {todayRecordsCount.toLocaleString("vi-VN")}
            </div>
            <div className="text-xs text-slate-500">Số bản ghi nhận được hôm nay</div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between">
            <span>Tần suất gửi tin: <b className="text-slate-700 dark:text-slate-300">{avgIntervalStr}</b></span>
            <span>Dung lượng: <b className="text-slate-700 dark:text-slate-300">~{(todayRecordsCount * 0.12).toFixed(1)} KB</b></span>
          </div>
        </GlassCard>

        {/* Card 3: Chỉ số thoải mái môi trường */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smile className="h-5 w-5" style={{ color: comfortScore.color }} />
              <span className="text-sm font-semibold text-slate-950 dark:text-white">Mức độ thoải mái phòng</span>
            </div>
            <span 
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ backgroundColor: `${comfortScore.color}15`, color: comfortScore.color }}
            >
              Comfort Score
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <div className="text-2xl font-bold tracking-tight" style={{ color: comfortScore.color }}>
              {comfortScore.score} <span className="text-sm font-medium text-slate-500">/ 100</span>
            </div>
            <div className="text-xs text-slate-500">Trạng thái: <span className="font-semibold text-slate-700 dark:text-slate-300">{comfortScore.status}</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between">
            <span>Nhiệt độ HT: <b className="text-slate-700 dark:text-slate-300">{history[0] ? Number(history[0].nhietdo).toFixed(1) : "0"}°C</b></span>
            <span>Độ ẩm HT: <b className="text-slate-700 dark:text-slate-300">{history[0] ? Number(history[0].doam).toFixed(0) : "%"}%</b></span>
          </div>
        </GlassCard>
      </div>

      {/* Combo chart */}
      <GlassCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">So sánh xu hướng</h3>
            <p className="text-xs text-slate-500">Tổng hợp 3 cảm biến theo khoảng thời gian</p>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100/80 p-1 text-xs">
            {(["today", "7d", "30d"]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r as "today" | "7d" | "30d")}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-medium transition cursor-pointer",
                  range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                )}
              >
                {r === "today" ? "Hôm nay" : r === "7d" ? "7 ngày" : "30 ngày"}
              </button>
            ))}
          </div>
        </div>
        {chartLoading ? (
          <div className="h-64 w-full flex items-center justify-center text-sm text-slate-500">Đang tải biểu đồ cảm biến...</div>
        ) : hasNoChartData ? (
          <div className="h-64 w-full flex flex-col items-center justify-center text-sm text-slate-500">
            <svg className="mb-2 h-8 w-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Chưa có dữ liệu cho khoảng thời gian này
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comboData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHumid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="l" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" domain={[0, 1000]} orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, background: "rgba(255,255,255,0.95)", border: "1px solid rgba(255,255,255,0.7)", fontSize: 12 }} />
                <Legend onClick={toggleSeries} wrapperStyle={{ fontSize: 12, cursor: "pointer" }} />
                <Bar hide={!visibleSeries.light} yAxisId="r" dataKey="light" fill="#f59e0b" opacity={0.15} name="Ánh sáng" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Area hide={!visibleSeries.humid} yAxisId="l" type="monotone" dataKey="humid" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorHumid)" connectNulls={true} name="Độ ẩm" isAnimationActive={false} />
                <Line hide={!visibleSeries.temp} yAxisId="l" type="linear" dataKey="temp" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 1, stroke: "#fff", fill: "#ef4444" }} connectNulls={true} name="Nhiệt độ" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      <HeatmapCard rawData={heatmapData} loading={heatmapLoading} />

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Lịch sử đo đạc</h3>
            <p className="text-xs text-slate-500">{filtered.length} bản ghi gần nhất</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5" /> Thiết bị:
            </div>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="h-9 w-52 bg-white/80 text-xs text-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {devicesList.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={exportCSV} className="bg-slate-900 text-white hover:bg-slate-800 cursor-pointer">
              <Download className="mr-1.5 h-3.5 w-3.5" /> Xuất CSV
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-y border-slate-200/70 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <Th>STT</Th><Th>Thời gian</Th><Th>Nhiệt độ (°C)</Th><Th>Độ ẩm (%)</Th><Th>Ánh sáng (lx)</Th><Th>Thiết bị gửi</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500 animate-pulse">Đang tải lịch sử...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500">Không có dữ liệu</td>
                </tr>
              ) : (
                paginatedData.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 transition hover:bg-white/60 dark:hover:bg-slate-800/40">
                    <Td className="font-medium text-slate-500">{r.id}</Td>
                    <Td className="tabular-nums">{r.time}</Td>
                    <Td className="tabular-nums font-semibold text-rose-600">{r.temp}°C</Td>
                    <Td className="tabular-nums font-semibold text-sky-600">{r.humid}%</Td>
                    <Td className="tabular-nums font-semibold text-amber-600">{r.light} lx</Td>
                    <Td><span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">{r.device}</span></Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controller */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200/70 p-4 bg-slate-50/30 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>
                Hiển thị <b>{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</b> đến{" "}
                <b>{Math.min(filtered.length, currentPage * pageSize)}</b> trong tổng số{" "}
                <b>{filtered.length}</b> bản ghi
              </span>
              <div className="flex items-center gap-1.5">
                <span>Số dòng:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>

              {totalPages > 1 && Array.from({ length: totalPages }).map((_, idx) => {
                const p = idx + 1;
                const near = p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                if (!near) {
                  if (p === 2 || p === totalPages - 1) return <span key={p} className="px-0.5 text-xs text-slate-400">…</span>;
                  return null;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition cursor-pointer",
                      p === currentPage
                        ? "bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-200"
                        : "border border-white/60 bg-white/60 text-slate-600 hover:bg-white shadow-sm"
                    )}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
