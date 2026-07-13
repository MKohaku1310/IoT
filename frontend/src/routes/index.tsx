import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { initMqttClient, onMqttStatus } from "@/lib/mqttClient";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LandingPage } from "@/components/layout/LandingPage";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { DashboardTab } from "@/components/dashboard/DashboardTab";
import { SensorsTab } from "@/components/dashboard/SensorsTab";
import { ScheduleTab } from "@/components/dashboard/ScheduleTab";
import { ActivityTab } from "@/components/dashboard/ActivityTab";
import { NotificationsTab } from "@/components/dashboard/NotificationsTab";
import { HealthTab } from "@/components/dashboard/HealthTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import { TabKey } from "@/components/dashboard/types";
import { TABS, NODES } from "@/components/dashboard/constants";

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
  const navigate = useNavigate();
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
  const [readAlertIds, setReadAlertIds] = useState<number[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("sh-read-alerts");
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const saveReadAlertIds = (ids: number[]) => {
    setReadAlertIds(ids);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("sh-read-alerts", JSON.stringify(ids));
      } catch {}
    }
  };

  const markAsRead = (id: number) => {
    if (!readAlertIds.includes(id)) {
      saveReadAlertIds([...readAlertIds, id]);
    }
  };

  const markAllAsRead = (ids: number[]) => {
    const newRead = Array.from(new Set([...readAlertIds, ...ids]));
    saveReadAlertIds(newRead);
  };

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
  // Thời điểm nhận gói cảm biến cuối cùng cho từng Node
  const [lastLivingTime, setLastLivingTime] = useState<Date | null>(null);
  const [lastBedroomTime, setLastBedroomTime] = useState<Date | null>(null);
  const [lastKitchenTime, setLastKitchenTime] = useState<Date | null>(null);

  const nowTime = useNow(5000); // cập nhật mỗi 5 giây để tính trạng thái online
  const livingOnline = lastLivingTime ? (nowTime - lastLivingTime.getTime() < 30_000) : false;
  const bedroomOnline = lastBedroomTime ? (nowTime - lastBedroomTime.getTime() < 30_000) : false;
  const kitchenOnline = lastKitchenTime ? (nowTime - lastKitchenTime.getTime() < 30_000) : false;

  const lastSensorTime = useMemo(() => {
    if (nodeId === "living") return lastLivingTime;
    if (nodeId === "bedroom") return lastBedroomTime;
    if (nodeId === "kitchen") return lastKitchenTime;
    return null;
  }, [nodeId, lastLivingTime, lastBedroomTime, lastKitchenTime]);

  const [supabaseOnline, setSupabaseOnline] = useState(false);
  const [mqttOnline, setMqttOnline] = useState(false);
  // Trạng thái lỗi kết nối Supabase
  const [connectionError, setConnectionError] = useState<string | null>(null);
  // Cooldown cảnh báo: lưu timestamp lần cuối gửi cảnh báo cho từng loại sensor
  // Chỉ tạo cảnh báo mới sau ALERT_COOLDOWN_MS kể từ cảnh báo trước (mặc định 5 phút)
  const ALERT_COOLDOWN_MS = 5 * 60 * 1000;
  const alertCooldownRef = useRef<Record<string, number>>({ temp: 0, humid: 0, light: 0 });
  // Trạng thái cảnh báo của lần đọc trước: phát hiện sự kiện "vừa vượt ngưỡng"
  const prevAlertStateRef = useRef<Record<string, boolean>>({ temp: false, humid: false, light: false });

  // Refs to avoid stale closures inside supabase event callbacks
  const thresholdsRef = useRef(thresholds);
  const currentUserIdRef = useRef(currentUserId);
  const lastSensorIdRef = useRef<number | null>(null);

  useEffect(() => {
    thresholdsRef.current = thresholds;
  }, [thresholds]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Live sensor / db realtime sync
  useEffect(() => {
    let active = true;

    const refreshLatestData = async () => {
      if (!active) return;

      try {
        const [{ data: sensorRows, error: sensorError }, { data: devData, error: devError }, { data: ruleData, error: ruleError }] = await Promise.all([
          supabase.from("dulieucambien").select("*").order("thoigian", { ascending: false }).limit(50),
          supabase.from("den").select("*"),
          supabase.from("luat").select("*"),
        ]);

        if (sensorError) {
          console.error("Lỗi refresh cảm biến:", sensorError);
          return;
        }

        if (sensorRows && sensorRows.length > 0) {
          const latest = sensorRows[0];
          const latestId = Number(latest.iddl);
          if (latestId !== lastSensorIdRef.current) {
            const nextSensors = {
              temp: Number(latest.nhietdo),
              humid: Number(latest.doam),
              light: Number(latest.anhsang),
            };
            setSensors((prev) => {
              if (prev.temp === nextSensors.temp && prev.humid === nextSensors.humid && prev.light === nextSensors.light) {
                return prev;
              }
              return nextSensors;
            });
            setSensorHistory((prev) => {
              const hasSameId = prev.some((item) => Number(item.iddl) === latestId);
              if (hasSameId) return prev;
              return [latest, ...prev].slice(0, 40);
            });
            lastSensorIdRef.current = latestId;
          }

          // Cập nhật thoigian nhận gói tin gần nhất cho từng thiết bị
          const livingRecord = sensorRows.find(r => r.cambien === "ESP32-S3-Node-01" || r.cambien === "ESP32" || !r.cambien);
          const bedroomRecord = sensorRows.find(r => r.cambien === "ESP32-S3-Node-02");
          const kitchenRecord = sensorRows.find(r => r.cambien === "ESP32-C3-Kitchen");

          if (livingRecord) setLastLivingTime(new Date(livingRecord.thoigian));
          if (bedroomRecord) setLastBedroomTime(new Date(bedroomRecord.thoigian));
          if (kitchenRecord) setLastKitchenTime(new Date(kitchenRecord.thoigian));
        }

        if (!devError && devData) {
          setDevices((prev) => {
            const next = { ...prev };
            devData.forEach((d) => {
              const key = d.idden === 1 ? "ac" : d.idden === 2 ? "fan" : "light";
              next[key] = { ...next[key], on: d.trangthai === 1 };
            });
            return next;
          });
        }

        if (!ruleError && ruleData) {
          setDevices((prev) => {
            const next = { ...prev };
            ruleData.forEach((r) => {
              const key = r.idden === 1 ? "ac" : r.idden === 2 ? "fan" : "light";
              next[key] = { ...next[key], mode: r.automation ? "auto" : "manual" };
            });
            return next;
          });

          setThresholds((prev) => {
            const next = { ...prev };
            ruleData.forEach((r) => {
              const key = r.idden === 1 ? "temp" : r.idden === 2 ? "humid" : "light";
              next[key] = Number(r.nguong);
            });
            return next;
          });
        }
      } catch (err) {
        console.error("Lỗi khi refresh snapshot dữ liệu:", err);
      }
    };

    const loadInitial = async () => {
      try {
        const { data: devData, error: devError } = await supabase.from("den").select("*");
        if (devError) {
          console.error("Lỗi load bảng den:", devError);
          setConnectionError(`Không thể kết nối Supabase: ${devError.message}`);
          toast.error("Lỗi kết nối database", { description: devError.message });
        }
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

        const { data: ruleData, error: ruleError } = await supabase.from("luat").select("*");
        if (ruleError) {
          console.error("Lỗi load bảng luat:", ruleError);
          toast.error("Lỗi đọc cấu hình luật", { description: ruleError.message });
        }
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

        const { data: sensorData, error: sensorError } = await supabase
          .from("dulieucambien")
          .select("*")
          .order("thoigian", { ascending: false })
          .limit(40);
        if (sensorError) {
          console.error("Lỗi load dữ liệu cảm biến:", sensorError);
          toast.error("Lỗi đọc dữ liệu cảm biến", { description: sensorError.message });
        }
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
        } else {
          setCurrentUser(null);
          setCurrentUserId(null);
          navigate({ to: "/login" });
        }
        // Kết nối thành công → xóa lỗi
        if (!connectionError) setConnectionError(null);
      } catch (err) {
        console.error("Lỗi khi tải trạng thái ban đầu:", err);
        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        setConnectionError(`Không thể kết nối đến database: ${msg}`);
        toast.error("Lỗi kết nối", { description: msg });
      } finally {
        setSessionLoading(false);
      }
    };

    loadInitial();
    void refreshLatestData();

    const pollTimer = window.setInterval(() => {
      void refreshLatestData();
    }, 5000);

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
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel 'den' error");
          toast.error("Mất kết nối Realtime", { description: "Kênh thiết bị bị ngắt. Đang thử kết nối lại..." });
          void refreshLatestData();
        }
      });

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
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel 'luat' error");
          toast.error("Lỗi kênh tự động hóa", { description: "Không thể đồng bộ luật. Đang kết nối lại..." });
        }
      });

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
            setSensorHistory((prev) => [record, ...prev].slice(0, 40));
            
            const devName = record.cambien;
            const recordTime = new Date(record.thoigian || Date.now());
            if (devName === "ESP32-S3-Node-02") {
              setLastBedroomTime(recordTime);
            } else if (devName === "ESP32-C3-Kitchen") {
              setLastKitchenTime(recordTime);
            } else {
              setLastLivingTime(recordTime);
            }

            // ==========================================
            // Kiểm tra và tạo cảnh báo khi vượt ngưỡng
            // Điều kiện kép: chỉ tạo cảnh báo khi
            //   (A) Vừa mới vượt ngưỡng (edge: OFF→ON), HOẶC
            //   (B) Đã vượt ngưỡng liên tục nhưng đã qua ALERT_COOLDOWN_MS kể từ lần báo cuối
            // ==========================================
            const now = Date.now();
            const currentThresholds = thresholdsRef.current;
            const curState = {
              temp: temp >= (currentThresholds.temp || 30),
              humid: humid >= (currentThresholds.humid || 75),
              light: light < (currentThresholds.light || 200),
            };
            const prev = prevAlertStateRef.current;
            const cooldown = alertCooldownRef.current;

            const checks: Array<{ key: string; triggered: boolean; msg: string }> = [
              {
                key: "temp",
                triggered: curState.temp,
                msg: `Nhiệt độ ${temp}°C vượt ngưỡng ${currentThresholds.temp || 30}°C`,
              },
              {
                key: "humid",
                triggered: curState.humid,
                msg: `Độ ẩm ${humid}% vượt ngưỡng ${currentThresholds.humid || 75}%`,
              },
              {
                key: "light",
                triggered: curState.light,
                msg: `Ánh sáng ${light} lx dưới ngưỡng ${currentThresholds.light || 200} lx`,
              },
            ];

            const localAlerts: Alert[] = [];

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
                localAlerts.push({
                  id: Date.now() + Math.random(),
                  ts: Date.now(),
                  title: "Cảnh báo vượt ngưỡng",
                  detail: c.msg,
                  level: "warn",
                });
                cooldown[c.key] = now;
              }
              prev[c.key] = true;
            }

            // Thay vì ghi vào database (gây spam/lag khi mở nhiều tab), chỉ hiển thị thông báo trực tiếp trên UI
            if (localAlerts.length > 0) {
              setAlerts((prevAlerts) => {
                const nextAlerts = [...localAlerts, ...prevAlerts];
                return nextAlerts.slice(0, 15);
              });
              setBellPing(true);
              setTimeout(() => setBellPing(false), 2000);
              localAlerts.forEach((alert) => {
                toast(alert.title, {
                  description: alert.detail,
                  className: "!border-amber-200",
                });
              });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel 'dulieucambien' error");
          toast.error("Lỗi kết nối cảm biến", { description: "Mất kết nối nhận dữ liệu trực tiếp từ ESP32!" });
          void refreshLatestData();
        }
      });

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
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel 'nhatkyhoatdong' error");
        }
      });

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
        navigate({ to: "/login" });
      }
      setSessionLoading(false);
    });

    return () => {
      active = false;
      window.clearInterval(pollTimer);
      supabase.removeChannel(deviceChan);
      supabase.removeChannel(ruleChan);
      supabase.removeChannel(sensorChan);
      supabase.removeChannel(logChan);
      subscription.unsubscribe();
    };
  }, []);

  // Khởi tạo MQTT client và lắng nghe trạng thái kết nối
  useEffect(() => {
    void initMqttClient();
    const unsub = onMqttStatus((status) => {
      setMqttOnline(status === "online");
    });
    return () => unsub();
  }, []);

  // Kiểm tra kết nối Supabase định kỳ (mỗi 10 giây)
  useEffect(() => {
    let active = true;
    let timerId: any = null;

    async function checkSupabaseConnection() {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 6000)
      );
      try {
        const queryPromise = supabase.from("den").select("idden").limit(1);
        const result = await Promise.race([queryPromise, timeoutPromise]) as any;
        if (!active) return;

        if (result.error) {
          const err = result.error;
          if (err.message && (
            err.message.includes("FetchError") || 
            err.message.includes("Failed to fetch") || 
            err.message.includes("Network Error") ||
            err.status === 0
          )) {
            setSupabaseOnline(false);
          } else {
            setSupabaseOnline(true);
          }
        } else {
          setSupabaseOnline(true);
        }
      } catch (err) {
        if (active) {
          setSupabaseOnline(false);
        }
      }

      if (active) {
        timerId = setTimeout(checkSupabaseConnection, 10000);
      }
    }

    checkSupabaseConnection();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, []);

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

      {/* Connection Error Banner */}
      {connectionError && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 bg-rose-600 px-4 py-2.5 text-white text-sm font-medium shadow-lg">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="truncate">{connectionError}</span>
          <button
            onClick={() => { setConnectionError(null); window.location.reload(); }}
            className="ml-2 shrink-0 rounded bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className={cn("relative z-10 flex min-h-screen", connectionError && "pt-10")}>
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
          alertCount={alerts.filter((a) => !readAlertIds.includes(a.id)).length}
          livingOnline={livingOnline}
          bedroomOnline={bedroomOnline}
          kitchenOnline={kitchenOnline}
          supabaseOnline={supabaseOnline}
          mqttOnline={mqttOnline}
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
          alertCount={alerts.filter((a) => !readAlertIds.includes(a.id)).length}
          livingOnline={livingOnline}
          bedroomOnline={bedroomOnline}
          kitchenOnline={kitchenOnline}
          supabaseOnline={supabaseOnline}
          mqttOnline={mqttOnline}
          className="hidden lg:flex sticky top-0 h-screen"
        />

        <main className="flex-1 min-w-0 flex flex-col">
          <Header
            title={title}
            nodeName={node.name}
            alerts={alerts}
            readAlertIds={readAlertIds}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
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
            {tab === "notifications" && (
              <NotificationsTab
                readAlertIds={readAlertIds}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
              />
            )}
            {tab === "health" && (
              <HealthTab
                livingOnline={livingOnline}
                bedroomOnline={bedroomOnline}
                kitchenOnline={kitchenOnline}
                supabaseOnline={supabaseOnline}
                mqttOnline={mqttOnline}
              />
            )}
            {tab === "settings" && <SettingsTab />}
          </div>
        </main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        setTab={setTab}
        setNodeId={setNodeId}
        toggleDark={toggleDark}
      />
    </div>
  );
}
