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
} from "@/hooks/use-smart-home";
import { ParticleCanvas, type ParticleMode } from "@/components/ui/particle-canvas";
import { Sparkline } from "@/components/ui/sparkline";
import { GlassCard } from "@/components/ui/glass-card";
import { initMqttClient, onMqttStatus, mqttPublish, getDeviceMqttTopic } from "@/lib/mqttClient";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LandingPage } from "@/components/layout/LandingPage";
import { CommandPalette } from "@/components/dashboard/shared/CommandPalette";
import { DashboardTab } from "@/components/dashboard/buyer/DashboardTab";
import { SensorsTab } from "@/components/dashboard/buyer/SensorsTab";
import { ScheduleTab } from "@/components/dashboard/buyer/ScheduleTab";
import { ActivityTab } from "@/components/dashboard/buyer/ActivityTab";
import { NotificationsTab } from "@/components/dashboard/buyer/NotificationsTab";
import { HealthTab } from "@/components/dashboard/admin/HealthTab";
import { SettingsTab } from "@/components/dashboard/shared/SettingsTab";
import { FleetTab } from "@/components/dashboard/admin/FleetTab";
import { AlertCenterTab } from "@/components/dashboard/admin/AlertCenterTab";
import { UserManagementTab } from "@/components/dashboard/admin/UserManagementTab";
import { AuditTrailTab } from "@/components/dashboard/admin/AuditTrailTab";
import { SupportTab } from "@/components/dashboard/admin/SupportTab";
import { SupportTab as BuyerSupportTab } from "@/components/dashboard/buyer/SupportTab";
import { FloatingAIAssistant } from "@/components/dashboard/shared/FloatingAIAssistant";
import { BusinessOperationsTab } from "@/components/dashboard/admin/BusinessOperationsTab";
import { TabKey } from "@/components/dashboard/shared/types";
import { BUYER_TABS, ADMIN_TABS, NODES } from "@/components/dashboard/shared/constants";
import { CustomTimeProvider } from "@/hooks/use-custom-time.tsx";
import { useNode } from "@/hooks/use-node-context";
import { AllDevicesProvider } from "@/hooks/use-all-devices";
import { HouseholdProvider } from "@/hooks/use-household";
import { HouseholdTab } from "@/components/dashboard/buyer/HouseholdTab";
import type { DeviceData } from "@/components/dashboard/shared/types";

function isRecordForNode(r: any, node: { id?: string; chip?: string }) {
  if (!node || !node.id) return true;
  const nid = node.id;
  const nchip = node.chip;
  if (r.cambien_idnode && r.cambien_idnode === nid) return true;
  if (r.cambien && (r.cambien === nid || (nchip && r.cambien === nchip))) return true;
  if (!r.cambien && !r.cambien_idnode) {
    return nid === "ESP32-S3-Node-01" || nid === "ESP32";
  }
  return false;
}

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
type Sensors = { temp: number | null; humid: number | null; light: number | null; gas?: number | null };
type Alert = { id: number; ts: number; title: string; detail: string; level: "error" | "warn" | "info" };

function Dashboard() {
  return <DashboardInner />;
}

function DashboardInner() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("dashboard");
  const tod = useTimeOfDay();
  const { dark, toggle: toggleDark } = useDarkMode();

  // Node state — bây giờ đọc từ NodeContext (persist vào localStorage tự động)
  const { currentNode, currentNodeId, setCurrentNodeId, nodesList, nodesLoading, refreshNodes } = useNode();
  // Backward compat aliases
  const nodeId = currentNodeId;
  const setNodeId = setCurrentNodeId;
  const node = currentNode;

  // Refs to avoid stale closures in callbacks
  const nodeRef = useRef(node);
  useEffect(() => { nodeRef.current = node; }, [node]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const [paletteOpen, setPaletteOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<{ hoten: string; email: string; idnguoidung?: number; vaitro?: string } | null>(null);
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  
  // Safe tab title lookup from both lists
  const currentTabs = currentUser?.vaitro === "admin" ? ADMIN_TABS : BUYER_TABS;
  const title = currentTabs.find((t) => t.key === tab)?.label || "Smart Home";

  // Redirect role-specific tabs
  useEffect(() => {
    if (currentUser) {
      if (currentUser.vaitro === "admin") {
        const adminKeys = ["fleet", "alerts", "users", "audit", "support", "business", "settings"];
        if (!adminKeys.includes(tab)) {
          setTab("fleet");
        }
      } else {
        const buyerKeys = ["dashboard", "sensors", "schedule", "activity", "notifications", "settings", "support", "household"];
        if (!buyerKeys.includes(tab)) {
          setTab("dashboard");
        }
      }
    }
  }, [currentUser, tab]);

  const [devices, setDevices] = useState<Devices>({
    ac: { on: false, mode: "manual" },
    fan: { on: false, mode: "manual" },
    light: { on: false, mode: "manual" },
  });

  // Thiết bị theo node hiện tại (từ bảng thietbi — nguồn chân lý UI)
  const [nodeDevices, setNodeDevices] = useState<DeviceData[]>([]);
  const [nodeDevicesLoading, setNodeDevicesLoading] = useState(false);

  const [sensors, setSensors] = useState<Sensors>({ temp: null, humid: null, light: null, gas: null });
  const [sensorHistory, setSensorHistory] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [readAlertIds, setReadAlertIds] = useState<number[]>([]);
  const readAlertIdsRef = useRef<number[]>([]);
  readAlertIdsRef.current = readAlertIds;

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const key = currentUser?.idnguoidung ? `sh-read-alerts-${currentUser.idnguoidung}` : "sh-read-alerts";
        const stored = window.localStorage.getItem(key);
        if (stored) {
          const parsed: number[] = JSON.parse(stored);
          setReadAlertIds((prev) => Array.from(new Set([...prev, ...parsed])));
        }
      } catch {}
    }
  }, [currentUser?.idnguoidung]);

  const saveReadAlertIds = (ids: number[]) => {
    setReadAlertIds(ids);
    if (typeof window !== "undefined") {
      try {
        const key = currentUser?.idnguoidung ? `sh-read-alerts-${currentUser.idnguoidung}` : "sh-read-alerts";
        window.localStorage.setItem(key, JSON.stringify(ids));
      } catch {}
    }
  };

  const markAsRead = (id: number) => {
    if (!readAlertIds.includes(id)) {
      saveReadAlertIds([...readAlertIds, id]);
      if (id < 1000000) {
        supabase.from("nhatkyhoatdong").update({ da_doc: true }).eq("idnhatky", id).then(({ error }) => {
          if (error) console.warn("Lỗi cập nhật trạng thái đã đọc:", error.message);
        });
      }
    }
  };

  const markAllAsRead = (ids: number[]) => {
    const newRead = Array.from(new Set([...readAlertIds, ...ids]));
    saveReadAlertIds(newRead);
    const dbIds = ids.filter((id) => id < 1000000);
    if (dbIds.length > 0) {
      supabase.from("nhatkyhoatdong").update({ da_doc: true }).in("idnhatky", dbIds).then(({ error }) => {
        if (error) console.warn("Lỗi cập nhật tất cả đã đọc:", error.message);
      });
    }
  };

  const [bellPing, setBellPing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
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
    return lastLivingTime;
  }, [lastLivingTime]);

  const [supabaseOnline, setSupabaseOnline] = useState(false);
  const [mqttOnline, setMqttOnline] = useState(false);
  // Trạng thái lỗi kết nối Supabase
  const [connectionError, setConnectionError] = useState<string | null>(null);
  // Cooldown cảnh báo: lưu timestamp lần cuối gửi cảnh báo cho từng loại sensor
  // Chỉ tạo cảnh báo mới sau ALERT_COOLDOWN_MS kể từ cảnh báo trước (mặc định 5 phút)
  const ALERT_COOLDOWN_MS = 5 * 60 * 1000;
  const alertCooldownRef = useRef<Record<string, number>>({ temp: 0, humid: 0, light: 0, gas: 0 });
  // Trạng thái cảnh báo của lần đọc trước: phát hiện sự kiện "vừa vượt ngưỡng"
  const prevAlertStateRef = useRef<Record<string, boolean>>({ temp: false, humid: false, light: false, gas: false });

  const fetchUserNodes = async (userId: number, role: string) => {
    await refreshNodes(userId, role);
  };

  // Fetch thiết bị theo node hiện tại từ bảng thietbi
  const fetchNodeDevices = async (currentNodeId: string) => {
    console.log("[fetchNodeDevices] Called with currentNodeId:", currentNodeId);
    if (!currentNodeId) {
      console.log("[fetchNodeDevices] No currentNodeId, clearing devices");
      setNodeDevices([]);
      return;
    }
    setNodeDevicesLoading(true);
    try {
      const { data, error } = await supabase
        .from("thietbi")
        .select("*")
        .eq("idnode", currentNodeId)
        .order("id_thietbi");
      console.log("[fetchNodeDevices] Query result:", { data, error });
      if (!error && data) {
        console.log("[fetchNodeDevices] Setting nodeDevices:", data);
        setNodeDevices(data as DeviceData[]);
      } else if (error) {
        console.error("[fetchNodeDevices] Database error:", error);
      }
    } catch (e) {
      console.error("Lỗi khi tải thiết bị node:", e);
    }
    setNodeDevicesLoading(false);
  };

  // Refs to avoid stale closures inside supabase event callbacks
  const thresholdsRef = useRef(thresholds);
  const currentUserIdRef = useRef(currentUserId);
  const lastSensorIdRef = useRef<number | null>(null);

  const refreshLatestData = async () => {
    if (!isMountedRef.current) return;

    try {
      const [{ data: sensorRows, error: sensorError }, { data: thietbiData, error: thietbiError }, { data: ruleData, error: ruleError }] = await Promise.all([
        supabase.from("dulieucambien").select("*").order("thoigian", { ascending: false }).limit(50),
        supabase.from("thietbi").select("*"),
        supabase.from("luat").select("*"),
      ]);

      if (sensorError) {
        console.error("Lỗi refresh cảm biến:", sensorError);
        return;
      }

      if (sensorRows && sensorRows.length > 0) {
        const currentNode = nodeRef.current;
        const nodeSpecificHistory = sensorRows.filter((r) => isRecordForNode(r, currentNode));

        if (nodeSpecificHistory.length > 0) {
          const latest = nodeSpecificHistory[0];
          const latestId = Number(latest.iddl);
          
          const nextSensors = {
            temp: Number(latest.nhietdo),
            humid: Number(latest.doam),
            light: Number(latest.anhsang),
            gas: latest.gas_ppm != null ? Number(latest.gas_ppm) : null,
          };
          setSensors(nextSensors);
          setSensorHistory(nodeSpecificHistory.slice(0, 40));
          lastSensorIdRef.current = latestId;
        } else {
          setSensors({ temp: 0, humid: 0, light: 0, gas: 0 });
          setSensorHistory([]);
        }

        // Cập nhật thoigian nhận gói tin gần nhất cho node hiện tại
        const nodeRecord = sensorRows.find((r) => isRecordForNode(r, currentNode));

        if (nodeRecord) setLastLivingTime(new Date(nodeRecord.thoigian));
      }

      const idToLoai = Object.fromEntries((thietbiData || []).map((t: any) => [t.id_thietbi, t.loai_thietbi]));

      if (!thietbiError && thietbiData) {
        setDevices((prev) => {
          const next = { ...prev };
          thietbiData.forEach((d) => {
            const key = d.loai_thietbi === "dieu_hoa" ? "ac" : d.loai_thietbi === "quat" ? "fan" : "light";
            next[key] = { ...next[key], on: d.trangthai === 1 };
          });
          return next;
        });
      }

      if (!ruleError && ruleData) {
        setDevices((prev) => {
          const next = { ...prev };
          ruleData.forEach((r: any) => {
            const loai = idToLoai[r.id_thietbi];
            const key = loai === "dieu_hoa" ? "ac" : loai === "quat" ? "fan" : "light";
            next[key] = { ...next[key], mode: r.automation ? "auto" : "manual" };
          });
          return next;
        });

        setThresholds((prev) => {
          const next = { ...prev };
          ruleData.forEach((r: any) => {
            const loai = idToLoai[r.id_thietbi];
            const key = loai === "dieu_hoa" ? "temp" : loai === "quat" ? "humid" : "light";
            next[key] = Number(r.nguong);
          });
          return next;
        });
      }
    } catch (err) {
      console.error("Lỗi khi refresh snapshot dữ liệu:", err);
    }
  };

  // Khi người dùng chuyển phòng, lập tức nạp dữ liệu cảm biến của phòng đó
  useEffect(() => {
    void refreshLatestData();
  }, [nodeId]);

  // Fetch danh sách thiết bị khi node thay đổi
  useEffect(() => {
    void fetchNodeDevices(nodeId);
  }, [nodeId]);

  useEffect(() => { thresholdsRef.current = thresholds; }, [thresholds]);

  // Ref đồng bộ danh sách thiết bị của node hiện tại (tránh stale closure trong sensorChan)
  const nodeDevicesRef = useRef<DeviceData[]>(nodeDevices);
  useEffect(() => { nodeDevicesRef.current = nodeDevices; }, [nodeDevices]);

  const nodeIdRef = useRef<string>(nodeId);
  useEffect(() => { nodeIdRef.current = nodeId; }, [nodeId]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Live sensor / db realtime sync
  useEffect(() => {
    let active = true;

    const loadInitial = async () => {
      try {
        const { data: thietbiData, error: thietbiError } = await supabase.from("thietbi").select("*");
        if (thietbiError) {
          console.error("Lỗi load bảng thietbi:", thietbiError);
          setConnectionError(`Không thể kết nối Supabase: ${thietbiError.message}`);
          toast.error("Lỗi kết nối database", { description: thietbiError.message });
        }
        const idToLoaiInit = Object.fromEntries((thietbiData || []).map((t: any) => [t.id_thietbi, t.loai_thietbi]));

        if (thietbiData) {
          setDevices((prev) => {
            const next = { ...prev };
            thietbiData.forEach((d) => {
              const key = d.loai_thietbi === "dieu_hoa" ? "ac" : d.loai_thietbi === "quat" ? "fan" : "light";
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
            ruleData.forEach((r: any) => {
              const loai = idToLoaiInit[r.id_thietbi];
              const key = loai === "dieu_hoa" ? "ac" : loai === "quat" ? "fan" : "light";
              next[key] = { ...next[key], mode: r.automation ? "auto" : "manual" };
            });
            return next;
          });

          // Lưu ngưỡng từ db vào state
          setThresholds((prev) => {
            const next = { ...prev };
            ruleData.forEach((r: any) => {
              const loai = idToLoaiInit[r.id_thietbi];
              const key = loai === "dieu_hoa" ? "temp" : loai === "quat" ? "humid" : "light";
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
          const currentNode = nodeRef.current;
          const nodeSpecificHistory = sensorData.filter((r) => isRecordForNode(r, currentNode));

          if (nodeSpecificHistory.length > 0) {
            setSensorHistory(nodeSpecificHistory);
            setSensors({
              temp: Number(nodeSpecificHistory[0].nhietdo),
              humid: Number(nodeSpecificHistory[0].doam),
              light: Number(nodeSpecificHistory[0].anhsang),
              gas: nodeSpecificHistory[0].gas_ppm != null ? Number(nodeSpecificHistory[0].gas_ppm) : null,
            });
          } else {
            setSensorHistory([]);
            setSensors({ temp: null, humid: null, light: null, gas: null });
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        let userProfile = null;
        if (session?.user) {
          const authUser = session.user;
          let { data: profileData } = await supabase
            .from("nguoidung")
            .select("*")
            .eq("auth_uid", authUser.id)
            .maybeSingle();

          if (!profileData && authUser.email) {
            const { data: byEmail } = await supabase
              .from("nguoidung")
              .select("*")
              .eq("email", authUser.email)
              .maybeSingle();
            if (byEmail) {
              profileData = byEmail;
            }
          }

          if (profileData) {
            if (!profileData.auth_uid || profileData.auth_uid !== authUser.id) {
              await supabase
                .from("nguoidung")
                .update({ auth_uid: authUser.id })
                .eq("idnguoidung", profileData.idnguoidung);
              profileData.auth_uid = authUser.id;
            }
            userProfile = profileData;
            setCurrentUser(profileData);
            setCurrentUserId(Number(profileData.idnguoidung) || null);
            await fetchUserNodes(Number(profileData.idnguoidung), profileData.vaitro || "buyer");
          } else {
            userProfile = {
              hoten: authUser.user_metadata?.full_name ||
                authUser.user_metadata?.name ||
                authUser.email?.split('@')[0] ||
                "Người dùng",
              email: authUser.email ?? "",
              vaitro: "buyer"
            };
            setCurrentUser(userProfile);
            setCurrentUserId(null);
            await fetchUserNodes(0, "buyer");
          }
        } else {
          setCurrentUser(null);
          setCurrentUserId(null);
        }

        // --- Load Notification Alerts based on role ---
        if (userProfile?.vaitro === "admin") {
          // Admin alerts: unresolved technical warnings + new support tickets
          const { data: techData } = await supabase
            .from("canh_bao_ky_thuat")
            .select("*")
            .eq("trang_thai", "unresolved")
            .neq("idnode", "SYSTEM_CONFIG")
            .order("thoigian", { ascending: false })
            .limit(10);
          
          const { data: ticketData } = await supabase
            .from("ho_tro_tickets")
            .select("*")
            .eq("trang_thai", "new")
            .order("thoigian", { ascending: false })
            .limit(10);

          const mappedAlerts: Alert[] = [];
          if (techData) {
            techData.forEach((t) => {
              mappedAlerts.push({
                id: 2000000 + Number(t.idcanhbao),
                ts: Date.parse(t.thoigian),
                title: "Sự cố kỹ thuật",
                detail: `Thiết bị ${t.idnode}: ${t.chi_tiet}`,
                level: t.muc_do === "critical" ? "error" : "warn",
              });
            });
          }
          if (ticketData) {
            ticketData.forEach((tk) => {
              mappedAlerts.push({
                id: 3000000 + Number(tk.idticket),
                ts: Date.parse(tk.thoigian),
                title: "Yêu cầu hỗ trợ",
                detail: `Tiêu đề: "${tk.tieu_de}" từ Buyer`,
                level: "warn",
              });
            });
          }
          setAlerts(mappedAlerts);
        } else if (userProfile?.vaitro === "buyer") {
          // Buyer alerts: nhatkyhoatdong filtered by user ownership and loai_thongbao
          const query = supabase
            .from("nhatkyhoatdong")
            .select("*")
            .order("thoigian", { ascending: false });

          if (userProfile && userProfile.idnguoidung) {
            query.or(`idnguoidung.is.null,idnguoidung.eq.${userProfile.idnguoidung}`);
          } else {
            query.is("idnguoidung", null);
          }

          // Filter to show system alerts and admin notifications (exclude user_to_admin and routine user_action)
          query.in("loai_thongbao", ["system_alert", "admin_notification"]);

          const { data: logData } = await query.limit(30);

          if (logData) {
            // Synchronize read status (da_doc) from database to readAlertIds state and localStorage
            const dbReadIds = logData.filter((l) => l.da_doc).map((l) => Number(l.idnhatky));
            if (dbReadIds.length > 0) {
              const storageKey = userProfile?.idnguoidung ? `sh-read-alerts-${userProfile.idnguoidung}` : "sh-read-alerts";
              let localStored: number[] = [];
              try {
                const s = window.localStorage.getItem(storageKey);
                if (s) localStored = JSON.parse(s);
              } catch {}
              const merged = Array.from(new Set([...localStored, ...dbReadIds]));
              setReadAlertIds(merged);
              try {
                window.localStorage.setItem(storageKey, JSON.stringify(merged));
              } catch {}
            }

            const alertLogs = logData.filter((l) => {
              if (l.hanhdong.includes("Ánh sáng") && l.hanhdong.includes("dưới ngưỡng")) return false;
              return (
                l.hanhdong.includes("vượt ngưỡng") ||
                l.hanhdong.includes("Lỗi") ||
                l.hanhdong.includes("Cảnh báo") ||
                l.hanhdong.includes("Mất kết nối") ||
                l.hanhdong.includes("[Hỗ trợ kỹ thuật]") ||
                l.hanhdong.includes("[Thông báo")
              );
            });
            const mappedAlerts = alertLogs.map((l) => {
              // Parse JSON to extract description if available
              let detail = l.hanhdong;
              try {
                const parsed = JSON.parse(l.hanhdong);
                detail = parsed.description || l.hanhdong;
              } catch {
                // Keep original if not valid JSON
              }
              
              const isError = l.hanhdong.includes("Lỗi") || l.hanhdong.includes("Mất kết nối") || l.hanhdong.includes("[Thông báo khẩn]");
              const isSupport = l.hanhdong.includes("[Hỗ trợ kỹ thuật]");
              const isBroadcast = l.hanhdong.includes("[Thông báo hệ thống]") || l.hanhdong.includes("[Cảnh báo hệ thống]");
              const isGuideline = l.hanhdong.includes("[Hướng dẫn sửa chữa]");
              
              return {
                id: Number(l.idnhatky),
                ts: Date.parse(l.thoigian),
                title: isGuideline
                  ? "Hướng dẫn sửa chữa"
                  : l.hanhdong.includes("vượt ngưỡng")
                  ? "Cảnh báo vượt ngưỡng"
                  : isError
                  ? "Lỗi hệ thống"
                  : isSupport
                  ? "Phản hồi hỗ trợ"
                  : isBroadcast
                  ? "Thông báo hệ thống"
                  : "Thông báo cảnh báo",
                detail: detail,
                level: (isError ? "error" : isSupport || isGuideline ? "info" : "warn") as "error" | "warn" | "info",
              };
            });
            setAlerts(mappedAlerts as Alert[]);
          }
        } else {
          setAlerts([]);
        }

        // Kết nối thành công → xóa lỗi cũ
        if (connectionError) setConnectionError(null);
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


    const ruleChan = supabase
      .channel("db-luat-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "luat" },
        async (payload) => {
          const record = payload.new as any;
          if (!record) return;
          const mode = record.automation ? "auto" : "manual";
          // Map id_thietbi → loai_thietbi for legacy devices state
          const { data: mapRow } = record.id_thietbi
            ? await supabase.from("thietbi").select("loai_thietbi").eq("id_thietbi", record.id_thietbi).maybeSingle()
            : { data: null };
          const loai = mapRow?.loai_thietbi;

          setDevices((prev) => {
            const next = { ...prev };
            if (loai === "dieu_hoa") next.ac = { ...next.ac, mode };
            if (loai === "quat") next.fan = { ...next.fan, mode };
            if (loai === "den") next.light = { ...next.light, mode };
            return next;
          });

          // Đồng bộ nodeDevices.tu_dong (nguồn chân lý UI node-aware)
          if (record.id_thietbi) {
            setNodeDevices((prev) =>
              prev.map((d) => d.id_thietbi === record.id_thietbi
                ? { ...d, tu_dong: !!record.automation }
                : d
              )
            );
          }

          // Đồng bộ ngưỡng thời gian thực
          const threshKey = loai === "dieu_hoa" ? "temp" : loai === "quat" ? "humid" : "light";
          setThresholds((prev) => ({
            ...prev,
            [threshKey]: Number(record.nguong),
          }));
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel 'luat' error");
          toast.error("Lỗi kênh tự động hóa", { description: "Không thể đồng bộ luật. Đang kết nối lại..." });
        } else if (status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("Realtime channel 'luat' disconnected, status:", status);
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
            
            const currentNode = nodeRef.current;
            const matchesCurrentNode = isRecordForNode(record, currentNode);

            if (matchesCurrentNode) {
              setSensors((prev) => ({
                temp: temp,
                humid: humid,
                light: light,
                // Giữ nguyên gas nếu bản ghi mới không có gas (gas chỉ đến từ node bếp)
                gas: record.gas_ppm != null ? Number(record.gas_ppm) : prev.gas,
              }));
              setSensorHistory((prev) => [record, ...prev].slice(0, 40));
            }
            
            const recordTime = new Date(record.thoigian || Date.now());
            setLastLivingTime(recordTime);

            // ==========================================
            // Kiểm tra và tạo cảnh báo khi vượt ngưỡng — dùng cau_hinh của từng thiết bị
            // ==========================================
            const now = Date.now();
            const nodeDevs = nodeDevicesRef.current;

            // Tìm thiết bị tương ứng trong node hiện tại
            const tempDev = nodeDevs.find((d) => d.loai_thietbi === "cam_bien_nhietdo") ?? nodeDevs.find((d) => d.loai_thietbi === "dieu_hoa");
            const humidDev = nodeDevs.find((d) => d.loai_thietbi === "cam_bien_doam") ?? nodeDevs.find((d) => d.loai_thietbi === "quat");
            const gasDev = nodeDevs.find((d) => d.loai_thietbi === "cam_bien_gas");

            // Đọc ngưỡng từ cau_hinh của thiết bị, fallback về giá trị mặc định
            const tempThresh = Number(tempDev?.cau_hinh?.threshold ?? 30);
            const humidThresh = Number(humidDev?.cau_hinh?.threshold ?? 75);
            const gasThresh = Number(gasDev?.cau_hinh?.threshold ?? 300);

            const gasVal = record.gas_ppm != null ? Number(record.gas_ppm) : undefined;

            const prev = prevAlertStateRef.current;
            const cooldown = alertCooldownRef.current;

            const checks: Array<{ key: string; triggered: boolean; msg: string }> = [
              ...(tempDev ? [{ key: "temp", triggered: temp >= tempThresh, msg: `Nhiệt độ ${temp}°C vượt ngưỡng ${tempThresh}°C` }] : []),
              ...(humidDev ? [{ key: "humid", triggered: humid >= humidThresh, msg: `Độ ẩm ${humid}% vượt ngưỡng ${humidThresh}%` }] : []),
              ...(gasDev && gasVal !== undefined ? [{ key: "gas", triggered: gasVal >= gasThresh, msg: `Khí gas ${gasVal} ppm vượt ngưỡng ${gasThresh} ppm` }] : []),
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

            // Ghi DB (chỉ dành cho Buyer/User, Admin không nhận cảnh báo cảm biến cá nhân)
            if (localAlerts.length > 0 && currentUserRef.current?.vaitro !== "admin") {
              localAlerts.forEach((alert) => {
                // Ghi vào DB theo định dạng Loại 2 — Thông báo hệ thống
                const currentNode = nodeRef.current;
                supabase.from("nhatkyhoatdong").insert([{
                  idnode: currentNode?.id || null,
                  idnguoidung: currentUserIdRef.current || null,
                  loai_thongbao: 'system_alert',
                  hanhdong: JSON.stringify({
                    loai_nhatky: "system_alert",
                    loai_thao_tac: "sensor_warning",
                    description: alert.detail,
                    node_id: currentNode?.id || "",
                    node_name: currentNode?.name || "",
                    timestamp: new Date().toISOString(),
                    detail_content: `Cảnh báo cảm biến tại ${currentNode?.name || "hệ thống"}: ${alert.detail}. Vui lòng kiểm tra và điều chỉnh thiết bị.`,
                  }),
                }]).then(({ error }) => {
                  if (error) console.warn("Lỗi ghi log cảnh báo:", error.message);
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
        } else if (status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("Realtime channel 'dulieucambien' disconnected, status:", status);
        }
      });

    const logChan = supabase
      .channel("db-log-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nhatkyhoatdong" },
        (payload) => {
          const record = payload.new as any;
          const user = currentUserRef.current;

          // Admin không nhận thông báo từ nhatkyhoatdong — Admin dùng canh_bao_ky_thuat và ho_tro_tickets
          if (!user || user.vaitro === "admin") return;

          // Bỏ qua tin nhắn do User gửi cho Admin (user_to_admin) và các thao tác nút bấm thông thường (user_action)
          if (record?.loai_thongbao === "user_to_admin" || record?.loai_thongbao === "user_action") return;

          // Chỉ xử lý các thông báo hướng tới User: system_alert hoặc admin_notification
          if (record?.loai_thongbao !== "system_alert" && record?.loai_thongbao !== "admin_notification") return;

          // Notify Buyer if broadcast (idnguoidung is null) OR explicitly sent to this buyer
          const isSystemBroadcast = record.idnguoidung === null;
          const isUserSpecific = Number(record.idnguoidung) === Number(user.idnguoidung);
          const isRelevant = isSystemBroadcast || isUserSpecific;

          if (isRelevant) {
            // Parse JSON to extract description if available
            let detail = record.hanhdong;
            try {
              const parsed = JSON.parse(record.hanhdong);
              detail = parsed.description || record.hanhdong;
            } catch {
              // Keep original if not valid JSON
            }
            
            const isError = record.hanhdong.includes("Lỗi") || record.hanhdong.includes("Mất kết nối") || record.hanhdong.includes("[Thông báo khẩn]");
            const isSupport = record.hanhdong.includes("[Hỗ trợ kỹ thuật]");
            const isBroadcast = record.hanhdong.includes("[Thông báo hệ thống]") || record.hanhdong.includes("[Cảnh báo hệ thống]");
            const isGuideline = record.hanhdong.includes("[Hướng dẫn sửa chữa]");
            
            const newAlert = {
              id: Number(record.idnhatky),
              ts: Date.parse(record.thoigian || new Date().toISOString()),
              title: isGuideline
                ? "Hướng dẫn sửa chữa"
                : record.hanhdong.includes("vượt ngưỡng")
                ? "Cảnh báo vượt ngưỡng"
                : isError
                ? "Lỗi hệ thống"
                : isSupport
                ? "Phản hồi hỗ trợ"
                : isBroadcast
                ? "Thông báo hệ thống"
                : "Thông báo cảnh báo",
              detail: detail,
              level: (isError ? "error" : isSupport || isGuideline ? "info" : "warn") as "error" | "warn" | "info",
            };
            setAlerts((prev) => [newAlert, ...prev].slice(0, 8));
            setBellPing(true);
            setTimeout(() => setBellPing(false), 2000);
            if (!readAlertIdsRef.current.includes(newAlert.id) && !record.da_doc) {
              toast(newAlert.title, {
                description: newAlert.detail,
                className: newAlert.level === "error" ? "!border-rose-200" : isSupport || isGuideline ? "!border-emerald-200" : "!border-amber-200",
              });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel 'nhatkyhoatdong' error");
        } else if (status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("Realtime channel 'nhatkyhoatdong' disconnected, status:", status);
        }
      });

    // Notify Admins about new technical warnings (canh_bao_ky_thuat)
    const techAlertChan = supabase
      .channel("tech-alerts-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "canh_bao_ky_thuat" },
        (payload) => {
          const user = currentUserRef.current;
          if (user?.vaitro === "admin") {
            const record = payload.new as any;
            if (record && record.idnode !== "SYSTEM_CONFIG") {
              const newAlert = {
                id: 2000000 + Number(record.idcanhbao || Date.now()),
                ts: Date.now(),
                title: "Sự cố kỹ thuật mới",
                detail: `Thiết bị ${record.idnode}: ${record.chi_tiet}`,
                level: (record.muc_do === "critical" ? "error" : "warn") as "error" | "warn",
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
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel 'tech-alerts-changes' error");
        } else if (status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("Realtime channel 'tech-alerts-changes' disconnected, status:", status);
        }
      });

    // Notify Admins about new support requests (ho_tro_tickets)
    const ticketChan = supabase
      .channel("tickets-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ho_tro_tickets" },
        (payload) => {
          const user = currentUserRef.current;
          if (user?.vaitro === "admin") {
            const record = payload.new as any;
            if (record) {
              const newAlert = {
                id: 3000000 + Number(record.idticket || Date.now()),
                ts: Date.now(),
                title: "Yêu cầu hỗ trợ mới",
                detail: `Tiêu đề: "${record.tieu_de}" từ Buyer`,
                level: "warn" as const,
              };
              setAlerts((prev) => [newAlert, ...prev].slice(0, 8));
              setBellPing(true);
              setTimeout(() => setBellPing(false), 2000);
              toast(newAlert.title, {
                description: newAlert.detail,
                className: "!border-amber-200",
              });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel 'tickets-changes' error");
        } else if (status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("Realtime channel 'tickets-changes' disconnected, status:", status);
        }
      });

    // Notify Admins about new remote access consent grants
    const consentChan = supabase
      .channel("consent-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "remote_access_consent" },
        (payload) => {
          const user = currentUserRef.current;
          if (user?.vaitro === "admin") {
            const record = payload.new as any;
            if (record && record.is_active) {
              const newAlert = {
                id: 4000000 + Number(record.id_consent || Date.now()),
                ts: Date.now(),
                title: "Cấp quyền Remote Access",
                detail: `Một Buyer vừa mở quyền chẩn đoán từ xa`,
                level: "info" as const,
              };
              setAlerts((prev) => [newAlert, ...prev].slice(0, 8));
              setBellPing(true);
              setTimeout(() => setBellPing(false), 2000);
              toast(newAlert.title, {
                description: newAlert.detail,
                className: "!border-emerald-200",
              });
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel 'consent-changes' error");
        } else if (status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("Realtime channel 'consent-changes' disconnected, status:", status);
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
      }
      setSessionLoading(false);
    });

    return () => {
      active = false;
      supabase.removeChannel(ruleChan);
      supabase.removeChannel(sensorChan);
      supabase.removeChannel(logChan);
      supabase.removeChannel(techAlertChan);
      supabase.removeChannel(ticketChan);
      supabase.removeChannel(consentChan);
      subscription.unsubscribe();
    };
  }, []);

  // Realtime subscription cho bảng thietbi (cập nhật nodeDevices và legacy devices state)
  useEffect(() => {
    const thietbiChan = supabase
      .channel("db-thietbi-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "thietbi" },
        (payload) => {
          const record = payload.new as DeviceData | undefined;
          const oldRecord = payload.old as Partial<DeviceData> | undefined;

          // Update legacy devices state (for backward compatibility)
          if (record && (payload.eventType === "INSERT" || payload.eventType === "UPDATE")) {
            const key = record.loai_thietbi === "dieu_hoa" ? "ac" : record.loai_thietbi === "quat" ? "fan" : "light";
            const on = record.trangthai === 1;
            setDevices((prev) => {
              const next = { ...prev };
              next[key] = { ...next[key], on };
              return next;
            });
          }

          // Update nodeDevices (nguồn chân lý UI node-aware)
          if (payload.eventType === "DELETE") {
            setNodeDevices((prev) => prev.filter((d) => d.id_thietbi !== (oldRecord as any)?.id_thietbi));
          } else if (record && (record.idnode === nodeIdRef.current || !record.idnode)) {
            setNodeDevices((prev) => {
              const idx = prev.findIndex((d) => d.id_thietbi === record.id_thietbi);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = record;
                return next;
              }
              return [...prev, record].sort((a, b) => a.id_thietbi - b.id_thietbi);
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel 'db-thietbi-changes' error");
          toast.error("Mất kết nối Realtime", { description: "Kênh thiết bị bị ngắt. Đang thử kết nối lại..." });
          void refreshLatestData();
        } else if (status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("Realtime channel 'db-thietbi-changes' disconnected, status:", status);
        }
      });

    return () => { supabase.removeChannel(thietbiChan); };
  }, [nodeId]);

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
        const queryPromise = supabase.from("thietbi").select("id_thietbi").limit(1);
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

  // Kiểm tra & đăng ký realtime Chế độ bảo trì hệ thống
  useEffect(() => {
    let active = true;

    async function checkMaintenanceMode() {
      try {
        const { data, error } = await supabase
          .from("esp32_nodes")
          .select("ota_status")
          .eq("idnode", "SYSTEM_CONFIG")
          .maybeSingle();
        if (!error && data && active) {
          setMaintenanceMode(data.ota_status === "maintenance");
        }
      } catch (err) {
        console.error("Lỗi khi kiểm tra chế độ bảo trì:", err);
      }
    }

    checkMaintenanceMode();

    const configChan = supabase
      .channel("system-maintenance-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "esp32_nodes" },
        (payload) => {
          const record = payload.new as any;
          if (record && record.idnode === "SYSTEM_CONFIG" && active) {
            setMaintenanceMode(record.ota_status === "maintenance");
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel 'system-maintenance-realtime' error");
        } else if (status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("Realtime channel 'system-maintenance-realtime' disconnected, status:", status);
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(configChan);
    };
  }, []);

  // Đăng ký realtime lắng nghe thay đổi danh sách Node (phê duyệt, sửa đổi)
  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel("nodes-list-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "esp32_nodes" },
        () => {
          if (active && currentUserRef.current) {
            void fetchUserNodes(
              Number(currentUserRef.current.idnguoidung || 0),
              currentUserRef.current.vaitro || "buyer"
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.error("Realtime channel 'nodes-list-realtime' error");
        } else if (status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("Realtime channel 'nodes-list-realtime' disconnected, status:", status);
        }
      });

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDeviceToggle = async (key: "ac" | "fan" | "light", _idden: number, on: boolean) => {
    if (maintenanceMode && currentUser?.vaitro !== "admin") {
      toast.error("Hệ thống đang bảo trì định kỳ, bạn tạm thời không thể điều khiển thiết bị lúc này!");
      return;
    }

    const dev = devices[key];
    const isAuto = dev.mode === "auto";

    setDevices((prev) => ({
      ...prev,
      [key]: { ...prev[key], mode: "manual", on },
    }));

    try {
      const keyToLoai = { ac: "dieu_hoa" as const, fan: "quat" as const, light: "den" as const };
      const loai = keyToLoai[key];
      const defaultNames = { ac: "Điều hòa", fan: "Quạt", light: "Đèn" };
      const nodeDevForKey = nodeDevices.find(d => d.loai_thietbi === loai);
      const deviceName = nodeDevForKey?.ten_hienthi || defaultNames[key];

      // Gửi lệnh MQTT trực tiếp từ Web sang broker (nếu đang auto thì tắt auto trước)
      const topics = getDeviceMqttTopic(loai, nodeId);
      if (topics) {
        if (isAuto) {
          mqttPublish(topics.auto, "OFF", 1).catch(() => {});
        }
        const payload = on ? "ON" : "OFF";
        mqttPublish(topics.ctrl, payload, 1).catch((err) => console.warn("[MQTT] Lỗi publish legacy toggle:", err));
      }

      if (nodeDevForKey) {
        // Update thietbi (nguồn chân lý mới)
        const updatePayload: Record<string, any> = { trangthai: on ? 1 : 0 };
        if (isAuto) updatePayload.tu_dong = false;

        const { error } = await supabase
          .from("thietbi")
          .update(updatePayload)
          .eq("id_thietbi", nodeDevForKey.id_thietbi);
        if (error) throw error;

        if (isAuto) {
          await supabase
            .from("luat")
            .update({ automation: false })
            .eq("id_thietbi", nodeDevForKey.id_thietbi);
        }

        // Update nodeDevices state
        setNodeDevices((prev) =>
          prev.map((d) => d.id_thietbi === nodeDevForKey.id_thietbi ? { ...d, tu_dong: false, trangthai: on ? 1 : 0 } : d)
        );
      }

      // Ghi log Activity History
      await supabase.from("nhatkyhoatdong").insert([{
        id_thietbi: nodeDevForKey?.id_thietbi ?? null,
        idnguoidung: currentUserId,
        ten_nguoi_thaotac: currentUser?.hoten || null,
        idnode: nodeId,
        loai_thongbao: 'user_action',
        hanhdong: JSON.stringify({
          loai_nhatky: "user_action",
          loai_thao_tac: "device_toggle",
          description: `${on ? "Bật" : "Tắt"} ${deviceName} thủ công từ Web${isAuto ? " (đã tự chuyển sang Thủ công)" : ""}`,
          device_name: deviceName,
          user_name: currentUser?.hoten || null,
          node_id: nodeId || "",
          node_name: nodeRef.current?.name || "",
          timestamp: new Date().toISOString(),
          meta_detail: { state: on ? "on" : "off", source: "web_legacy" },
        }),
      }]);

      toast.success(isAuto ? `Đã chuyển sang Thủ công & gửi lệnh ${on ? "BẬT" : "TẮT"} ${deviceName}` : `Đã gửi lệnh ${on ? "BẬT" : "TẮT"} ${deviceName}`);
    } catch (err) {
      setDevices((prev) => ({
        ...prev,
        [key]: { ...prev[key], mode: dev.mode, on: dev.on },
      }));
      toast.error(`Lỗi điều khiển thiết bị: ${(err as any).message}`);
    }
  };

  /**
   * Toggle thiết bị mới từ bảng thietbi (Dashboard node-aware)
   * Nguồn chân lý duy nhất: thietbi.trangthai (Realtime sẽ đồng bộ xuống ESP32).
   */
  const handleNodeDeviceToggle = async (device: DeviceData, on: boolean) => {
    if (maintenanceMode && currentUser?.vaitro !== "admin") {
      toast.error("Hệ thống đang bảo trì định kỳ, bạn tạm thời không thể điều khiển thiết bị lúc này!");
      return;
    }
    const isAuto = device.tu_dong;

    // Optimistic update ngay lập tức (chuyển tu_dong = false nếu đang auto)
    setNodeDevices((prev) =>
      prev.map((d) => d.id_thietbi === device.id_thietbi ? { ...d, tu_dong: false, trangthai: on ? 1 : 0 } : d)
    );

    const legacyKey = device.loai_thietbi === "dieu_hoa" ? "ac" : device.loai_thietbi === "quat" ? "fan" : device.loai_thietbi === "den" ? "light" : null;
    if (legacyKey) {
      setDevices((prev) => ({
        ...prev,
        [legacyKey]: { ...prev[legacyKey], mode: "manual", on },
      }));
    }

    const deviceName = device.ten_hienthi || device.loai_thietbi;

    try {
      // 1. Gửi lệnh MQTT trực tiếp từ Web sang broker (nếu đang auto thì gửi tắt auto trước)
      const targetNodeId = device.idnode || nodeId;
      const topics = getDeviceMqttTopic(device.loai_thietbi, targetNodeId);
      if (topics) {
        if (isAuto) {
          mqttPublish(topics.auto, "OFF", 1).catch(() => {});
        }
        const payloadStr = on ? "ON" : "OFF";
        mqttPublish(topics.ctrl, payloadStr, 1).catch((err) => console.warn("[MQTT] Lỗi publish node topic:", err));
      }

      // 2. Update thietbi (nguồn chân lý UI & lưu DB)
      const updateData: Record<string, any> = { trangthai: on ? 1 : 0 };
      if (isAuto) updateData.tu_dong = false;

      const { error: thietbiError } = await supabase
        .from("thietbi")
        .update(updateData)
        .eq("id_thietbi", device.id_thietbi);
      if (thietbiError) throw thietbiError;

      // 3. Ghi log Activity History — kèm tên người thực hiện
      await supabase.from("nhatkyhoatdong").insert([{
        id_thietbi: device.id_thietbi,
        idnguoidung: currentUserId,
        ten_nguoi_thaotac: currentUser?.hoten || null,
        idnode: nodeId,
        loai_thongbao: 'user_action',
        hanhdong: JSON.stringify({
          loai_nhatky: "user_action",
          loai_thao_tac: "device_toggle",
          description: `${on ? "Bật" : "Tắt"} ${deviceName} thủ công từ Web`,
          device_id: device.id_thietbi,
          device_name: deviceName,
          user_name: currentUser?.hoten || null,
          node_id: nodeId || "",
          node_name: nodeRef.current?.name || "",
          timestamp: new Date().toISOString(),
          meta_detail: { state: on ? "on" : "off", source: "web" },
        }),
      }]);

      toast.success(`Đã gửi lệnh ${on ? "BẬT" : "TẮT"} ${deviceName}`);
    } catch (err) {
      // Rollback optimistic update
      setNodeDevices((prev) =>
        prev.map((d) => d.id_thietbi === device.id_thietbi ? { ...d, trangthai: on ? 0 : 1 } : d)
      );
      toast.error(`Lỗi điều khiển thiết bị: ${(err as any).message}`);
    }
  };

  /**
   * Đổi chế độ auto/manual cho thiết bị mới từ bảng thietbi
   */
  const handleNodeDeviceModeChange = async (device: DeviceData, mode: "auto" | "manual") => {
    if (maintenanceMode && currentUser?.vaitro !== "admin") {
      toast.error("Hệ thống đang bảo trì định kỳ, bạn tạm thời không thể chuyển chế độ lúc này!");
      return;
    }
    const prevTuDong = device.tu_dong;
    const isAuto = mode === "auto";

    const relatedTypes =
      device.loai_thietbi === "cam_bien_nhietdo" || device.loai_thietbi === "dieu_hoa"
        ? ["cam_bien_nhietdo", "dieu_hoa"]
        : device.loai_thietbi === "cam_bien_doam" || device.loai_thietbi === "quat"
        ? ["cam_bien_doam", "quat"]
        : device.loai_thietbi === "cam_bien_anhsang" || device.loai_thietbi === "den"
        ? ["cam_bien_anhsang", "den"]
        : [device.loai_thietbi];

    const targetDevs = nodeDevices.filter((d) => (d.idnode || nodeId) === (device.idnode || nodeId) && relatedTypes.includes(d.loai_thietbi));
    const targetDevIds = targetDevs.map((d) => d.id_thietbi);
    if (!targetDevIds.includes(device.id_thietbi)) targetDevIds.push(device.id_thietbi);

    setNodeDevices((prev) =>
      prev.map((d) => targetDevIds.includes(d.id_thietbi) ? { ...d, tu_dong: isAuto } : d)
    );

    const legacyKey = device.loai_thietbi === "dieu_hoa" ? "ac" : device.loai_thietbi === "quat" ? "fan" : device.loai_thietbi === "den" ? "light" : null;
    if (legacyKey) {
      setDevices((prev) => ({
        ...prev,
        [legacyKey]: { ...prev[legacyKey], mode },
      }));
    }

    try {
      // Gửi lệnh MQTT auto mode trực tiếp
      const targetNodeId = device.idnode || nodeId;
      const topics = getDeviceMqttTopic(device.loai_thietbi, targetNodeId);
      if (topics) {
        const autoPayload = isAuto ? "ON" : "OFF";
        mqttPublish(topics.auto, autoPayload, 1).catch((err) => console.warn("[MQTT] Lỗi publish auto mode:", err));
      }

      const { error } = await supabase
        .from("thietbi")
        .update({ tu_dong: isAuto })
        .in("id_thietbi", targetDevIds);
      if (error) throw error;

      // Sync luat qua id_thietbi
      await supabase
        .from("luat")
        .update({ automation: isAuto })
        .in("id_thietbi", targetDevIds);

      toast.success(`Đã chuyển ${device.ten_hienthi || device.loai_thietbi} sang chế độ ${isAuto ? 'Tự động' : 'Thủ công'}`);
    } catch (err) {
      setNodeDevices((prev) =>
        prev.map((d) => targetDevIds.includes(d.id_thietbi) ? { ...d, tu_dong: prevTuDong } : d)
      );
      if (legacyKey) {
        setDevices((prev) => ({
          ...prev,
          [legacyKey]: { ...prev[legacyKey], mode: prevTuDong ? "auto" : "manual" },
        }));
      }
      toast.error(`Lỗi đổi chế độ: ${(err as any).message}`);
    }
  };

  const handleDeviceModeChange = async (key: "ac" | "fan" | "light", _idden: number, mode: "auto" | "manual") => {
    if (maintenanceMode && currentUser?.vaitro !== "admin") {
      toast.error("Hệ thống đang bảo trì định kỳ, bạn tạm thời không thể chuyển chế độ lúc này!");
      return;
    }
    const prevMode = devices[key].mode;
    const isAuto = mode === "auto";
    const keyToLoai = { ac: "dieu_hoa" as const, fan: "quat" as const, light: "den" as const };
    const loai = keyToLoai[key];
    const nodeDevForKey = nodeDevices.find(d => d.loai_thietbi === loai);

    setDevices((prev) => ({
      ...prev,
      [key]: { ...prev[key], mode },
    }));

    try {
      if (nodeDevForKey) {
        const targetNodeId = nodeDevForKey.idnode || nodeId;
        const topics = getDeviceMqttTopic(loai, targetNodeId);
        if (topics) {
          const autoPayload = isAuto ? "ON" : "OFF";
          mqttPublish(topics.auto, autoPayload, 1).catch((err) => console.warn("[MQTT] Lỗi publish auto mode:", err));
        }

        // Cập nhật luật tự động hóa bằng id_thietbi
        const { error } = await supabase
          .from("luat")
          .update({ automation: isAuto })
          .eq("id_thietbi", nodeDevForKey.id_thietbi);
        if (error) throw error;

        // Cập nhật thietbi.tu_dong
        const { error: thietbiErr } = await supabase
          .from("thietbi")
          .update({ tu_dong: isAuto })
          .eq("id_thietbi", nodeDevForKey.id_thietbi);
        if (thietbiErr) throw thietbiErr;

        // Cập nhật local state nodeDevices
        setNodeDevices((prev) =>
          prev.map((d) => d.id_thietbi === nodeDevForKey.id_thietbi ? { ...d, tu_dong: isAuto } : d)
        );
      }

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

  // Guard: non-admins cannot access health tab
  useEffect(() => {
    if (tab === "health" && currentUser?.vaitro !== "admin") {
      setTab("dashboard");
    }
  }, [tab, currentUser]);


  const particleModes = useMemo(() => {
    const m = [];
    if (devices.ac.on) m.push("snow");
    if (devices.fan.on) m.push("wind");
    if (sensors.temp != null && sensors.temp >= 30) m.push("shimmer");
    if ((sensors.light != null && sensors.light < 200) || tod.period === "night") m.push("stars");
    if (sensors.humid != null && sensors.humid >= 75) m.push("mist");
    return m as ParticleMode[];
  }, [devices, sensors, tod.period]);

  const ambient = useMemo(() => {
    if (dark && sensors.light != null && sensors.light < 200) return "linear-gradient(180deg,rgba(15,23,42,0.4),rgba(15,23,42,0.15))";
    if (sensors.temp != null && sensors.temp >= 30) return "linear-gradient(180deg,rgba(255,140,80,0.12),transparent)";
    if (devices.ac.on) return "linear-gradient(180deg,rgba(120,190,255,0.18),transparent)";
    return "transparent";
  }, [sensors, devices, dark]);

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

  if (!node) {
    return (
      <div className={cn("min-h-screen grid place-items-center", dark ? "bg-slate-950 text-slate-100" : "bg-[radial-gradient(1200px_600px_at_-10%_-10%,#dbe7ff_0%,transparent_60%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)]")}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-sm font-medium text-slate-500">Đang tải dữ liệu node...</span>
        </div>
      </div>
    );
  }

  return (
    <AllDevicesProvider currentUser={currentUser}>
    <HouseholdProvider currentUser={currentUser}>
      <div
        className={cn(
          "relative min-h-screen transition-[background] duration-[1500ms]",
          (dark || tod.period === "night" || tod.period === "evening") && "is-dark-bg text-slate-100",
          !dark && tod.period !== "night" && tod.period !== "evening" && "text-slate-800",
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

      {/* Maintenance Mode Banner for Buyers */}
      {maintenanceMode && currentUser?.vaitro !== "admin" && (
        <div className="fixed top-0 left-0 right-0 z-[99] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-white text-xs font-semibold shadow-md animate-pulse">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Hệ thống đang bảo trì định kỳ. Các chức năng điều khiển thiết bị tạm thời bị vô hiệu hóa!</span>
        </div>
      )}

      <div className={cn("relative z-10 flex min-h-screen", (connectionError || (maintenanceMode && currentUser?.vaitro !== "admin")) && "pt-10")}>
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
          currentUserRole={currentUser?.vaitro}
          nodesList={nodesList}
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
          currentUserRole={currentUser?.vaitro}
          nodesList={nodesList}
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
            currentUserRole={currentUser?.vaitro}
            supabaseOnline={supabaseOnline}
            mqttOnline={mqttOnline}
            onNavigateToNotifications={() => setTab(currentUser?.vaitro === "admin" ? "alerts" : "notifications")}
          />
          <div className="flex-1 p-2 sm:p-4 md:p-6 lg:p-8">
            {tab === "dashboard" && (
              <DashboardTab
                devices={devices}
                onToggle={handleDeviceToggle}
                onMode={handleDeviceModeChange}
                sensors={sensors}
                sensorHistory={sensorHistory}
                alerts={alerts}
                nodeName={node.name}
                nodeId={nodeId}
                thresholds={thresholds}
                currentUserRole={currentUser?.vaitro}
                livingOnline={livingOnline}
                bedroomOnline={bedroomOnline}
                kitchenOnline={kitchenOnline}
                supabaseOnline={supabaseOnline}
                mqttOnline={mqttOnline}
                nodeDevices={nodeDevices}
                nodeDevicesLoading={nodeDevicesLoading}
                onNodeDeviceToggle={handleNodeDeviceToggle}
                onNodeDeviceModeChange={handleNodeDeviceModeChange}
                readAlertIds={readAlertIds}
                onMarkAsRead={markAsRead}
              />
            )}
            {tab === "sensors" && <SensorsTab />}
            {tab === "schedule" && <ScheduleTab currentUserRole={currentUser?.vaitro} currentUserId={currentUser?.idnguoidung} />}
            {tab === "activity" && (
              <ActivityTab
                currentUserId={currentUserId}
                currentNodeId={nodeId}
                currentUserRole={currentUser?.vaitro}
                nodesList={nodesList}
              />
            )}
            {tab === "notifications" && (
              <NotificationsTab
                readAlertIds={readAlertIds}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                currentUser={currentUser}
                alerts={alerts}
              />
            )}
            {tab === "household" && (
              <HouseholdTab currentUser={currentUser} />
            )}
            {tab === "health" && (
              <HealthTab
                livingOnline={livingOnline}
                bedroomOnline={bedroomOnline}
                kitchenOnline={kitchenOnline}
                supabaseOnline={supabaseOnline}
                mqttOnline={mqttOnline}
                sensorOnline={livingOnline}
                lastSensorTime={lastSensorTime}
              />
            )}
            {tab === "settings" && (
              <SettingsTab
                currentUserRole={currentUser?.vaitro}
                currentUser={currentUser}
              />
            )}
            {tab === "fleet" && <FleetTab />}
            {tab === "alerts" && <AlertCenterTab />}
            {tab === "users" && <UserManagementTab currentUser={currentUser} />}
            {tab === "audit" && <AuditTrailTab />}
            {tab === "support" && (
              currentUser?.vaitro === "admin" ? (
                <SupportTab currentUser={currentUser} />
              ) : (
                <BuyerSupportTab currentUser={currentUser} />
              )
            )}
            {tab === "business" && <BusinessOperationsTab />}
          </div>
        </main>
      </div>
      {currentUser?.vaitro !== "admin" && (
        <FloatingAIAssistant
          sensors={sensors}
          devices={devices}
          nodeName={node?.name || "Node hiện tại"}
          currentUserId={currentUserId}
          nodeId={nodeId}
          allNodes={nodesList.map((n: any) => ({ idnode: n.id, ten_phong: n.name, loai_phong: n.loai_phong || n.id }))}
          gasPpm={sensors.gas ?? 0}
        />
      )}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        setTab={setTab}
        setNodeId={setNodeId}
        toggleDark={toggleDark}
        currentUserRole={currentUser?.vaitro}
      />
    </div>
    </HouseholdProvider>
    </AllDevicesProvider>
  );
}
