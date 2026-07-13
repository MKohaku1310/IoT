import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
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
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAnimatedNumber, useRelativeTime } from "@/lib/smart-home";
import { GlassCard } from "./GlassCard";
import { CITIES } from "./constants";
import { Devices, Sensors, Alert, DeviceState } from "./types";
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
} from "recharts";

/* -------------------- Forecast Card -------------------- */
function ForecastCard({ sensors, nodeName }: { sensors: Sensors; nodeName: string }) {
  const [tab, setTab] = useState<"trend" | "ai">("trend");
  const hist = useRef<{ t: number; temp: number; humid: number }[]>([]);
  const [tick, setTick] = useState(0);

  // AI State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    weatherSummary: string;
    advice: string;
    suggestions: { device_id: number; device_name: string; action: string; time: string; days: number[]; reason: string }[];
  } | null>(null);
  
  const defaultCity = typeof window !== "undefined" ? (window.localStorage.getItem("sh-gemini-city") || CITIES[0].name) : CITIES[0].name;

  useEffect(() => {
    hist.current.push({ t: Date.now(), temp: sensors.temp, humid: sensors.humid });
    if (hist.current.length > 30) hist.current.shift();
    setTick((x) => x + 1);
  }, [sensors.temp, sensors.humid]);

  const slope = (key: "temp" | "humid") => {
    const arr = hist.current.slice(-10);
    if (arr.length < 2) return 0;
    const first = arr[0][key];
    const last = arr[arr.length - 1][key];
    return (last - first) / arr.length;
  };
  const tempSlope = slope("temp");
  const humidSlope = slope("humid");
  const forecastTemp = +(sensors.temp + tempSlope * 15).toFixed(1);
  const forecastHumid = Math.round(sensors.humid + humidSlope * 15);

  const chart = useMemo(() => {
    const arr: { label: string; temp: number; forecast?: number }[] = [];
    for (let i = 0; i < 12; i++) {
      arr.push({ label: `-${(11 - i) * 5}m`, temp: +(sensors.temp - tempSlope * (11 - i) * 2 + (Math.random() - 0.5) * 0.3).toFixed(1) });
    }
    arr.push({ label: "now", temp: sensors.temp, forecast: sensors.temp });
    for (let i = 1; i <= 6; i++) {
      arr.push({ label: `+${i * 10}m`, temp: NaN as unknown as number, forecast: +(sensors.temp + tempSlope * i * 2).toFixed(1) });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const trend = (v: number) =>
    v > 0.05 ? { label: "tăng", color: "text-rose-600", arrow: "↗" } : v < -0.05 ? { label: "giảm", color: "text-sky-600", arrow: "↘" } : { label: "ổn định", color: "text-emerald-600", arrow: "→" };
  const tT = trend(tempSlope);
  const tH = trend(humidSlope);

  const handleRunAI = async () => {
    const rawKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof window !== "undefined" ? window.localStorage.getItem("sh-gemini-key") : null);
    const apiKey = rawKey ? rawKey.trim().replace(/[^a-zA-Z0-9._-]/g, "") : null;
    if (!apiKey) {
      toast.error("Vui lòng cấu hình API Key Gemini trong Cài đặt hệ thống!");
      return;
    }
    
    setAiLoading(true);
    try {
      console.log(`[AI] Bắt đầu gọi API với Key: ${apiKey.slice(0, 6)}...${apiKey.slice(-6)}`);
      const c = CITIES.find(x => x.name === defaultCity) || CITIES[0];
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,relative_humidity_2m,weather_code&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code&timezone=Asia%2FBangkok`);
      if (!weatherRes.ok) throw new Error("Lỗi API thời tiết");
      const weatherData = await weatherRes.json();
      
      const prompt = `Bạn là một Trợ lý AI Nhà thông minh (Smart Home Assistant).
Hãy phân tích dữ liệu thời tiết thực tế bên ngoài (do API cung cấp) và thông số cảm biến trong nhà hiện tại, sau đó đưa ra lời khuyên cho chủ nhà và các đề xuất hẹn giờ tối ưu cho thiết bị.

Thông số trong nhà hiện tại:
- Nhiệt độ trong phòng: ${sensors.temp}°C
- Độ ẩm trong phòng: ${sensors.humid}%
- Ánh sáng trong phòng: ${sensors.light} lx

Dự báo thời tiết ngoài trời tại ${c.name} (hiện tại và vài giờ tới):
- Nhiệt độ hiện tại: ${weatherData.current?.temperature_2m}°C, Độ ẩm: ${weatherData.current?.relative_humidity_2m}%
- Dự báo các giờ tới: Nhiệt độ giao động từ ${Math.min(...(weatherData.hourly?.temperature_2m?.slice(0,12) || []))} đến ${Math.max(...(weatherData.hourly?.temperature_2m?.slice(0,12) || []))}°C. Xác suất mưa: ${Math.max(...(weatherData.hourly?.precipitation_probability?.slice(0,12) || []))}%.

Yêu cầu đầu ra:
Trả về duy nhất định dạng JSON (không markdown, không text dư thừa) khớp cấu trúc sau:
{
  "weatherSummary": "Mô tả ngắn gọn thời tiết ngoài trời...",
  "advice": "Lời khuyên thực tế cho chủ nhà (vd: Sắp mưa, hãy đóng cửa sổ và mang ô...)",
  "suggestions": [
    {
      "device_id": 1, 
      "device_name": "Điều hòa",
      "action": "on", 
      "time": "12:00",
      "days": [0, 1, 2, 3, 4, 5, 6],
      "reason": "Dự báo ngoài trời 35°C lúc trưa..."
    }
  ]
}
Chú ý: device_id=1 (Điều hòa), device_id=2 (Quạt), device_id=3 (Đèn). action có thể là "on" hoặc "off". days là mảng chứa các thứ trong tuần (0-6).
Nếu không có đề xuất phù hợp, suggestions có thể rỗng.`;

      // Danh sách các tổ hợp API version và Model để tự động fallback tìm ra cái hoạt động
      const TARGETS = [
        { ver: "v1", model: "gemini-3.5-flash" },
        { ver: "v1beta", model: "gemini-3.5-flash" },
        { ver: "v1", model: "gemini-2.5-flash" },
        { ver: "v1beta", model: "gemini-2.5-flash" },
        { ver: "v1", model: "gemini-3.1-flash-lite" },
        { ver: "v1beta", model: "gemini-3.1-flash-lite" },
        { ver: "v1", model: "gemini-2.5-pro" },
        { ver: "v1beta", model: "gemini-2.5-pro" },
        { ver: "v1", model: "gemini-2.0-flash" },
        { ver: "v1beta", model: "gemini-2.0-flash" },
        { ver: "v1", model: "gemini-1.5-flash" },
        { ver: "v1beta", model: "gemini-1.5-flash" },
      ];

      let geminiRes: Response | null = null;
      let lastError = "";

      for (const target of TARGETS) {
        try {
          const url = `https://generativelanguage.googleapis.com/${target.ver}/models/${target.model}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });

          if (res.ok) {
            geminiRes = res;
            console.log(`[AI] Thành công với model: ${target.model} (${target.ver})`);
            break;
          } else {
            const errJson = await res.json().catch(() => ({}));
            lastError = errJson.error?.message || `HTTP ${res.status}`;
            console.warn(`[AI] Model ${target.model} (${target.ver}) thất bại:`, lastError);
          }
        } catch (err: any) {
          lastError = err.message || "Fetch error";
          console.warn(`[AI] Lỗi kết nối model ${target.model} (${target.ver}):`, lastError);
        }
      }

      if (!geminiRes) {
        throw new Error(`Tất cả các model AI đều không khả dụng. Lỗi cuối: ${lastError}`);
      }
      const geminiData = await geminiRes.json();
      let text = geminiData.candidates[0].content.parts[0].text || "";
      
      // Bóc tách JSON nếu AI trả về kèm ký hiệu markdown ```json ... ```
      text = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      const json = JSON.parse(text);
      
      setAiResult(json);
      
      // Auto log AI advice to system
      await supabase.from("nhatkyhoatdong").insert([{
        hanhdong: `[Trợ lý AI] Cảnh báo thời tiết: ${json.advice}`
      }]);
      toast.success("Đã nhận phân tích thời tiết từ AI!");
    } catch (e: any) {
      console.error("Lỗi AI:", e);
      toast.error(`Lỗi: ${e.message || "Khi phân tích bằng AI"}`);
    }
    setAiLoading(false);
  };

  const applySuggestion = async (sugg: any) => {
    try {
      const { error } = await supabase.from("lichhengio").insert([{
        idden: sugg.device_id,
        hanhdong: sugg.action,
        thoigian: sugg.time.length === 5 ? sugg.time + ":00" : sugg.time,
        thu: sugg.days,
        kichhoat: true,
      }]);
      if (error) throw error;
      
      await supabase.from("nhatkyhoatdong").insert([{
        hanhdong: `Cấu hình: Trợ lý AI thêm lịch hẹn giờ cho ${sugg.device_name} (${sugg.action === "on" ? "BẬT" : "TẮT"} lúc ${sugg.time})`
      }]);
      
      toast.success(`Đã áp dụng đề xuất hẹn giờ cho ${sugg.device_name}!`);
    } catch (e) {
      toast.error("Lỗi khi áp dụng đề xuất hẹn giờ!");
    }
  };

  return (
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/50 dark:border-slate-800/50 pb-3">
        <div className="flex items-center gap-3 bg-slate-100/70 dark:bg-slate-800/50 p-1 rounded-xl">
          <button
            onClick={() => setTab("trend")}
            className={cn("flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all", tab === "trend" ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            <TrendingUp className="h-4 w-4" /> Xu hướng ngắn hạn
          </button>
          <button
            onClick={() => setTab("ai")}
            className={cn("flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition-all", tab === "ai" ? "bg-white dark:bg-slate-700 text-purple-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            <Bot className="h-4 w-4" /> Trợ lý AI Thời tiết
          </button>
        </div>
      </div>

      {tab === "trend" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-rose-50 to-orange-50 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-rose-700">
              <Thermometer className="h-3.5 w-3.5" /> Nhiệt độ dự báo (15 phút)
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tabular-nums">{forecastTemp}</span>
              <span className="text-sm text-slate-600">°C</span>
            </div>
            <div className={cn("mt-1 text-xs font-medium", tT.color)}>{tT.arrow} Xu hướng {tT.label}</div>
          </div>
          <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-sky-50 to-cyan-50 p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-sky-700">
              <Droplets className="h-3.5 w-3.5" /> Độ ẩm dự báo (15 phút)
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tabular-nums">{forecastHumid}</span>
              <span className="text-sm text-slate-600">%</span>
            </div>
            <div className={cn("mt-1 text-xs font-medium", tH.color)}>{tH.arrow} Xu hướng {tH.label}</div>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/60 p-2 md:col-span-1">
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
            <div className="px-2 pb-2 text-[10px] text-slate-500">Đường liền: thực tế · Đường đứt: dự báo</div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!aiResult ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-purple-100 bg-purple-50/50">
              <div className="h-16 w-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                {aiLoading ? <Bot className="h-8 w-8 animate-pulse" /> : <Sparkles className="h-8 w-8" />}
              </div>
              <h4 className="text-base font-semibold text-slate-800 mb-2">Trợ lý Dự báo & Lên lịch AI</h4>
              <p className="text-sm text-slate-500 max-w-md mb-6">
                Sử dụng Google Gemini kết hợp dự báo thời tiết tại {defaultCity} và thông số phòng {nodeName} để đưa ra gợi ý thông minh nhất.
              </p>
              <Button onClick={handleRunAI} disabled={aiLoading} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 shadow-lg shadow-purple-500/30 text-white border-0">
                {aiLoading ? "Đang phân tích..." : "Bắt đầu phân tích AI"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-600" /> Kết quả phân tích tại {defaultCity}
                </h4>
                <Button variant="outline" size="sm" onClick={handleRunAI} disabled={aiLoading} className="h-8 text-xs cursor-pointer">
                  {aiLoading ? "Đang cập nhật..." : "Làm mới"}
                </Button>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 mb-2">
                    <CloudRain className="h-4 w-4" /> Tổng quan thời tiết
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{aiResult.weatherSummary}</p>
                </div>
                
                <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 mb-2">
                    <AlertTriangle className="h-4 w-4" /> Lời khuyên cho bạn
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{aiResult.advice}</p>
                </div>
              </div>
              
              {aiResult.suggestions && aiResult.suggestions.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" /> Đề xuất tự động hóa
                  </h4>
                  <div className="space-y-3">
                    {aiResult.suggestions.map((sugg, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase", sugg.action === "on" ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-600 bg-slate-50")}>
                              {sugg.action === "on" ? "Bật" : "Tắt"} {sugg.device_name}
                            </Badge>
                            <span className="text-xs font-semibold text-slate-700">Lúc {sugg.time}</span>
                          </div>
                          <p className="text-xs text-slate-500">{sugg.reason}</p>
                        </div>
                        <Button onClick={() => applySuggestion(sugg)} className="shrink-0 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 h-8 text-xs cursor-pointer">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Áp dụng ngay
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
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
            <div className="text-xs font-semibold text-slate-900 leading-tight">{name}</div>
            <div className={cn("text-[10px] font-medium", state.on ? "text-emerald-600" : "text-slate-400")}>
              {state.on ? "BẬT" : "TẮT"}
            </div>
          </div>
          <Switch checked={state.on} onCheckedChange={onToggle} />
          <div className="w-full grid grid-cols-2 gap-1 rounded-lg bg-slate-100/80 p-0.5">
            {(["manual", "auto"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onMode(m)}
                className={cn(
                  "rounded-md py-1 text-[10px] font-medium transition-all",
                  state.mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
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
                <h4 className="text-sm font-semibold text-slate-900 leading-tight">{name}</h4>
                <span className={cn("text-[11px] font-medium leading-none mt-1 inline-block", state.on ? "text-emerald-600" : "text-slate-400")}>
                  {state.on ? "Đang bật" : "Đang tắt"}
                </span>
              </div>
            </div>
            <Switch checked={state.on} onCheckedChange={onToggle} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100/85 p-0.5 border border-slate-200/50">
            {(["manual", "auto"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onMode(m)}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer",
                  state.mode === m
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

// Cấu hình giá trị tối đa (ngưỡng max) của từng gauge cảm biến
const GAUGE_MAX = {
  temp: 50,    // Nhiệt độ tối đa (°C)
  humid: 100,  // Độ ẩm tối đa (%)
  light: 1000, // Ánh sáng tối đa (lx) - có thể tùy chỉnh hoặc dùng thresholds.light
};

interface SensorGaugeProps {
  value: string;
  rawValue: number;
  max: number;
  unit: string;
  colorKey: "temp" | "humid" | "light";
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
  const radius = 40;
  const strokeWidth = 7;
  const c = 2 * Math.PI * radius; // ~251.3

  // Vòng cung 270 độ
  const arcLength = 0.75 * c;

  useEffect(() => {
    // Animation khởi động giống táp-lô xe:
    // 1. Quét nhanh từ 0 lên 100% trong 450ms
    setTransitionStyle("stroke-dashoffset 450ms cubic-bezier(0.4, 0, 0.2, 1)");
    setAnimatedPercent(100);

    // 2. Quét nhanh từ 100% về 0% trong 450ms tiếp theo
    const t1 = setTimeout(() => {
      setAnimatedPercent(0);
    }, 450);

    // 3. Cho phép tracking theo giá trị thực tế sau 900ms
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
      // Transition mượt khi giá trị thay đổi realtime
      setTransitionStyle("stroke-dashoffset 500ms cubic-bezier(0.16, 1, 0.3, 1)");
      const targetPct = Math.min(Math.max((rawValue / max) * 100, 0), 100);
      setAnimatedPercent(targetPct);
    }
  }, [rawValue, max, isMounted]);

  const strokeDashoffset = arcLength - (animatedPercent / 100) * arcLength;
  const gradientId = `gauge-grad-${colorKey}`;

  return (
    <div className="relative flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 my-1">
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
        </defs>

        {/* Vòng nền xám nhạt */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${c}`}
          transform={`rotate(135 ${center} ${center})`}
          className="stroke-slate-100 dark:stroke-slate-800"
        />

        {/* Vòng fill theo phần trăm */}
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
      </svg>

      {/* Trị số đo và đơn vị ở chính giữa lòng đồng hồ */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl sm:text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 tabular-nums leading-none">
          {value}
        </span>
        <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase">
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
            const unit = isTemp ? "°C" : isHumid ? "%" : "lx";
            return (
              <div key={p.dataKey} className="flex items-center justify-between gap-4">
                <span className="font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.stroke }} />
                  {p.name}
                </span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {p.value !== null ? `${p.value} ${unit}` : "N/A"}
                </span>
              </div>
            );
          })}
        </div>
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
  thresholds,
}: {
  devices: Devices;
  onToggle: (key: "ac" | "fan" | "light", idden: number, on: boolean) => void;
  onMode: (key: "ac" | "fan" | "light", idden: number, mode: "auto" | "manual") => void;
  sensors: Sensors;
  sensorHistory: any[];
  alerts: Alert[];
  nodeName: string;
  thresholds?: Record<string, number>;
}) {
  const tempA = useAnimatedNumber(sensors.temp);
  const humidA = useAnimatedNumber(sensors.humid);
  const lightA = useAnimatedNumber(sensors.light);

  const formattedTrendData = useMemo(() => {
    return [...sensorHistory].reverse().map((row) => {
      const date = new Date(row.thoigian);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      const label = isNaN(date.getTime()) ? "" : `${hours}:${minutes}:${seconds}`;
      return {
        label,
        temp: row.nhietdo !== null ? Number(row.nhietdo) : null,
        humid: row.doam !== null ? Number(row.doam) : null,
        light: row.anhsang !== null ? Number(row.anhsang) : null,
      };
    });
  }, [sensorHistory]);

  const sensorCards = [
    {
      key: "temp",
      label: "Nhiệt độ",
      value: tempA.toFixed(1),
      rawValue: sensors.temp,
      max: GAUGE_MAX.temp,
      unit: "°C",
      icon: Thermometer,
      alert: sensors.temp >= (thresholds?.temp || 30),
      color: "from-rose-500 to-orange-400"
    },
    {
      key: "humid",
      label: "Độ ẩm",
      value: humidA.toFixed(0),
      rawValue: sensors.humid,
      max: GAUGE_MAX.humid,
      unit: "%",
      icon: Droplets,
      alert: sensors.humid >= (thresholds?.humid || 75),
      color: "from-sky-500 to-cyan-400"
    },
    {
      key: "light",
      label: "Ánh sáng",
      value: Math.round(lightA).toString(),
      rawValue: sensors.light,
      max: thresholds?.light || GAUGE_MAX.light,
      unit: "LX",
      icon: Sun,
      alert: sensors.light < (thresholds?.light || 200),
      color: "from-amber-400 to-yellow-300"
    },
  ];

  const latestAlert = alerts.find((a) => a.level === "error");

  return (
    <div className="space-y-6">
      {latestAlert && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-gradient-to-r from-rose-50 to-orange-50 p-4 text-rose-800 shadow-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 animate-pulse" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{latestAlert.title}</div>
            <div className="text-xs text-rose-700/80">{latestAlert.detail} · Hệ thống đã phản ứng tự động.</div>
          </div>
          <Button variant="ghost" size="sm" className="text-rose-700 hover:bg-rose-100">
            Bỏ qua
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        {sensorCards.map((s) => {
          const Icon = s.icon;
          return (
            <GlassCard key={s.key} className="relative p-3 sm:p-5 flex flex-col items-center justify-center">
              {/* Badge trạng thái ở góc trên bên phải */}
              <div className="absolute top-2.5 right-2.5 sm:top-4 sm:right-4">
                <Badge
                  className={cn(
                    "rounded-full border-transparent text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2.5 sm:py-0.5",
                    s.alert
                      ? "bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400",
                  )}
                >
                  <span className="inline sm:hidden">{s.alert ? "⚠ Vượt" : "✓ OK"}</span>
                  <span className="hidden sm:inline">{s.alert ? "Vượt ngưỡng" : "Bình thường"}</span>
                </Badge>
              </div>

              {/* Gauge speedometer ở chính giữa */}
              <div className="mt-4 sm:mt-6">
                <SensorGauge
                  value={s.value}
                  rawValue={s.rawValue}
                  max={s.max}
                  unit={s.unit}
                  colorKey={s.key as "temp" | "humid" | "light"}
                />
              </div>

              {/* Icon cảm biến tròn và nhãn ở đáy card */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                <div
                  className={cn(
                    "grid h-6 w-6 sm:h-8 sm:w-8 place-items-center rounded-full bg-gradient-to-br text-white shadow-sm",
                    s.color
                  )}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4.5 sm:h-4.5" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {s.label}
                </span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        <DeviceCard
          name="Điều hòa"
          icon={Wind}
          gradient="from-sky-500 to-indigo-500"
          glow="rgba(56,189,248,0.55)"
          state={devices.ac}
          onToggle={(on) => onToggle("ac", 1, on)}
          onMode={(mode) => onMode("ac", 1, mode)}
          acBreeze={devices.ac.on}
        />
        <DeviceCard
          name="Quạt"
          icon={Fan}
          gradient="from-emerald-500 to-teal-400"
          glow="rgba(16,185,129,0.5)"
          state={devices.fan}
          onToggle={(on) => onToggle("fan", 2, on)}
          onMode={(mode) => onMode("fan", 2, mode)}
          spinIcon={devices.fan.on}
        />
        <DeviceCard
          name="Đèn"
          icon={Lightbulb}
          gradient="from-amber-400 to-orange-400"
          glow="rgba(251,191,36,0.7)"
          state={devices.light}
          onToggle={(on) => onToggle("light", 3, on)}
          onMode={(mode) => onMode("light", 3, mode)}
          lightHalo={devices.light.on}
        />
      </div>

      {/* Redesigned 24h Trend Chart - Combined into 1 line chart */}
      <GlassCard className="p-5">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/50 dark:border-slate-800/50 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Báo cáo cảm biến & Xu hướng</h3>
            <p className="text-xs text-slate-500">Biểu đồ xu hướng thực tế cập nhật liên tục 20s</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LegendChip color="#ef4444" label={`Nhiệt độ: ${sensors.temp.toFixed(1)}°C`} />
            <LegendChip color="#0ea5e9" label={`Độ ẩm: ${sensors.humid.toFixed(0)}%`} />
            <LegendChip color="#f59e0b" label={`Ánh sáng: ${Math.round(sensors.light)} lx`} />
          </div>
        </div>

        {sensorHistory.length === 0 ? (
          <div className="h-72 w-full flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 animate-pulse">
            Đang tải biểu đồ xu hướng...
          </div>
        ) : (
          <div className="h-72 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedTrendData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                <defs>
                  <filter id="glow-temp" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glow-humid" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glow-light" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
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
                {/* Right YAxis for Light (0-1000) */}
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
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temp"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 1, stroke: "#fff", fill: "#ef4444" }}
                  filter="url(#glow-temp)"
                  name="Nhiệt độ"
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="humid"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 1, stroke: "#fff", fill: "#0ea5e9" }}
                  filter="url(#glow-humid)"
                  name="Độ ẩm"
                  connectNulls
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="light"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 1, stroke: "#fff", fill: "#f59e0b" }}
                  filter="url(#glow-light)"
                  name="Ánh sáng"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      <ForecastCard sensors={sensors} nodeName={nodeName} />
    </div>
  );
}
