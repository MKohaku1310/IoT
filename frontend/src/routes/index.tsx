import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  LineChart as LineChartIcon,
  History,
  Settings as SettingsIcon,
  Bell,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  Fan,
  Lightbulb,
  Cpu,
  CircleDot,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  Download,
  Filter,
  Moon,
  LogOut,
  UserCircle,
  ArrowRight,
  ShieldAlert,
  Menu,
  CalendarClock,
  HeartPulse,
  Search,
  Plus,
  Pencil,
  Trash2,
  Home,
  Sunrise,
  TrendingUp,
  Wifi,
  Database,
  Zap,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Bar,
  ComposedChart,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useAnimatedNumber,
  useRelativeTime,
  useTimeOfDay,
  useNow,
  useDarkMode,
} from "@/lib/smart-home";
import { ParticleCanvas, type ParticleMode } from "@/components/particle-canvas";
import { Sparkline } from "@/components/sparkline";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Home Control | Cổng IoT ESP32-S3" },
      {
        name: "description",
        content:
          "Bảng điều khiển giám sát và điều khiển Smart Home qua cổng IoT ESP32-S3: cảm biến realtime, thiết bị, lịch sử và cài đặt ngưỡng tự động.",
      },
      { property: "og:title", content: "Smart Home Control | ESP32-S3" },
      {
        property: "og:description",
        content: "Giám sát cảm biến và điều khiển thiết bị nhà thông minh theo thời gian thực.",
      },
    ],
  }),
  component: Dashboard,
});

type TabKey = "dashboard" | "sensors" | "activity" | "schedule" | "notifications" | "health" | "settings";

const TABS: { key: TabKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
  { key: "sensors", label: "Dữ liệu cảm biến", icon: LineChartIcon },
  { key: "schedule", label: "Lịch hẹn giờ", icon: CalendarClock },
  { key: "activity", label: "Lịch sử hoạt động", icon: History },
  { key: "notifications", label: "Thông báo", icon: Bell },
  { key: "health", label: "Trạng thái hệ thống", icon: HeartPulse },
  { key: "settings", label: "Cài đặt hệ thống", icon: SettingsIcon },
];

const NODES = [
  { id: "living", name: "Phòng khách", chip: "ESP32-S3-Node-01", icon: Home },
  { id: "bedroom", name: "Phòng ngủ", chip: "ESP32-S3-Node-02", icon: Moon },
  { id: "kitchen", name: "Nhà bếp", chip: "ESP32-C3-Kitchen", icon: Sunrise },
];


/* -------------------- History generators -------------------- */
function genSeries(base: number, amp: number, n: number, noise = 0.4) {
  return Array.from({ length: n }).map((_, i) => {
    const t = (i / n) * Math.PI * 2;
    return +(base + Math.sin(t) * amp + (Math.random() - 0.5) * amp * noise).toFixed(1);
  });
}
const HOURS_24 = Array.from({ length: 24 }).map((_, i) => `${String(i).padStart(2, "0")}:00`);
const TEMP_24 = genSeries(28, 4, 24);
const HUMID_24 = genSeries(62, 10, 24);
const LIGHT_24 = Array.from({ length: 24 }).map((_, i) => {
  const t = (i - 6) / 24;
  return Math.max(0, Math.round(600 * Math.sin(t * Math.PI) + (Math.random() - 0.5) * 80));
});

const DEVICES = ["ESP32-S3-Node-01", "ESP32-S3-Node-02", "ESP32-C3-Kitchen"] as const;

const SENSOR_HISTORY = Array.from({ length: 24 }).map((_, i) => ({
  id: i + 1,
  time: `2026-07-06 ${String(9 + Math.floor(i / 4)).padStart(2, "0")}:${String((i * 15) % 60).padStart(2, "0")}:12`,
  temp: (26 + Math.random() * 6).toFixed(1),
  humid: (55 + Math.random() * 20).toFixed(0),
  light: Math.round(150 + Math.random() * 750),
  device: DEVICES[i % DEVICES.length],
}));

/* -------------------- Root -------------------- */

type DeviceState = { on: boolean; mode: "auto" | "manual" };
type Devices = { ac: DeviceState; fan: DeviceState; light: DeviceState };
type Sensors = { temp: number; humid: number; light: number };
type Alert = { id: number; ts: number; title: string; detail: string; level: "error" | "warn" };

function Dashboard() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const title = TABS.find((t) => t.key === tab)!.label;
  const tod = useTimeOfDay();
  const { dark, toggle: toggleDark } = useDarkMode();
  const [nodeId, setNodeId] = useState<string>(NODES[0].id);
  const node = NODES.find((n) => n.id === nodeId)!;
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [devices, setDevices] = useState<Devices>({
    ac: { on: false, mode: "manual" },
    fan: { on: false, mode: "manual" },
    light: { on: false, mode: "manual" },
  });

  const [sensors, setSensors] = useState<Sensors>({ temp: 0, humid: 0, light: 0 });
  const [sensorHistory, setSensorHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [bellPing, setBellPing] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ hoten: string; email: string; idnguoidung?: number } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [thresholds, setThresholds] = useState<Record<string, number>>({
    temp: 30,
    humid: 75,
    light: 200,
  });
  // Thời điểm nhận gói cảm biến cuối cùng
  const [lastSensorTime, setLastSensorTime] = useState<Date | null>(null);
  // Trạng thái online/offline của thiết bị
  const [sensorOnline, setSensorOnline] = useState(false);
  // Cooldown cảnh báo: lưu timestamp lần cuối gửi cảnh báo cho từng loại sensor
  // Chỉ tạo cảnh báo mới sau ALERT_COOLDOWN_MS kể từ cảnh báo trước (mặc định 5 phút)
  const ALERT_COOLDOWN_MS = 5 * 60 * 1000;
  const alertCooldownRef = useRef<Record<string, number>>({ temp: 0, humid: 0, light: 0 });
  // Trạng thái cảnh báo của lần đọc trước: phát hiện sự kiện "vừa vượt ngưỡng"
  const prevAlertStateRef = useRef<Record<string, boolean>>({ temp: false, humid: false, light: false });

  // Live sensor / db realtime sync
  useEffect(() => {
    let active = true;

    const loadInitial = async () => {
      try {
        const { data: devData } = await supabase.from("den").select("*");
        if (devData) {
          setDevices((prev) => {
            const next = { ...prev };
            devData.forEach((d) => {
              const key = d.idden === 1 ? "ac" : d.idden === 2 ? "fan" : "light";
              next[key] = { ...next[key], on: d.trangthai === 1 };
            });
            return next;
          });
        }

        const { data: ruleData } = await supabase.from("luat").select("*");
        if (ruleData) {
          setDevices((prev) => {
            const next = { ...prev };
            ruleData.forEach((r) => {
              const key = r.idden === 1 ? "ac" : r.idden === 2 ? "fan" : "light";
              next[key] = { ...next[key], mode: r.automation ? "auto" : "manual" };
            });
            return next;
          });

          // Lưu ngưỡng từ db vào state
          setThresholds((prev) => {
            const next = { ...prev };
            ruleData.forEach((r) => {
              const key = r.idden === 1 ? "temp" : r.idden === 2 ? "humid" : "light";
              next[key] = Number(r.nguong);
            });
            return next;
          });
        }

        const { data: sensorData } = await supabase
          .from("dulieucambien")
          .select("*")
          .order("thoigian", { ascending: false })
          .limit(24);
        if (sensorData && sensorData.length > 0) {
          setSensorHistory(sensorData);
          setSensors({
            temp: Number(sensorData[0].nhietdo),
            humid: Number(sensorData[0].doam),
            light: Number(sensorData[0].anhsang),
          });
        }

        const { data: logData } = await supabase
          .from("nhatkyhoatdong")
          .select("*")
          .order("thoigian", { ascending: false })
          .limit(15);
        if (logData) {
          const alertLogs = logData.filter((l) =>
            l.hanhdong.includes("vượt ngưỡng") ||
            l.hanhdong.includes("Lỗi") ||
            l.hanhdong.includes("Cảnh báo") ||
            l.hanhdong.includes("Mất kết nối")
          );
          const mappedAlerts = alertLogs.map((l) => ({
            id: Number(l.idnhatky),
            ts: Date.parse(l.thoigian),
            title: l.hanhdong.includes("vượt ngưỡng") ? "Cảnh báo vượt ngưỡng" : l.hanhdong.includes("Lỗi") ? "Lỗi hệ thống" : "Thông báo cảnh báo",
            detail: l.hanhdong,
            level: l.hanhdong.includes("Lỗi") || l.hanhdong.includes("Mất kết nối") ? "error" : "warn",
          }));
          setAlerts(mappedAlerts as Alert[]);
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const authUser = session.user;
          const { data: profileData } = await supabase
            .from("nguoidung")
            .select("*")
            .eq("email", authUser.email)
            .maybeSingle();
          if (profileData) {
            setCurrentUser(profileData);
            setCurrentUserId(Number(profileData.idnguoidung) || null);
          } else {
            setCurrentUser({
              hoten: authUser.user_metadata?.full_name ||
                authUser.user_metadata?.name ||
                authUser.email?.split('@')[0] ||
                "Người dùng",
              email: authUser.email ?? ""
            });
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải trạng thái ban đầu:", err);
      } finally {
        setSessionLoading(false);
      }
    };

    loadInitial();

    const deviceChan = supabase
      .channel("db-device-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "den" },
        (payload) => {
          const record = payload.new;
          if (!record) return;
          const key = record.idden === 1 ? "ac" : record.idden === 2 ? "fan" : "light";
          const on = record.trangthai === 1;
          setDevices((prev) => {
            const next = { ...prev };
            next[key] = { ...next[key], on };
            return next;
          });
        }
      )
      .subscribe();

    const ruleChan = supabase
      .channel("db-luat-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "luat" },
        (payload) => {
          const record = payload.new as any;
          if (!record) return;
          const mode = record.automation ? "auto" : "manual";
          setDevices((prev) => {
            const next = { ...prev };
            if (record.idden === 1) next.ac = { ...next.ac, mode };
            if (record.idden === 2) next.fan = { ...next.fan, mode };
            if (record.idden === 3) next.light = { ...next.light, mode };
            return next;
          });

          // Đồng bộ ngưỡng thời gian thực
          const key = record.idden === 1 ? "temp" : record.idden === 2 ? "humid" : "light";
          setThresholds((prev) => ({
            ...prev,
            [key]: Number(record.nguong),
          }));
        }
      )
      .subscribe();

    const sensorChan = supabase
      .channel("db-sensor-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dulieucambien" },
        async (payload) => {
          const record = payload.new;
          if (record) {
            const temp = Number(record.nhietdo);
            const humid = Number(record.doam);
            const light = Number(record.anhsang);
            
            setSensors({
              temp,
              humid,
              light,
            });
            setSensorHistory((prev) => [record, ...prev].slice(0, 24));
            setLastSensorTime(new Date());
            setSensorOnline(true);

            // ==========================================
            // Kiểm tra và tạo cảnh báo khi vượt ngưỡng
            // Điều kiện kép: chỉ tạo cảnh báo khi
            //   (A) Vừa mới vượt ngưỡng (edge: OFF→ON), HOẶC
            //   (B) Đã vượt ngưỡng liên tục nhưng đã qua ALERT_COOLDOWN_MS kể từ lần báo cuối
            // ==========================================
            const now = Date.now();
            const curState = {
              temp: temp >= (thresholds.temp || 30),
              humid: humid >= (thresholds.humid || 75),
              light: light < (thresholds.light || 200),
            };
            const prev = prevAlertStateRef.current;
            const cooldown = alertCooldownRef.current;

            const checks: Array<{ key: string; triggered: boolean; msg: string }> = [
              {
                key: "temp",
                triggered: curState.temp,
                msg: `Cảnh báo vượt ngưỡng: Nhiệt độ ${temp}°C vượt ngưỡng ${thresholds.temp}°C`,
              },
              {
                key: "humid",
                triggered: curState.humid,
                msg: `Cảnh báo vượt ngưỡng: Độ ẩm ${humid}% vượt ngưỡng ${thresholds.humid}%`,
              },
              {
                key: "light",
                triggered: curState.light,
                msg: `Cảnh báo vượt ngưỡng: Ánh sáng ${light} lx dưới ngưỡng ${thresholds.light} lx`,
              },
            ];

            const alertsToCreate: { idnguoidung?: number; hanhdong: string }[] = [];

            for (const c of checks) {
              if (!c.triggered) {
                // Reset trạng thái khi về bình thường
                prev[c.key] = false;
                continue;
              }
              // Điều kiện A: vừa mới chuyển từ bình thường sang vượt ngưỡng (edge trigger)
              const isEdge = !prev[c.key];
              // Điều kiện B: đã qua thời gian cooldown
              const isCooldownOver = (now - (cooldown[c.key] || 0)) >= ALERT_COOLDOWN_MS;

              if (isEdge || isCooldownOver) {
                alertsToCreate.push({
                  ...(currentUserId ? { idnguoidung: currentUserId } : {}),
                  hanhdong: c.msg,
                });
                cooldown[c.key] = now;
              }
              prev[c.key] = true;
            }

            // Ghi cảnh báo vào database (chỉ khi thực sự cần)
            for (const alert of alertsToCreate) {
              try {
                await supabase.from("nhatkyhoatdong").insert([alert]);
              } catch (err) {
                console.error("Lỗi khi tạo cảnh báo:", err);
              }
            }
          }
        }
      )
      .subscribe();

    const logChan = supabase
      .channel("db-log-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nhatkyhoatdong" },
        (payload) => {
          const record = payload.new as any;
          if (record && (record.hanhdong.includes("vượt ngưỡng") || record.hanhdong.includes("Lỗi") || record.hanhdong.includes("Cảnh báo") || record.hanhdong.includes("Mất kết nối"))) {
            const newAlert = {
              id: Number(record.idnhatky),
              ts: Date.parse(record.thoigian),
              title: record.hanhdong.includes("vượt ngưỡng") ? "Cảnh báo vượt ngưỡng" : record.hanhdong.includes("Lỗi") ? "Lỗi hệ thống" : "Thông báo cảnh báo",
              detail: record.hanhdong,
              level: (record.hanhdong.includes("Lỗi") || record.hanhdong.includes("Mất kết nối") ? "error" : "warn") as "error" | "warn",
            };
            setAlerts((prev) => [newAlert, ...prev].slice(0, 8));
            setBellPing(true);
            setTimeout(() => setBellPing(false), 2000);
            toast(newAlert.title, {
              description: newAlert.detail,
              className: newAlert.level === "error" ? "!border-rose-200" : "!border-amber-200",
            });
          }
        }
      )
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSessionLoading(true);
      if (session?.user) {
        const authUser = session.user;
        const { data: profileData } = await supabase
          .from("nguoidung")
          .select("*")
          .eq("email", authUser.email)
          .maybeSingle();
        if (profileData) {
          setCurrentUser(profileData);
          setCurrentUserId(Number(profileData.idnguoidung) || null);
        } else {
          setCurrentUser({
            hoten: authUser.user_metadata?.full_name ||
              authUser.user_metadata?.name ||
              authUser.email?.split('@')[0] ||
              "Người dùng",
            email: authUser.email ?? ""
          });
          setCurrentUserId(null);
        }
      } else {
        setCurrentUser(null);
        setCurrentUserId(null);
      }
      setSessionLoading(false);
    });

    return () => {
      active = false;
      supabase.removeChannel(deviceChan);
      supabase.removeChannel(ruleChan);
      supabase.removeChannel(sensorChan);
      supabase.removeChannel(logChan);
      subscription.unsubscribe();
    };
  }, []);

  // Theo dõi timeout thiết bị: nếu 30 giây không có gói mới → Offline
  useEffect(() => {
    if (!lastSensorTime) return;
    setSensorOnline(true);
    const timer = setTimeout(() => {
      setSensorOnline(false);
    }, 30_000);
    return () => clearTimeout(timer);
  }, [lastSensorTime]);

  const handleDeviceToggle = async (key: "ac" | "fan" | "light", idden: number, on: boolean) => {
    const dev = devices[key];
    if (dev.mode === "auto") {
      toast.error("Thiết bị đang ở chế độ Tự động. Hãy tắt chế độ Tự động trước khi điều khiển thủ công!");
      return;
    }

    setDevices((prev) => ({
      ...prev,
      [key]: { ...prev[key], on },
    }));

    try {
      const { error } = await supabase
        .from("den")
        .update({ trangthai: on ? 1 : 0 })
        .eq("idden", idden);
      if (error) throw error;

      const deviceName = key === 'ac' ? 'Điều hòa' : key === 'fan' ? 'Quạt' : 'Đèn';
      await supabase.from("nhatkyhoatdong").insert([{
        idden: idden,
        hanhdong: `${on ? "Bật" : "Tắt"} ${deviceName} thủ công từ Web`
      }]);

      toast.success(`Đã gửi lệnh ${on ? "BẬT" : "TẮT"} ${deviceName}`);
    } catch (err) {
      setDevices((prev) => ({
        ...prev,
        [key]: { ...prev[key], on: !on },
      }));
      toast.error(`Lỗi điều khiển thiết bị: ${(err as any).message}`);
    }
  };

  const handleDeviceModeChange = async (key: "ac" | "fan" | "light", idden: number, mode: "auto" | "manual") => {
    const prevMode = devices[key].mode;

    setDevices((prev) => ({
      ...prev,
      [key]: { ...prev[key], mode },
    }));

    try {
      const isAuto = mode === "auto";
      const { error } = await supabase
        .from("luat")
        .update({ automation: isAuto })
        .eq("idden", idden);
      if (error) throw error;
      toast.success(`Đã chuyển ${key === 'ac' ? 'Điều hòa' : key === 'fan' ? 'Quạt' : 'Đèn'} sang chế độ ${isAuto ? 'Tự động' : 'Thủ công'}`);
    } catch (err) {
      setDevices((prev) => ({
        ...prev,
        [key]: { ...prev[key], mode: prevMode },
      }));
      toast.error(`Lỗi đổi chế độ: ${(err as any).message}`);
    }
  };

  // Cmd/Ctrl+K for palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const particleModes = useMemo(() => {
    const m = [];
    if (devices.ac.on) m.push("snow");
    if (devices.fan.on) m.push("wind");
    if (sensors.temp >= 30) m.push("shimmer");
    if (sensors.light < 200) m.push("stars");
    if (sensors.humid >= 75) m.push("mist");
    return m as ParticleMode[];
  }, [devices, sensors]);

  const ambient = useMemo(() => {
    if (sensors.light < 200) return "linear-gradient(180deg,rgba(15,23,42,0.35),rgba(15,23,42,0.1))";
    if (sensors.temp >= 30) return "linear-gradient(180deg,rgba(255,140,80,0.12),transparent)";
    if (devices.ac.on) return "linear-gradient(180deg,rgba(120,190,255,0.18),transparent)";
    return "transparent";
  }, [sensors, devices]);

  const bg = dark ? tod.darkGradient : tod.gradient;

  if (sessionLoading) {
    return (
      <div className={cn("min-h-screen grid place-items-center bg-[radial-gradient(1200px_600px_at_-10%_-10%,#dbe7ff_0%,transparent_60%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)]", dark && "bg-slate-950 text-slate-100")}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-sm font-medium text-slate-500">Đang kết nối cổng IoT...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LandingPage dark={dark} toggleDark={toggleDark} />;
  }

  return (
    <div
      className={cn(
        "relative min-h-screen transition-[background] duration-[1500ms]",
        dark ? "text-slate-100" : "text-slate-800",
      )}
      style={{ background: bg }}
    >
      <ParticleCanvas modes={particleModes} />
      <div className="pointer-events-none fixed inset-0 z-0 transition-[background] duration-1000" style={{ background: ambient }} />

      <div className="relative z-10 flex min-h-screen">
        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        {/* Mobile Sidebar Drawer */}
        <Sidebar
          tab={tab}
          setTab={setTab}
          todLabel={tod.label}
          node={node}
          setNodeId={setNodeId}
          dark={dark}
          alertCount={alerts.length}
          sensorOnline={sensorOnline}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          className={cn(
            "fixed inset-y-0 left-0 z-50 h-full border-r shadow-2xl transition-transform duration-300 transform lg:hidden",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
            dark ? "bg-slate-950 border-white/10" : "bg-white border-slate-200"
          )}
        />

        {/* Desktop Sidebar */}
        <Sidebar
          tab={tab}
          setTab={setTab}
          todLabel={tod.label}
          node={node}
          setNodeId={setNodeId}
          dark={dark}
          alertCount={alerts.length}
          sensorOnline={sensorOnline}
          className="hidden lg:flex sticky top-0 h-screen"
        />

        <main className="flex-1 min-w-0 flex flex-col">
          <Header
            title={title}
            nodeName={node.name}
            alerts={alerts}
            bellPing={bellPing}
            onOpen={() => setBellPing(false)}
            dark={dark}
            toggleDark={toggleDark}
            openPalette={() => setPaletteOpen(true)}
            currentUser={currentUser}
            onMenuClick={() => setMobileSidebarOpen(true)}
            lastSensorTime={lastSensorTime}
          />
          <div className="flex-1 p-3 sm:p-6 lg:p-8">
            {tab === "dashboard" && (
              <DashboardTab
                devices={devices}
                onToggle={handleDeviceToggle}
                onMode={handleDeviceModeChange}
                sensors={sensors}
                sensorHistory={sensorHistory}
                alerts={alerts}
                nodeName={node.name}
                thresholds={thresholds}
              />
            )}
            {tab === "sensors" && <SensorsTab />}
            {tab === "schedule" && <ScheduleTab />}
            {tab === "activity" && <ActivityTab />}
            {tab === "notifications" && <NotificationsTab />}
            {tab === "health" && <HealthTab />}
            {tab === "settings" && <SettingsTab />}
          </div>
        </main>
      </div>
    </div>
  );
}


/* -------------------- Sidebar -------------------- */
function Sidebar({
  tab,
  setTab,
  todLabel,
  node,
  setNodeId,
  dark,
  alertCount,
  className,
  onCloseMobile,
  sensorOnline,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  todLabel: string;
  node: (typeof NODES)[number];
  setNodeId: (id: string) => void;
  dark: boolean;
  alertCount: number;
  className?: string;
  onCloseMobile?: () => void;
  sensorOnline?: boolean;
}) {
  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col gap-3 p-4 border-r backdrop-blur-xl overflow-y-auto",
        dark ? "border-white/10 bg-slate-950/40" : "border-white/60 bg-white/60",
        className
      )}
    >
      <div className="flex items-center gap-3 px-2 pt-2">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-500/30">
          <Cpu className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className={cn("text-[11px] font-medium uppercase tracking-wider", dark ? "text-slate-400" : "text-slate-500")}>Cổng IoT</div>
          <div className={cn("truncate text-sm font-semibold", dark ? "text-white" : "text-slate-900")}>Node ESP32-S3</div>
        </div>
      </div>

      {/* Node/room selector */}
      <div className={cn("rounded-2xl border p-3", dark ? "border-white/10 bg-white/5" : "border-white/70 bg-white/70")}>
        <div className={cn("mb-2 text-[11px] font-semibold uppercase tracking-wider", dark ? "text-slate-400" : "text-slate-500")}>
          Node / Phòng
        </div>
        <Select value={node.id} onValueChange={setNodeId}>
          <SelectTrigger className={cn("h-10 text-sm", dark ? "bg-white/10 text-white border-white/10" : "bg-white/80")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NODES.map((n) => {
              const Ic = n.icon;
              return (
                <SelectItem key={n.id} value={n.id}>
                  <span className="inline-flex items-center gap-2">
                    <Ic className="h-3.5 w-3.5 text-indigo-500" />
                    {n.name}
                    <span className="text-[10px] text-slate-400">· {n.chip}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <nav className="flex flex-col gap-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          const showBadge = key === "notifications" && alertCount > 0;
          return (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                onCloseMobile?.();
              }}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30"
                  : dark
                    ? "text-slate-300 hover:bg-white/10 hover:text-white"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : dark ? "text-slate-400" : "text-slate-500")} />
              <span className="truncate flex-1">{label}</span>
              {showBadge && (
                <span className={cn(
                  "ml-auto grid min-w-5 h-5 place-items-center rounded-full px-1 text-[10px] font-bold",
                  active ? "bg-white/25 text-white" : "bg-rose-500 text-white"
                )}>
                  {alertCount > 99 ? "99+" : alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className={cn("rounded-2xl border p-3", dark ? "border-white/10 bg-white/5 text-slate-200" : "border-white/70 bg-gradient-to-br from-indigo-50/70 to-sky-50/70 text-slate-700")}>
        <div className="flex items-center gap-2 font-medium text-xs">
          <Moon className="h-3.5 w-3.5" /> {todLabel}
        </div>
        <div className={cn("mt-0.5 text-[10px]", dark ? "text-slate-400" : "text-slate-500")}>Giao diện theo giờ hệ thống</div>
      </div>

      <div className={cn("rounded-2xl border p-3 shadow-sm backdrop-blur", dark ? "border-white/10 bg-white/5" : "border-white/70 bg-white/70")}>
        <div className={cn("mb-3 text-[11px] font-semibold uppercase tracking-wider", dark ? "text-slate-400" : "text-slate-500")}>
          Trạng thái kết nối
        </div>
        <StatusRow label="Supabase" online />
        <StatusRow label="MQTT Broker" online />
        <StatusRow label={node.chip} online={!!sensorOnline} />
      </div>
    </aside>
  );
}


function StatusRow({ label, online }: { label: string; online: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
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

/* -------------------- Header -------------------- */
function Header({
  title,
  nodeName,
  alerts,
  bellPing,
  onOpen,
  dark,
  toggleDark,
  openPalette,
  currentUser,
  onMenuClick,
  lastSensorTime,
}: {
  title: string;
  nodeName: string;
  alerts: Alert[];
  bellPing: boolean;
  onOpen: () => void;
  dark: boolean;
  toggleDark: () => void;
  openPalette: () => void;
  currentUser: { hoten: string; email: string } | null;
  onMenuClick?: () => void;
  lastSensorTime?: Date | null;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center gap-3 border-b px-6 py-4 backdrop-blur-xl lg:px-8",
        dark ? "border-white/10 bg-slate-950/40" : "border-white/60 bg-white/60",
      )}
    >
      <button
        onClick={onMenuClick}
        aria-label="Mở menu"
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl border shadow-sm transition lg:hidden cursor-pointer",
          dark
            ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            : "border-white/70 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900",
        )}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className={cn("truncate text-lg font-semibold sm:text-xl", dark ? "text-white" : "text-slate-900")}>{title}</h1>
          <Badge className="hidden md:inline-flex rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
            <Home className="mr-1 h-3 w-3" /> {nodeName}
          </Badge>
        </div>
        <p className={cn("hidden text-xs sm:block", dark ? "text-slate-400" : "text-slate-500")}>
          {lastSensorTime
            ? `Cập nhật lần cuối: ${lastSensorTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
            : "Chưa nhận dữ liệu cảm biến"}
        </p>
      </div>

      {/* Search palette trigger */}
      <button
        onClick={openPalette}
        className={cn(
          "hidden md:inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm transition",
          dark
            ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            : "border-white/70 bg-white/80 text-slate-500 hover:bg-white",
        )}
      >
        <Search className="h-3.5 w-3.5" />
        <span>Tìm nhanh…</span>
        <kbd className={cn("ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-medium", dark ? "bg-white/10" : "bg-slate-100 text-slate-500")}>
          Ctrl K
        </kbd>
      </button>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        aria-label="Chuyển giao diện"
        className={cn(
          "grid h-10 w-10 place-items-center rounded-xl border shadow-sm transition",
          dark
            ? "border-white/10 bg-white/5 text-amber-300 hover:bg-white/10"
            : "border-white/70 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900",
        )}
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>


      <DropdownMenu onOpenChange={(o) => o && onOpen()}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "relative grid h-10 w-10 place-items-center rounded-xl border border-white/70 bg-white/80 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900",
              bellPing && "animate-[bell-shake_0.6s_ease-in-out]",
            )}
          >
            <Bell className="h-4 w-4" />
            {alerts.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {alerts.length}
                {bellPing && <span className="absolute inset-0 animate-ping rounded-full bg-rose-500 opacity-70" />}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>Cảnh báo gần đây</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {alerts.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-slate-500">Chưa có cảnh báo</div>
          )}
          {alerts.slice(0, 6).map((a) => (
            <AlertItem key={a.id} alert={a} />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {currentUser ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/80 py-1.5 pl-1.5 pr-3 shadow-sm transition hover:bg-white cursor-pointer">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-400 text-white">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden text-left sm:block">
                <div className="text-sm font-medium leading-tight text-slate-900">
                  {currentUser.hoten}
                </div>
                <div className="text-[11px] leading-tight text-slate-500">
                  {currentUser.email}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer">
                <UserCircle className="mr-2 h-4 w-4" /> Hồ sơ
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer">
                <SettingsIcon className="mr-2 h-4 w-4" /> Cài đặt tài khoản
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Đã đăng xuất thành công!");
              }}
              className="text-rose-600 focus:text-rose-600 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          asChild
          className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20 hover:opacity-90 cursor-pointer"
        >
          <Link to="/login">
            <User className="mr-2 h-4 w-4" /> Đăng nhập
          </Link>
        </Button>
      )}

      <style>{`
        @keyframes bell-shake {
          0%,100% { transform: rotate(0); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(12deg); }
          60% { transform: rotate(-8deg); }
          80% { transform: rotate(6deg); }
        }
        @keyframes breathing {
          0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.0), 0 10px 40px -20px rgba(30,41,59,0.25); }
          50% { box-shadow: 0 0 22px 4px var(--glow, rgba(99,102,241,0.35)), 0 10px 40px -20px rgba(30,41,59,0.25); }
        }
        @keyframes wind-sway {
          0%,100% { transform: translateX(0) rotate(-8deg); }
          25% { transform: translateX(3px) rotate(0deg); }
          50% { transform: translateX(0) rotate(8deg); }
          75% { transform: translateX(-3px) rotate(0deg); }
        }
      `}</style>
    </header>
  );
}

function LiveClock() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const now = useNow(1000);
  return (
    <span className="tabular-nums" suppressHydrationWarning>
      {mounted ? new Date(now).toLocaleTimeString("vi-VN") : "--:--:--"}
    </span>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const rel = useRelativeTime(alert.ts);
  return (
    <DropdownMenuItem className="flex flex-col items-start gap-0.5">
      <span className={cn("font-medium", alert.level === "error" ? "text-rose-600" : "text-amber-600")}>
        {alert.title}
      </span>
      <span className="text-xs text-slate-500">
        {rel} · {alert.detail}
      </span>
    </DropdownMenuItem>
  );
}

/* -------------------- Glass card -------------------- */
function GlassCard({
  className,
  children,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_10px_40px_-20px_rgba(30,41,59,0.25)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* -------------------- Dashboard Tab -------------------- */
function DashboardTab({
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

  const sensorCards = [
    { key: "temp", label: "Nhiệt độ", value: tempA.toFixed(1), unit: "°C", icon: Thermometer, alert: sensors.temp >= (thresholds?.temp || 30), color: "from-rose-500 to-orange-400" },
    { key: "humid", label: "Độ ẩm", value: humidA.toFixed(0), unit: "%", icon: Droplets, alert: sensors.humid >= (thresholds?.humid || 75), color: "from-sky-500 to-cyan-400" },
    { key: "light", label: "Ánh sáng", value: Math.round(lightA).toString(), unit: "lx", icon: Sun, alert: sensors.light < (thresholds?.light || 200), color: "from-amber-400 to-yellow-300" },
  ];

  const latestAlert = alerts.find((a) => a.level === "error");

  const chartData = useMemo(() => {
    if (sensorHistory.length === 0) {
      return HOURS_24.map((time, i) => ({
        time,
        temp: TEMP_24[i],
        humid: HUMID_24[i],
        light: LIGHT_24[i],
      }));
    }
    return [...sensorHistory].reverse().map((h) => {
      const t = new Date(h.thoigian);
      const timeLabel = t.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        time: timeLabel,
        temp: Number(h.nhietdo),
        humid: Number(h.doam),
        light: Number(h.anhsang),
      };
    });
  }, [sensorHistory]);

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
            <GlassCard key={s.key} className="p-3 sm:p-5">
              {/* Mobile: compact stacked layout */}
              <div className="flex flex-col gap-2 sm:hidden">
                <div className="flex items-center justify-between">
                  <div className={cn("grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", s.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-tight",
                    s.alert ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {s.alert ? "⚠ Vượt" : "✓ OK"}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">{s.label}</div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xl font-bold tracking-tight text-slate-900 tabular-nums">{s.value}</span>
                    <span className="text-xs font-medium text-slate-500">{s.unit}</span>
                  </div>
                </div>
              </div>
              {/* Desktop: original layout */}
              <div className="hidden sm:block">
                <div className="flex items-start justify-between">
                  <div className={cn("grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", s.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge
                    className={cn(
                      "rounded-full border-transparent text-xs font-medium",
                      s.alert
                        ? "bg-rose-100 text-rose-700 hover:bg-rose-100"
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                    )}
                  >
                    {s.alert ? "Vượt ngưỡng" : "Bình thường"}
                  </Badge>
                </div>
                <div className="mt-6">
                  <div className="text-sm text-slate-500">{s.label}</div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {s.value}
                    </span>
                    <span className="text-base font-medium text-slate-500">{s.unit}</span>
                  </div>
                </div>
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

      <GlassCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Biểu đồ cảm biến 24h</h3>
            <p className="text-xs text-slate-500">Nhiệt độ, độ ẩm và ánh sáng theo thời gian</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <LegendChip color="#ef4444" label="Nhiệt độ (°C)" />
            <LegendChip color="#0ea5e9" label="Độ ẩm (%)" />
            <LegendChip color="#f59e0b" label="Ánh sáng (lx)" />
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.7)",
                  background: "rgba(255,255,255,0.95)",
                  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)",
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Nhiệt độ" />
              <Line type="monotone" dataKey="humid" stroke="#0ea5e9" strokeWidth={2.5} dot={false} name="Độ ẩm" />
              <Line type="monotone" dataKey="light" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="Ánh sáng" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <ForecastCard sensors={sensors} nodeName={nodeName} />
    </div>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-slate-600 shadow-sm">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

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
                <div className="text-sm font-semibold text-slate-900">{name}</div>
                <div className={cn("mt-0.5 text-xs font-medium", state.on ? "text-emerald-600" : "text-slate-400")}>
                  {state.on ? "● Đang BẬT" : "○ Đang TẮT"}
                </div>
              </div>
            </div>
            <Switch checked={state.on} onCheckedChange={onToggle} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100/80 p-1">
            {(["manual", "auto"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onMode(m)}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-medium transition-all",
                  state.mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
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

/* -------------------- Sensors Tab -------------------- */
function SensorsTab() {
  const [range, setRange] = useState<"today" | "7d" | "30d">("today");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    fetchHistory();

    const channel = supabase
      .channel("sensors-tab-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dulieucambien" },
        (payload) => {
          setHistory((prev) => [payload.new, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [range]);

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

  const comboData = useMemo(() => {
    const items = [...history].slice(0, 24).reverse();
    return items.map((h) => {
      const t = new Date(h.thoigian);
      const label = range === "today"
        ? t.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
        : t.toLocaleDateString("vi-VN", { month: "numeric", day: "numeric" });
      return {
        label,
        temp: Number(h.nhietdo),
        humid: Number(h.doam),
        light: Number(h.anhsang),
      };
    });
  }, [history, range]);

  const filtered = useMemo(() => {
    const mapped = history.map((h) => ({
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
    const header = "\uFEFFSTT,Date,Time,Temp (C),Humidity (%),Light (lx),Device\n";
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
        dateStr = `${day}/${mo}/${y}`;
        timeStr = `${h}:${min}:${s}`;
      } else {
        dateStr = r.time;
        timeStr = "";
      }
      return `${r.id},${dateStr},${timeStr},${r.temp},${r.humid},${r.light},${r.device}`;
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
        <MiniChart title="Nhiệt độ 24h" data={sparkData.temp.length ? sparkData.temp : TEMP_24} color="#ef4444" unit="°C" stats={stats.temp} icon={Thermometer} />
        <MiniChart title="Độ ẩm 24h" data={sparkData.humid.length ? sparkData.humid : HUMID_24} color="#0ea5e9" unit="%" stats={stats.humid} icon={Droplets} />
        <MiniChart title="Ánh sáng 24h" data={sparkData.light.length ? sparkData.light : LIGHT_24} color="#f59e0b" unit="lx" stats={stats.light} icon={Sun} />
      </div>

      {/* Combo chart */}
      <GlassCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">So sánh xu hướng</h3>
            <p className="text-xs text-slate-500">Tổng hợp 3 cảm biến theo khoảng thời gian</p>
          </div>
          <div className="inline-flex rounded-xl bg-slate-100/80 p-1 text-xs">
            {(["today", "7d", "30d"]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r as "today" | "7d" | "30d")}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-medium transition",
                  range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                )}
              >
                {r === "today" ? "Hôm nay" : r === "7d" ? "7 ngày" : "30 ngày"}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="text-center py-12 text-sm text-slate-500">Đang tải biểu đồ cảm biến...</div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comboData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, background: "rgba(255,255,255,0.95)", border: "1px solid rgba(255,255,255,0.7)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="r" dataKey="light" fill="#f59e0b" opacity={0.35} name="Ánh sáng" radius={[4, 4, 0, 0]} />
                <Line yAxisId="l" type="monotone" dataKey="temp" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Nhiệt độ" />
                <Line yAxisId="l" type="monotone" dataKey="humid" stroke="#0ea5e9" strokeWidth={2.5} dot={false} name="Độ ẩm" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      <HeatmapCard />

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Lịch sử đo đạc</h3>
            <p className="text-xs text-slate-500">{filtered.length} bản ghi gần nhất</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="h-3.5 w-3.5" /> Thiết bị:
            </div>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="h-9 w-52 bg-white/80 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {DEVICES.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={exportCSV} className="bg-slate-900 text-white hover:bg-slate-800">
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
                  <td colSpan={6} className="text-center py-6 text-slate-500">Đang tải lịch sử...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500">Không có dữ liệu</td>
                </tr>
              ) : (
                paginatedData.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0 transition hover:bg-white/60">
                    <Td className="font-medium text-slate-500">{r.id}</Td>
                    <Td className="tabular-nums">{r.time}</Td>
                    <Td className="tabular-nums font-medium text-rose-600">{r.temp}</Td>
                    <Td className="tabular-nums font-medium text-sky-600">{r.humid}</Td>
                    <Td className="tabular-nums font-medium text-amber-600">{r.light}</Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        <CircleDot className="h-3 w-3 text-emerald-500" />
                        {r.device}
                      </span>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controller */}
        {totalPages > 1 && (
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
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5"
              >
                Trước
              </Button>
              <span className="font-medium text-slate-600">
                Trang {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5"
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}


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
          <div className="text-sm font-semibold text-slate-900">{title}</div>
        </div>
        <div className="text-xs text-slate-500">TB {stats.avg} {unit}</div>
      </div>
      <div className="mt-3 h-14 w-full">
        <Sparkline data={data} color={color} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
        <span>Min: <b className="text-slate-700">{stats.min}</b></span>
        <span>Max: <b className="text-slate-700">{stats.max}</b></span>
      </div>
    </GlassCard>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-5 py-3 text-left font-semibold">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3.5 text-slate-700", className)}>{children}</td>;
}

/* -------------------- Activity Tab -------------------- */
function getActMeta(type: string, detail: string, ok: boolean) {
  if (!ok) return { icon: AlertTriangle, gradient: "from-rose-500 to-pink-500", badge: "bg-rose-100 text-rose-700 border-rose-200", border: "border-l-rose-400", bg: "bg-rose-50/40" };
  if (type === "Cấu hình") return { icon: SettingsIcon, gradient: "from-violet-500 to-indigo-500", badge: "bg-violet-100 text-violet-700 border-violet-200", border: "border-l-violet-400", bg: "bg-violet-50/40" };
  if (detail.includes("Điều hòa")) return { icon: Wind, gradient: "from-sky-500 to-cyan-500", badge: "bg-sky-100 text-sky-700 border-sky-200", border: "border-l-sky-400", bg: "bg-sky-50/40" };
  if (detail.includes("Quạt")) return { icon: Fan, gradient: "from-teal-500 to-emerald-500", badge: "bg-teal-100 text-teal-700 border-teal-200", border: "border-l-teal-400", bg: "bg-teal-50/40" };
  if (detail.includes("Đèn")) return { icon: Lightbulb, gradient: "from-amber-500 to-yellow-400", badge: "bg-amber-100 text-amber-700 border-amber-200", border: "border-l-amber-400", bg: "bg-amber-50/40" };
  return { icon: CheckCircle2, gradient: "from-emerald-500 to-green-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", border: "border-l-emerald-400", bg: "bg-emerald-50/30" };
}

function ActivityTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("nhatkyhoatdong")
          .select("*")
          .order("thoigian", { ascending: false })
          .limit(50);
        if (data) setLogs(data);
      } catch (e) {
        console.error("Lỗi khi tải nhật ký hoạt động:", e);
      }
      setLoading(false);
    }
    fetchLogs();

    const channel = supabase
      .channel("activity-tab-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nhatkyhoatdong" },
        (payload) => {
          setLogs((prev) => [payload.new, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const mappedLogs = useMemo(() => {
    return logs.map((l) => {
      const hasWarning = l.hanhdong.includes("vượt ngưỡng") || l.hanhdong.includes("Lỗi") || l.hanhdong.includes("Mất kết nối");
      return {
        ts: Date.parse(l.thoigian),
        type: hasWarning ? "Cảnh báo" : l.hanhdong.includes("Cấu hình") || l.hanhdong.includes("Ngưỡng") ? "Cấu hình" : "Điều khiển",
        detail: l.hanhdong,
        by: l.idnguoidung ? "Admin" : "Hệ thống",
        ok: !hasWarning,
        isoTime: l.thoigian,
      };
    });
  }, [logs]);

  const filtered = useMemo(() => {
    return !search.trim()
      ? mappedLogs
      : mappedLogs.filter((m) =>
        m.detail.toLowerCase().includes(search.toLowerCase()) ||
        m.type.toLowerCase().includes(search.toLowerCase()) ||
        m.by.toLowerCase().includes(search.toLowerCase())
      );
  }, [mappedLogs, search]);

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const stats = useMemo(() => ({
    total: mappedLogs.length,
    ok: mappedLogs.filter((m) => m.ok).length,
    warn: mappedLogs.filter((m) => !m.ok).length,
    config: mappedLogs.filter((m) => m.type === "Cấu hình").length,
  }), [mappedLogs]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Tổng sự kiện", value: stats.total, color: "from-indigo-500 to-sky-500", icon: Clock },
          { label: "Thành công", value: stats.ok, color: "from-emerald-500 to-teal-500", icon: CheckCircle2 },
          { label: "Cảnh báo", value: stats.warn, color: "from-rose-500 to-pink-500", icon: AlertTriangle },
          { label: "Cấu hình", value: stats.config, color: "from-violet-500 to-indigo-500", icon: SettingsIcon },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/60 p-4 backdrop-blur-md shadow-sm">
              <div className={cn("absolute -right-3 -top-3 h-14 w-14 rounded-full bg-gradient-to-br opacity-10", s.color)} />
              <div className={cn("mb-2 inline-grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br text-white shadow", s.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Tìm kiếm sự kiện, thiết bị, loại..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white/70 backdrop-blur-sm border-white/60 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-300"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      <GlassCard>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Nhật ký hoạt động</h3>
            <p className="text-xs text-slate-500">
              Trang {page}/{totalPages} · {filtered.length} sự kiện
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium text-emerald-700">Live</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-slate-100" />
                  <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
            <History className="h-10 w-10 opacity-30" />
            <p className="text-sm">{search ? "Không tìm thấy kết quả phù hợp" : "Chưa có nhật ký hoạt động"}</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-5 bottom-5 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" />
            <ul className="space-y-3">
              {paginated.map((a, i) => (
                <ActivityRow key={i} a={a} isFirst={page === 1 && i === 0} />
              ))}
            </ul>

            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500 tabular-nums">
                  Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length} sự kiện
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const p = idx + 1;
                    const near = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
                    if (!near) {
                      if (p === 2 || p === totalPages - 1) return <span key={p} className="px-0.5 text-xs text-slate-400">…</span>;
                      return null;
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition",
                          p === page
                            ? "bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-200"
                            : "border border-white/60 bg-white/60 text-slate-600 hover:bg-white shadow-sm"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function ActivityRow({ a, isFirst }: { a: { ts: number; type: string; detail: string; by: string; ok: boolean }; isFirst: boolean }) {
  const rel = useRelativeTime(a.ts);
  const meta = getActMeta(a.type, a.detail, a.ok);
  const Icon = meta.icon;
  const timeStr = new Date(a.ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <li className={cn(
      "group relative flex items-start gap-4 rounded-2xl border-l-4 p-4 transition-all duration-200",
      "border border-white/60 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md hover:-translate-y-0.5",
      meta.border,
      meta.bg,
    )}>
      <div className={cn(
        "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md",
        meta.gradient,
      )}>
        <Icon className="h-5 w-5" />
        {isFirst && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-current" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-2">
          <span className="text-sm font-semibold text-slate-800 leading-snug">{a.detail}</span>
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide", meta.badge)}>
            {a.type}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="tabular-nums font-medium">{rel}</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {a.by}
          </span>
          <span className="ml-auto font-mono text-[10px] text-slate-400 tabular-nums">{timeStr}</span>
        </div>
      </div>

      <div className={cn(
        "shrink-0 self-center rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm",
        a.ok
          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-200"
          : "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-rose-200",
      )}>
        {a.ok ? "✓ Thành công" : "✗ Thất bại"}
      </div>
    </li>
  );
}


/* -------------------- Settings Tab -------------------- */
function SettingsTab() {
  const [temp, setTemp] = useState(30);
  const [humid, setHumid] = useState(70);
  const [light, setLight] = useState(350);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadThresholds() {
      try {
        const { data, error } = await supabase.from("luat").select("*");
        if (data) {
          data.forEach((r) => {
            if (r.loaicambien === "NhietDo") setTemp(Number(r.nguong));
            if (r.loaicambien === "DoAm") setHumid(Number(r.nguong));
            if (r.loaicambien === "AnhSang") setLight(Number(r.nguong));
          });
        }
      } catch (e) {
        console.error("Lỗi khi tải luật tự động hóa:", e);
      }
    }
    loadThresholds();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = [
        { loaicambien: "NhietDo", value: temp, idDen: 1 },
        { loaicambien: "DoAm", value: humid, idDen: 2 },
        { loaicambien: "AnhSang", value: light, idDen: 3 }
      ];

      for (const item of updateData) {
        const { error } = await supabase
          .from("luat")
          .update({ nguong: item.value })
          .eq("loaicambien", item.loaicambien);

        if (error) throw error;
      }

      await supabase.from("nhatkyhoatdong").insert([{
        hanhdong: `Cấu hình: Cập nhật ngưỡng tự động (Nhiệt độ ${temp}°C, Độ ẩm ${humid}%, Ánh sáng ${light} lx)`
      }]);

      toast.success("Đã lưu cấu hình ngưỡng tự động thành công!");
    } catch (e) {
      console.error("Lỗi khi lưu cấu hình:", e);
      toast.error("Lỗi khi lưu cấu hình!");
    }
    setSaving(false);
  };

  const items = [
    { label: "Ngưỡng nhiệt độ (Bật điều hòa khi vượt)", unit: "°C", min: 15, max: 40, value: temp, set: setTemp, color: "from-rose-500 to-orange-400", icon: Thermometer },
    { label: "Ngưỡng độ ẩm (Bật quạt khi vượt)", unit: "%", min: 30, max: 90, value: humid, set: setHumid, color: "from-sky-500 to-cyan-400", icon: Droplets },
    { label: "Ngưỡng ánh sáng (Bật đèn khi dưới)", unit: "lx", min: 50, max: 1000, value: light, set: setLight, color: "from-amber-400 to-yellow-300", icon: Sun },
  ];

  return (
    <div className="space-y-5">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <GlassCard key={it.label}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", it.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{it.label}</div>
                  <div className="text-xs text-slate-500">Phạm vi: {it.min} – {it.max} {it.unit}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={it.value}
                  min={it.min}
                  max={it.max}
                  onChange={(e) => it.set(Number(e.target.value))}
                  className="w-24 bg-white/80"
                />
                <span className="text-sm font-medium text-slate-600">{it.unit}</span>
              </div>
            </div>
            <div className="mt-5">
              <Slider value={[it.value]} min={it.min} max={it.max} step={1} onValueChange={(v) => it.set(v[0])} />
              <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                <span>{it.min} {it.unit}</span>
                <span>{it.max} {it.unit}</span>
              </div>
            </div>
          </GlassCard>
        );
      })}

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={saving}>Hủy</Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30 hover:opacity-90"
        >
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </div>
    </div>
  );
}


/* -------------------- Forecast Card -------------------- */
function ForecastCard({ sensors, nodeName }: { sensors: Sensors; nodeName: string }) {
  const hist = useRef<{ t: number; temp: number; humid: number }[]>([]);
  const [tick, setTick] = useState(0);
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

  return (
    <GlassCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-500" />
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Dự báo 1-2 giờ tới</h3>
            <p className="text-xs text-slate-500">Dựa trên xu hướng gần nhất tại {nodeName}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-rose-50 to-orange-50 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-rose-700">
            <Thermometer className="h-3.5 w-3.5" /> Nhiệt độ dự báo
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tabular-nums">{forecastTemp}</span>
            <span className="text-sm text-slate-600">°C</span>
          </div>
          <div className={cn("mt-1 text-xs font-medium", tT.color)}>{tT.arrow} Xu hướng {tT.label}</div>
        </div>
        <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-sky-50 to-cyan-50 p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-sky-700">
            <Droplets className="h-3.5 w-3.5" /> Độ ẩm dự báo
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
    </GlassCard>
  );
}

/* -------------------- Heatmap -------------------- */
const HEAT_METRICS = [
  { key: "temp", label: "Nhiệt độ", unit: "°C", base: 28, amp: 5, palette: ["#ecfeff", "#a5f3fc", "#67e8f9", "#facc15", "#fb923c", "#ef4444"] },
  { key: "humid", label: "Độ ẩm", unit: "%", base: 60, amp: 15, palette: ["#fef9c3", "#bbf7d0", "#a5f3fc", "#93c5fd", "#818cf8", "#4f46e5"] },
  { key: "light", label: "Ánh sáng", unit: "lx", base: 400, amp: 350, palette: ["#1e293b", "#334155", "#64748b", "#facc15", "#fde68a", "#fef3c7"] },
] as const;

function buildHeatmapData(metric: (typeof HEAT_METRICS)[number]) {
  const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  return days.map((d, di) => ({
    day: d,
    values: Array.from({ length: 24 }).map((_, h) => {
      const daynight = metric.key === "light" ? Math.max(0, Math.sin(((h - 6) / 24) * Math.PI)) : (Math.sin(((h - 4) / 24) * Math.PI * 2) + 1) / 2;
      const dayNoise = Math.sin(di * 0.7 + h * 0.3) * 0.2;
      const v = metric.base + metric.amp * (daynight + dayNoise);
      return +v.toFixed(1);
    }),
  }));
}

function HeatmapCard() {
  const [metricIdx, setMetricIdx] = useState(0);
  const metric = HEAT_METRICS[metricIdx];
  const data = useMemo(() => buildHeatmapData(metric), [metricIdx, metric]);
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
          <h3 className="text-base font-semibold text-slate-900">Bản đồ nhiệt theo giờ</h3>
          <p className="text-xs text-slate-500">Pattern trung bình 7 ngày qua · {metric.label} ({metric.unit})</p>
        </div>
        <div className="inline-flex rounded-xl bg-slate-100/80 p-1 text-xs">
          {HEAT_METRICS.map((m, i) => (
            <button
              key={m.key}
              onClick={() => setMetricIdx(i)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-medium transition",
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

/* -------------------- Schedule Tab -------------------- */
type ScheduleRule = {
  id: number;
  device: "ac" | "fan" | "light";
  action: "on" | "off";
  time: string;
  days: number[]; // 0-6
  enabled: boolean;
};

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const DEVICE_LABELS: Record<ScheduleRule["device"], { name: string; icon: typeof Wind }> = {
  ac: { name: "Điều hòa", icon: Wind },
  fan: { name: "Quạt", icon: Fan },
  light: { name: "Đèn", icon: Lightbulb },
};

function ScheduleTab() {
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({
    device: "light",
    action: "on",
    time: "20:00",
    days: [1, 2, 3, 4, 5],
    enabled: true,
  });
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lichhengio")
        .select("*")
        .order("idid", { ascending: true });
      if (data) {
        const mapped = data.map((item) => {
          let device = "light";
          if (item.idden === 1) device = "ac";
          if (item.idden === 2) device = "fan";
          if (item.idden === 3) device = "light";

          return {
            id: Number(item.idid),
            device: device as "ac" | "fan" | "light",
            action: item.hanhdong,
            time: item.thoigian.substring(0, 5),
            days: item.thu || [],
            enabled: item.kichhoat,
          };
        });
        setRules(mapped);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch hẹn từ database:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const saveSchedule = async () => {
    let idden = 3;
    if (draft.device === "ac") idden = 1;
    if (draft.device === "fan") idden = 2;

    try {
      if (editingRuleId !== null) {
        const { error } = await supabase
          .from("lichhengio")
          .update({
            idden,
            hanhdong: draft.action,
            thoigian: `${draft.time.length === 5 ? draft.time + ":00" : draft.time}`,
            thu: draft.days,
            kichhoat: draft.enabled,
          })
          .eq("idid", editingRuleId);

        if (error) throw error;

        toast.success(`Đã cập nhật lịch hẹn: ${DEVICE_LABELS[draft.device as keyof typeof DEVICE_LABELS].name} ${draft.action === "on" ? "BẬT" : "TẮT"} lúc ${draft.time}`);

        await supabase.from("nhatkyhoatdong").insert([{
          hanhdong: `Cấu hình: Cập nhật lịch hẹn giờ ID=${editingRuleId} cho ${DEVICE_LABELS[draft.device as keyof typeof DEVICE_LABELS].name} (${draft.action === "on" ? "BẬT" : "TẮT"} lúc ${draft.time})`
        }]);

        setEditingRuleId(null);
      } else {
        const { error } = await supabase
          .from("lichhengio")
          .insert([{
            idden,
            hanhdong: draft.action,
            thoigian: `${draft.time}:00`,
            thu: draft.days,
            kichhoat: draft.enabled,
          }]);

        if (error) throw error;

        toast.success(`Đã thêm lịch hẹn: ${DEVICE_LABELS[draft.device as keyof typeof DEVICE_LABELS].name} ${draft.action === "on" ? "BẬT" : "TẮT"} lúc ${draft.time}`);

        await supabase.from("nhatkyhoatdong").insert([{
          hanhdong: `Cấu hình: Thêm lịch hẹn giờ mới cho ${DEVICE_LABELS[draft.device as keyof typeof DEVICE_LABELS].name} (${draft.action === "on" ? "BẬT" : "TẮT"} lúc ${draft.time})`
        }]);
      }

      setDraft({
        device: "light",
        action: "on",
        time: "20:00",
        days: [1, 2, 3, 4, 5],
        enabled: true,
      });
      fetchSchedules();
    } catch (err) {
      toast.error("Lỗi khi lưu lịch hẹn: " + (err as any).message);
    }
  };

  const handleEdit = (rule: ScheduleRule) => {
    setEditingRuleId(rule.id);
    setDraft({
      device: rule.device,
      action: rule.action,
      time: rule.time,
      days: rule.days,
      enabled: rule.enabled,
    });
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setDraft({
      device: "light",
      action: "on",
      time: "20:00",
      days: [1, 2, 3, 4, 5],
      enabled: true,
    });
  };

  const remove = async (id: number) => {
    try {
      const { error } = await supabase
        .from("lichhengio")
        .delete()
        .eq("idid", id);
      if (error) throw error;
      toast.success("Đã xóa lịch hẹn thành công");
      if (editingRuleId === id) {
        handleCancelEdit();
      }
      fetchSchedules();
    } catch (err) {
      toast.error("Lỗi khi xóa lịch hẹn: " + (err as any).message);
    }
  };

  const handleToggleActive = async (id: number, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("lichhengio")
        .update({ kichhoat: enabled })
        .eq("idid", id);
      if (error) throw error;

      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled } : r))
      );
      toast.success(enabled ? "Đã kích hoạt lịch hẹn" : "Đã tạm dừng lịch hẹn");
    } catch (err) {
      toast.error("Lỗi thay đổi trạng thái: " + (err as any).message);
    }
  };

  const toggleDay = (d: number) =>
    setDraft((s) => ({ ...s, days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d].sort() }));

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-indigo-500" />
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {editingRuleId !== null ? "Chỉnh sửa lịch hẹn giờ" : "Thêm lịch hẹn giờ mới"}
            </h3>
            <p className="text-xs text-slate-500">
              {editingRuleId !== null ? "Thay đổi cấu hình lịch hẹn giờ của thiết bị và lưu lại" : "Tự động bật/tắt thiết bị theo giờ, độc lập với ngưỡng cảm biến"}
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">Thiết bị</div>
            <Select value={draft.device} onValueChange={(v) => setDraft((s) => ({ ...s, device: v }))}>
              <SelectTrigger className="bg-white/80"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(DEVICE_LABELS).map((k) => (
                  <SelectItem key={k} value={k}>{DEVICE_LABELS[k as keyof typeof DEVICE_LABELS].name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">Hành động</div>
            <Select value={draft.action} onValueChange={(v) => setDraft((s) => ({ ...s, action: v }))}>
              <SelectTrigger className="bg-white/80"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="on">Bật</SelectItem>
                <SelectItem value="off">Tắt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">Giờ</div>
            <Input type="time" value={draft.time} onChange={(e) => setDraft((s) => ({ ...s, time: e.target.value }))} className="bg-white/80" />
          </div>
          <div className="space-y-1.5 md:col-span-4 lg:col-span-1">
            <div className="text-xs font-medium text-slate-500">Ngày lặp lại</div>
            <div className="flex flex-wrap gap-1">
              {DAY_LABELS.map((d, i) => {
                const on = draft.days.includes(i);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg text-xs font-medium transition",
                      on ? "bg-indigo-500 text-white shadow-sm" : "bg-white/70 text-slate-500 hover:bg-white",
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          {editingRuleId !== null && (
            <Button variant="outline" onClick={handleCancelEdit}>
              Hủy sửa
            </Button>
          )}
          <Button onClick={saveSchedule} className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white hover:opacity-90">
            {editingRuleId !== null ? (
              "Cập nhật lịch"
            ) : (
              <>
                <Plus className="mr-1.5 h-4 w-4" /> Thêm lịch
              </>
            )}
          </Button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">Danh sách lịch đang cài đặt</h3>
          <p className="text-xs text-slate-500">{rules.filter((r) => r.enabled).length}/{rules.length} lịch đang hoạt động</p>
        </div>
        {loading ? (
          <div className="text-center py-6 text-sm text-slate-500">Đang tải lịch hẹn...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">Chưa cấu hình lịch hẹn nào</div>
        ) : (
          <ul className="space-y-2">
            {rules.map((r) => {
              const D = DEVICE_LABELS[r.device as keyof typeof DEVICE_LABELS];
              const Icon = D.icon;
              return (
                <li
                  key={r.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-2xl border p-4 transition",
                    r.id === editingRuleId
                      ? "border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20"
                      : "border-white/70 bg-white/60 hover:bg-white/80"
                  )}
                >
                  <div className={cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", r.action === "on" ? "from-emerald-500 to-teal-400" : "from-slate-500 to-slate-400")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-900">
                      {D.name} · <span className={r.action === "on" ? "text-emerald-600" : "text-slate-500"}>{r.action === "on" ? "BẬT" : "TẮT"}</span>
                      {r.id === editingRuleId && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                          Đang sửa
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {r.time}</span>
                      <span>·</span>
                      <span className="flex gap-1">
                        {DAY_LABELS.map((d, i) => (
                          <span key={d} className={cn("rounded px-1 py-0.5 text-[10px]", r.days.includes(i) ? "bg-indigo-100 text-indigo-700 font-medium" : "text-slate-300")}>
                            {d}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(v) => handleToggleActive(r.id, v)}
                  />
                  <button
                    onClick={() => handleEdit(r)}
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-lg transition",
                      r.id === editingRuleId
                        ? "text-indigo-600 bg-indigo-100"
                        : "text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                    )}
                    title="Chỉnh sửa"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    title="Xóa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}


/* -------------------- Notifications Tab -------------------- */
function NotificationsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "error" | "warn" | "info">("all");

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("nhatkyhoatdong")
          .select("*")
          .order("thoigian", { ascending: false })
          .limit(100);
        if (data) setLogs(data);
      } catch (e) {
        console.error("Lỗi tải thông báo:", e);
      }
      setLoading(false);
    }
    fetchAll();

    const chan = supabase
      .channel("notif-tab-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "nhatkyhoatdong" }, (payload) => {
        setLogs((prev) => [payload.new, ...prev].slice(0, 100));
      })
      .subscribe();

    return () => { supabase.removeChannel(chan); };
  }, []);

  const mapped = useMemo(() => logs.map((l) => {
    const isError = l.hanhdong.includes("Lỗi") || l.hanhdong.includes("Mất kết nối");
    const isWarn = l.hanhdong.includes("vượt ngưỡng") || l.hanhdong.includes("Cảnh báo");
    const level: "error" | "warn" | "info" = isError ? "error" : isWarn ? "warn" : "info";
    return { id: l.idnhatky, ts: Date.parse(l.thoigian), detail: l.hanhdong, level, isoTime: l.thoigian };
  }), [logs]);

  const filtered = useMemo(() => filter === "all" ? mapped : mapped.filter((n) => n.level === filter), [mapped, filter]);

  const counts = useMemo(() => ({
    all: mapped.length,
    error: mapped.filter((n) => n.level === "error").length,
    warn: mapped.filter((n) => n.level === "warn").length,
    info: mapped.filter((n) => n.level === "info").length,
  }), [mapped]);

  const FILTERS: { key: "all" | "error" | "warn" | "info"; label: string; color: string }[] = [
    { key: "all", label: "Tất cả", color: "from-indigo-500 to-sky-500" },
    { key: "error", label: "Lỗi", color: "from-rose-500 to-pink-500" },
    { key: "warn", label: "Cảnh báo", color: "from-amber-500 to-orange-400" },
    { key: "info", label: "Thông tin", color: "from-emerald-500 to-teal-400" },
  ];

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-4 text-left transition-all",
              filter === f.key
                ? "border-transparent ring-2 ring-indigo-400 shadow-lg bg-white"
                : "border-white/60 bg-white/60 backdrop-blur-md shadow-sm hover:bg-white/80"
            )}
          >
            <div className={cn("absolute -right-3 -top-3 h-14 w-14 rounded-full bg-gradient-to-br opacity-15", f.color)} />
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{counts[f.key]}</div>
            <div className="text-xs text-slate-500 mt-0.5">{f.label}</div>
          </button>
        ))}
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Trung tâm thông báo</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {filtered.length} thông báo · Cập nhật realtime
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium text-emerald-700">Live</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-px">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-slate-100" />
                  <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <Bell className="h-12 w-12 opacity-20" />
            <p className="text-sm">Không có thông báo nào</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100/80">
            {filtered.map((n) => (
              <NotifItem key={n.id} notif={n} />
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}

function NotifItem({ notif }: { notif: { id: any; ts: number; detail: string; level: "error" | "warn" | "info"; isoTime: string } }) {
  const rel = useRelativeTime(notif.ts);
  const timeStr = new Date(notif.ts).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const cfg = notif.level === "error"
    ? { icon: AlertTriangle, gradient: "from-rose-500 to-pink-500", badge: "bg-rose-100 text-rose-700", bg: "hover:bg-rose-50/30" }
    : notif.level === "warn"
    ? { icon: AlertTriangle, gradient: "from-amber-500 to-orange-400", badge: "bg-amber-100 text-amber-700", bg: "hover:bg-amber-50/30" }
    : { icon: CheckCircle2, gradient: "from-emerald-500 to-teal-400", badge: "bg-emerald-100 text-emerald-700", bg: "hover:bg-emerald-50/20" };

  const Icon = cfg.icon;

  return (
    <li className={cn("flex items-start gap-4 px-5 py-4 transition", cfg.bg)}>
      <div className={cn("mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", cfg.gradient)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 leading-snug">{notif.detail}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {rel}</span>
          <span>·</span>
          <span className="tabular-nums">{timeStr}</span>
          <span className={cn("ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold", cfg.badge)}>
            {notif.level === "error" ? "Lỗi" : notif.level === "warn" ? "Cảnh báo" : "Thông tin"}
          </span>
        </div>
      </div>
    </li>
  );
}


/* -------------------- Health Tab -------------------- */
function HealthTab() {

  const [uptime, setUptime] = useState(27 * 86400 + 3 * 3600 + 42 * 60);
  const [rssi, setRssi] = useState(-58);
  const [latency, setLatency] = useState(42);
  const [storage] = useState({ used: 218, total: 500 });

  useEffect(() => {
    const id = setInterval(() => {
      setUptime((u) => u + 1);
      setRssi((r) => Math.max(-85, Math.min(-40, r + (Math.random() - 0.5) * 3)));
      setLatency((l) => Math.max(15, Math.min(320, l + (Math.random() - 0.5) * 40)));
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const days = Math.floor(uptime / 86400);
  const hh = Math.floor((uptime % 86400) / 3600);
  const mm = Math.floor((uptime % 3600) / 60);
  const rssiPct = Math.max(0, Math.min(100, ((rssi + 90) / 50) * 100));
  const rssiLevel = rssi > -60 ? "Xuất sắc" : rssi > -70 ? "Tốt" : rssi > -80 ? "Trung bình" : "Yếu";
  const latencyLevel = latency < 100 ? { l: "Ổn định", c: "text-emerald-600", bg: "bg-emerald-100" } : latency < 200 ? { l: "Chậm nhẹ", c: "text-amber-600", bg: "bg-amber-100" } : { l: "Trễ cao", c: "text-rose-600", bg: "bg-rose-100" };
  const storagePct = (storage.used / storage.total) * 100;

  const latHist = useRef<{ t: number; latency: number }[]>([]);
  useEffect(() => {
    latHist.current.push({ t: Date.now(), latency });
    if (latHist.current.length > 30) latHist.current.shift();
  }, [latency]);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <HealthStat
          icon={Clock}
          label="Uptime ESP32"
          value={`${days}d ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`}
          hint="Kể từ lần khởi động cuối"
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
          <h3 className="text-base font-semibold text-slate-900">Độ trễ MQTT theo thời gian</h3>
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
          <h3 className="text-base font-semibold text-slate-900">Trạng thái dịch vụ</h3>
          <div className="mt-3 space-y-1">
            <StatusRow label="ESP32-S3 Node-01" online />
            <StatusRow label="ESP32-S3 Node-02" online />
            <StatusRow label="ESP32-C3 Kitchen" online={false} />
            <StatusRow label="MQTT Broker (HiveMQ)" online />
            <StatusRow label="Supabase Realtime" online />
            <StatusRow label="Edge Functions" online />
          </div>
        </GlassCard>
        <GlassCard>
          <h3 className="text-base font-semibold text-slate-900">Thông số phần cứng</h3>
          <div className="mt-3 space-y-2 text-sm">
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

function HealthStat({
  icon: Icon, label, value, hint, gradient, progress, badge,
}: {
  icon: typeof Wifi; label: string; value: string; hint: string; gradient: string; progress?: number;
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
      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</div>
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
      <span className="font-mono text-xs text-slate-700">{v}</span>
    </div>
  );
}

/* -------------------- Command Palette -------------------- */
function CommandPalette({
  open, onClose, setTab, setNodeId, toggleDark,
}: {
  open: boolean; onClose: () => void;
  setTab: (t: TabKey) => void;
  setNodeId: (id: string) => void;
  toggleDark: () => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo(
    () => [
      ...TABS.map((t) => ({ label: `Chuyển tab: ${t.label}`, group: "Điều hướng", icon: t.icon, run: () => setTab(t.key) })),
      ...NODES.map((n) => ({ label: `Chuyển Node: ${n.name} (${n.chip})`, group: "Node/Phòng", icon: n.icon, run: () => setNodeId(n.id) })),
      { label: "Bật/Tắt Dark Mode", group: "Giao diện", icon: Moon, run: () => toggleDark() },
      { label: "Xuất báo cáo cảm biến CSV", group: "Hành động", icon: Download, run: () => toast.success("Đã yêu cầu xuất CSV") },
      { label: "Reboot ESP32-S3", group: "Hành động", icon: Cpu, run: () => toast("Đang gửi lệnh reboot…", { description: "MQTT topic: node01/cmd/reboot" }) },
    ],
    [setTab, setNodeId, toggleDark],
  );
  const filtered = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 pt-24 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm thiết bị, cảm biến, log…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-slate-400">Không có kết quả cho "{q}"</li>
          )}
          {filtered.map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={i}>
                <button
                  onClick={() => {
                    it.run();
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  <Icon className="h-4 w-4 text-slate-500" />
                  <span className="flex-1">{it.label}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{it.group}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function LandingPage({ dark, toggleDark }: { dark: boolean; toggleDark: () => void }) {
  const bg = dark
    ? "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)"
    : "linear-gradient(135deg, #f6f7fb 0%, #eef1f8 100%)";

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-1000 flex flex-col justify-between p-6 md:p-10",
        dark ? "text-slate-100 bg-slate-950" : "text-slate-800 bg-slate-50"
      )}
      style={{ background: bg }}
    >
      {/* Header */}
      <header className="flex justify-between items-center max-w-7xl w-full mx-auto mb-10">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20">
            <Cpu className="h-5 w-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">Smart Home IoT</span>
        </div>
        <button
          onClick={toggleDark}
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl border shadow-sm transition cursor-pointer",
            dark
              ? "border-white/10 bg-white/5 text-amber-300 hover:bg-white/10"
              : "border-white/70 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900"
          )}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Main Hero Section */}
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center my-auto">
        <div className="space-y-6 text-left">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase",
            dark ? "bg-indigo-500/10 text-indigo-300" : "bg-indigo-50 text-indigo-600"
          )}>
            ● Giải pháp điều khiển thế hệ mới
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none">
            Giám sát & Điều khiển <br/>
            <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 bg-clip-text text-transparent">
              Smart Home IoT
            </span>
          </h1>
          <p className={cn("text-base md:text-lg max-w-lg", dark ? "text-slate-400" : "text-slate-600")}>
            Hệ thống quản lý nhà thông minh tối ưu sử dụng chip điều khiển ESP32-S3, truyền thông điệp thời gian thực MQTT và đồng bộ cơ sở dữ liệu Supabase.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Button asChild className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 h-11 px-6 rounded-2xl cursor-pointer">
              <Link to="/login">
                Đăng nhập hệ thống <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className={cn("h-11 px-6 rounded-2xl border-white/60 bg-white/40 backdrop-blur hover:bg-white/80 cursor-pointer", dark ? "text-white border-white/10 bg-white/5 hover:bg-white/10" : "text-slate-800")}>
              <Link to="/register">
                Tạo tài khoản mới
              </Link>
            </Button>
          </div>
        </div>

        {/* Feature Cards Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { title: "Giám sát Cảm biến", desc: "Đọc nhiệt độ, độ ẩm và cường độ ánh sáng thời gian thực.", icon: Thermometer, color: "text-rose-500 bg-rose-500/10" },
            { title: "Điều khiển Thiết bị", desc: "Bật/tắt Điều hòa, Quạt, Đèn ở 2 chế độ Tự động và Thủ công.", icon: Cpu, color: "text-indigo-500 bg-indigo-500/10" },
            { title: "Lịch trình Hẹn giờ", desc: "Cài đặt lịch bật/tắt thiết bị tự động theo giờ trong ngày.", icon: Clock, color: "text-emerald-500 bg-emerald-500/10" },
            { title: "Cảnh báo & Nhật ký", desc: "Ghi chép lịch sử vận hành, báo động ngay lập tức khi vượt ngưỡng.", icon: ShieldAlert, color: "text-amber-500 bg-amber-500/10" }
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className={cn(
                  "p-5 rounded-3xl border transition-all duration-300 hover:scale-[1.02]",
                  dark ? "border-white/10 bg-white/5" : "border-white/70 bg-white/60"
                )}
              >
                <div className={cn("grid h-10 w-10 place-items-center rounded-xl mb-3", f.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-sm mb-1">{f.title}</h3>
                <p className={cn("text-xs leading-relaxed", dark ? "text-slate-400" : "text-slate-500")}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto border-t border-slate-200/50 dark:border-white/10 pt-6 mt-10 text-center text-xs text-slate-500 dark:text-slate-400">
        © 2026 Smart Home IoT Project · Phát triển bởi <span className="font-semibold text-slate-700 dark:text-slate-200">Bùi Văn Sang</span>
      </footer>
    </div>
  );
}


