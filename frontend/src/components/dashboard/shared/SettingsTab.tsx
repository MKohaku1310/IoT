import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";
import {
  Thermometer,
  Droplets,
  Sun,
  Server,
  Globe,
  Radio,
  Clock,
  Cpu,
  ShieldAlert,
  Plus,
  CheckCircle2,
  XCircle,
  Info,
  Pencil,
  Flame,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { CITIES, getDeviceTypeConfig, getDeviceTypeLabel } from "./constants";
import { useAllDevices } from "@/hooks/use-all-devices";
import { useNode } from "@/hooks/use-node-context";
import { DeviceData } from "./types";
import { mqttPublish, CTRL_TOPICS } from "@/lib/mqttClient";
import { useCustomTime } from "@/hooks/use-custom-time.tsx";

const FUNCTION_LABELS: Record<string, string> = {
  temp: "Đo nhiệt độ",
  humid: "Đo độ ẩm",
  light: "Đo ánh sáng",
  gas_sensor: "Cảm biến khí gas (Bếp)",
  light_dev: "Điều khiển đèn",
  fan_dev: "Điều khiển quạt",
  ac_dev: "Điều khiển điều hòa",
  dehumidifier: "Máy hút ẩm",
};
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SettingsTab({
  currentUserRole = "buyer",
  currentUser,
}: {
  currentUserRole?: string;
  currentUser?: any;
}) {
  const [temp, setTemp] = useState(30);
  const [humid, setHumid] = useState(70);
  const [light, setLight] = useState(350);
  const [saving, setSaving] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiCity, setGeminiCity] = useState(CITIES[0].name);

  const { devices, updateDeviceName } = useAllDevices();
  const { nodesList, currentNodeId } = useNode();

  const [changedConfigs, setChangedConfigs] = useState<Record<number, any>>({});

  const getValue = (devId: number, key: string, fallback: number) => {
    const changed = changedConfigs[devId];
    if (changed && changed[key] !== undefined) return Number(changed[key]);
    const dev = devices.find((d) => d.id_thietbi === devId);
    if (dev && dev.cau_hinh && dev.cau_hinh[key] !== undefined) return Number(dev.cau_hinh[key]);
    if (key === "warn_level") return 200;
    if (key === "threshold" && dev?.loai_thietbi === "cam_bien_gas") return 300;
    if (dev?.loai_thietbi === "cam_bien_nhietdo" || dev?.loai_thietbi === "dieu_hoa") return 30;
    if (dev?.loai_thietbi === "cam_bien_doam" || dev?.loai_thietbi === "quat") return 75;
    if (dev?.loai_thietbi === "cam_bien_anhsang" || dev?.loai_thietbi === "den") return 350;
    return fallback;
  };

  const updateValue = (devId: number, key: string, val: number) => {
    console.log(`[SettingsTab] updateValue called: devId=${devId}, key=${key}, val=${val}`);
    setChangedConfigs((prev) => {
      const dev = devices.find((d) => d.id_thietbi === devId);
      const existing = prev[devId] || dev?.cau_hinh || {};
      const nextConfig = { ...existing, [key]: val };
      if (key === "threshold" && dev?.loai_thietbi === "cam_bien_gas") {
        nextConfig.danger_level = val;
      }
      const result = {
        ...prev,
        [devId]: nextConfig,
      };
      console.log(`[SettingsTab] changedConfigs updated:`, result);
      return result;
    });
  };

  // Node registration/pairing state for Buyer
  const [nodeId, setNodeId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [functions, setFunctions] = useState<string[]>([
    "temp", "humid", "light", "light_dev", "fan_dev", "ac_dev"
  ]);
  const [myNodes, setMyNodes] = useState<any[]>([]);
  const [nodesLoading, setNodesLoading] = useState(true);
  const [pairingLoading, setPairingLoading] = useState(false);

  const fetchMyNodes = async () => {
    if (!currentUser?.idnguoidung) return;
    setNodesLoading(true);
    try {
      const { data, error } = await supabase
        .from("esp32_nodes")
        .select("*")
        .eq("idnguoidung", currentUser.idnguoidung);
      if (!error && data) {
        setMyNodes(data);
      }
    } catch (err: any) {
      console.error("Lỗi khi tải thiết bị của tôi:", err);
    } finally {
      setNodesLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserRole !== "admin" && currentUser?.idnguoidung) {
      fetchMyNodes();
    }
  }, [currentUser, currentUserRole]);

  // Admin system settings state
  const [hbTimeout, setHbTimeout] = useState(60);
  const [rssiThreshold, setRssiThreshold] = useState(-80);
  const [tempThreshold, setTempThreshold] = useState(65);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [mqttBroker, setMqttBroker] = useState("wss://broker.hivemq.com:8884/mqtt");
  const [mqttPrefix, setMqttPrefix] = useState("buivansang_iot_pj");

  // Removed redundant user management state and functions for admin.

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

    async function loadAdminConfig() {
      try {
        const { data, error } = await supabase
          .from("esp32_nodes")
          .select("*")
          .eq("idnode", "SYSTEM_CONFIG")
          .maybeSingle();

        if (!error && data) {
          setHbTimeout(Number(data.flash_used) || 60);
          setRssiThreshold(Number(data.rssi) || -80);
          setTempThreshold(Number(data.cpu_temp) || 65);
          setMaintenanceMode(data.ota_status === "maintenance");
        }
      } catch (e) {
        console.error("Lỗi khi tải cấu hình hệ thống:", e);
      }
    }

    if (currentUserRole === "admin") {
      loadAdminConfig();
      if (typeof window !== "undefined") {
        const storedBroker = window.localStorage.getItem("sh-mqtt-broker");
        const storedPrefix = window.localStorage.getItem("sh-mqtt-prefix");
        if (storedBroker) setMqttBroker(storedBroker);
        if (storedPrefix) setMqttPrefix(storedPrefix);
      }
    }

    // Tải cấu hình AI Gemini từ biến môi trường làm mặc định (tránh kẹt key cũ lỗi trong localStorage)
    if (typeof window !== "undefined") {
      const storedKey = import.meta.env.VITE_GEMINI_API_KEY || window.localStorage.getItem("sh-gemini-key") || "";
      const storedCity = window.localStorage.getItem("sh-gemini-city");
      if (storedKey) setGeminiKey(storedKey);
      if (storedCity) setGeminiCity(storedCity);
    }
  }, [currentUserRole]);

  const handleSave = async () => {
    console.log("[SettingsTab] handleSave được gọi - currentUserRole:", currentUserRole);
    console.log("[SettingsTab] changedConfigs:", changedConfigs);
    console.log("[SettingsTab] Số lượng thiết bị thay đổi:", Object.keys(changedConfigs).length);

    setSaving(true);
    try {
      if (currentUserRole !== "admin") {
        // 1. Cập nhật thietbi.cau_hinh cho các thiết bị có thay đổi
        const updatedDeviceIds = Object.keys(changedConfigs);
        console.log("[SettingsTab] updatedDeviceIds:", updatedDeviceIds);
        for (const devIdStr of updatedDeviceIds) {
          const devId = Number(devIdStr);
          const dev = devices.find((d) => d.id_thietbi === devId);
          if (!dev) continue;

          const newCauHinh = changedConfigs[devId];

          // Tìm tất cả thiết bị cùng node thuộc nhóm cảm biến / actuator tương ứng
          const relatedTypes =
            dev.loai_thietbi === "cam_bien_nhietdo" || dev.loai_thietbi === "dieu_hoa"
              ? ["cam_bien_nhietdo", "dieu_hoa"]
              : dev.loai_thietbi === "cam_bien_doam" || dev.loai_thietbi === "quat"
                ? ["cam_bien_doam", "quat"]
                : dev.loai_thietbi === "cam_bien_anhsang" || dev.loai_thietbi === "den"
                  ? ["cam_bien_anhsang", "den"]
                  : [dev.loai_thietbi];

          const targetDevs = devices.filter((d) => d.idnode === dev.idnode && relatedTypes.includes(d.loai_thietbi));
          const targetDevIds = targetDevs.map((d) => d.id_thietbi);

          // 1. Cập nhật thietbi.cau_hinh cho tất cả các thiết bị liên quan trên node này
          for (const targetId of targetDevIds) {
            const currentCfg = devices.find((d) => d.id_thietbi === targetId)?.cau_hinh || {};
            await supabase
              .from("thietbi")
              .update({ cau_hinh: { ...currentCfg, ...newCauHinh } })
              .eq("id_thietbi", targetId);
          }

          // 2. Đồng bộ ngưỡng vào bảng luat (cho backend automation và ESP32)
          if (newCauHinh.threshold !== undefined) {
            let loaicambien = '';
            let toantu = '>';
            if (relatedTypes.includes("dieu_hoa")) {
              loaicambien = "NhietDo";
              toantu = '>';
            } else if (relatedTypes.includes("quat")) {
              loaicambien = "DoAm";
              toantu = '>';
            } else if (relatedTypes.includes("den")) {
              loaicambien = "AnhSang";
              toantu = '<';
            }

            if (loaicambien) {
              for (const targetId of targetDevIds) {
                const { data: existingLuat } = await supabase
                  .from("luat")
                  .select("*")
                  .eq("id_thietbi", targetId)
                  .eq("loaicambien", loaicambien)
                  .maybeSingle();

                if (existingLuat) {
                  await supabase
                    .from("luat")
                    .update({ nguong: newCauHinh.threshold })
                    .eq("id_thietbi", targetId)
                    .eq("loaicambien", loaicambien);
                } else {
                  await supabase.from("den").upsert([{ idden: targetId, tenden: "Device", trangthai: 0 }]);
                  await supabase
                    .from("luat")
                    .insert([{
                      id_thietbi: targetId,
                      loaicambien: loaicambien,
                      toantu: toantu,
                      nguong: newCauHinh.threshold,
                      automation: true
                    }]);
                }
              }

              // Publish ngưỡng mới lên MQTT để ESP32 nhận ngay lập tức
              let mqttTopic = '';
              if (loaicambien === 'NhietDo') mqttTopic = CTRL_TOPICS.THRESHOLD_TEMP;
              else if (loaicambien === 'DoAm') mqttTopic = CTRL_TOPICS.THRESHOLD_HUM;
              else if (loaicambien === 'AnhSang') mqttTopic = CTRL_TOPICS.THRESHOLD_LUX;

              if (mqttTopic) {
                mqttPublish(mqttTopic, String(newCauHinh.threshold), 1).catch(() => { });
              }
            }
          }

          // 3. Ghi Activity History cho thiết bị này
          const devName = dev.ten_hienthi || getDeviceTypeLabel(dev.loai_thietbi);
          const matchedNode = nodesList.find((n) => n.id === dev.idnode);
          const roomName = matchedNode ? matchedNode.name : dev.idnode;

          let detailStr = "";
          if (dev.loai_thietbi === "cam_bien_gas") {
            detailStr = `Ngưỡng báo động=${newCauHinh.threshold} ppm, Ngưỡng cảnh báo=${newCauHinh.warn_level} ppm`;
          } else {
            const unit = dev.loai_thietbi === "cam_bien_nhietdo" || dev.loai_thietbi === "dieu_hoa" ? "°C" :
              dev.loai_thietbi === "cam_bien_doam" || dev.loai_thietbi === "quat" ? "%" : "lx";
            detailStr = `Ngưỡng=${newCauHinh.threshold} ${unit}`;
          }

          if (currentUser) {
            await supabase.from("nhatkyhoatdong").insert([{
              idnguoidung: currentUser.idnguoidung,
              idnode: dev.idnode,
              id_thietbi: devId,
              loai_thongbao: 'user_action',
              hanhdong: JSON.stringify({
                loai_nhatky: "user_action",
                loai_thao_tac: "config_change",
                description: `Lưu cấu hình mới: Cập nhật ngưỡng thiết bị "${devName}" (${roomName}) - ${detailStr}`,
                device_id: devId,
                device_name: devName,
                node_id: dev.idnode,
                node_name: roomName,
                timestamp: new Date().toISOString(),
                meta_detail: newCauHinh,
              }),
            }]);
          }
        }

        if (typeof window !== "undefined") {
          window.localStorage.setItem("sh-gemini-city", geminiCity);
        }

        setChangedConfigs({});
        toast.success("Đã lưu cấu hình tài khoản thành công!");
      } else {
        // 2. Lưu cấu hình Gemini, MQTT và Hệ thống cho Admin
        if (typeof window !== "undefined") {
          window.localStorage.setItem("sh-gemini-key", geminiKey);
          window.localStorage.setItem("sh-mqtt-broker", mqttBroker.trim());
          window.localStorage.setItem("sh-mqtt-prefix", mqttPrefix.trim());
        }

        const { error: configError } = await supabase
          .from("esp32_nodes")
          .upsert([{
            idnode: "SYSTEM_CONFIG",
            ten_phong: "Cấu hình hệ thống",
            flash_used: hbTimeout,
            rssi: rssiThreshold,
            cpu_temp: tempThreshold,
            ota_status: maintenanceMode ? "maintenance" : "idle"
          }], { onConflict: "idnode" });

        if (configError) throw configError;

        if (currentUser) {
          await supabase.from("audit_log").insert([{
            idnguoidung: currentUser.idnguoidung,
            hoten: currentUser.hoten,
            hanhdong: "Cấu hình hệ thống",
            chi_tiet: `Cập nhật cấu hình: Bảo trì=${maintenanceMode ? 'BẬT' : 'TẮT'}, Heartbeat=${hbTimeout}s, RSSI=${rssiThreshold}dBm, Temp CPU=${tempThreshold}°C, MQTT Broker=${mqttBroker}`
          }]);
        }

        toast.success("Đã lưu cấu hình hệ thống thành công! Vui lòng tải lại trang nếu bạn vừa đổi Broker MQTT.");
      }
    } catch (e: any) {
      console.error("Lỗi khi lưu cấu hình:", e);
      toast.error("Lỗi khi lưu cấu hình: " + e.message);
    }
    setSaving(false);
  };

  const handlePairDevice = async () => {
    if (!nodeId.trim() || !roomName.trim()) {
      toast.error("Vui lòng nhập đầy đủ Mã thiết bị (Node ID) và Tên phòng lắp đặt!");
      return;
    }
    if (functions.length === 0) {
      toast.error("Vui lòng chọn ít nhất một chức năng cho thiết bị!");
      return;
    }
    setPairingLoading(true);
    try {
      // Check if node is already claimed by someone else or approved
      const { data: existingNode, error: checkError } = await supabase
        .from("esp32_nodes")
        .select("*")
        .eq("idnode", nodeId.trim())
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingNode) {
        if (existingNode.idnguoidung && existingNode.trang_thai_duyet === "approved") {
          toast.error("Mã Node ID này đã được người dùng khác đăng ký và sở hữu!");
          setPairingLoading(false);
          return;
        }

        // Overwrite or update the request
        const { error: updateError } = await supabase
          .from("esp32_nodes")
          .update({
            idnguoidung: currentUser?.idnguoidung,
            ten_phong: roomName.trim(),
            trang_thai_duyet: "pending",
            chuc_nang: functions,
          })
          .eq("idnode", nodeId.trim());

        if (updateError) throw updateError;
      } else {
        // Insert new request
        const { error: insertError } = await supabase
          .from("esp32_nodes")
          .insert([
            {
              idnode: nodeId.trim(),
              idnguoidung: currentUser?.idnguoidung,
              ten_phong: roomName.trim(),
              trang_thai_duyet: "pending",
              chuc_nang: functions,
              trang_thai: "offline",
              firmware_version: "1.0.0",
              uptime_percent: 100.0,
            },
          ]);

        if (insertError) throw insertError;
      }

      toast.success("Gửi yêu cầu đăng ký thiết bị thành công! Đang chờ Admin phê duyệt.");

      // Log activity
      if (currentUser) {
        await supabase.from("audit_log").insert([{
          idnguoidung: currentUser.idnguoidung,
          hoten: currentUser.hoten,
          hanhdong: "Đăng ký thiết bị",
          chi_tiet: `Đã gửi yêu cầu đăng ký node mới ID=${nodeId.trim()} phòng ${roomName.trim()}`
        }]);
      }

      setNodeId("");
      setRoomName("");
      fetchMyNodes();
    } catch (e: any) {
      toast.error("Lỗi khi đăng ký thiết bị: " + e.message);
    } finally {
      setPairingLoading(false);
    }
  };

function SystemTimeCard() {
  const { currentTime, isCustom, setCustomTime, addOffset, resetToRealTime } = useCustomTime();
  const [pickerVal, setPickerVal] = useState("");

  const handleApply = () => {
    if (!pickerVal) return;
    const d = new Date(pickerVal);
    if (!isNaN(d.getTime())) {
      setCustomTime(d);
      toast.success("Đã cập nhật thời gian hệ thống mới!");
    }
  };

  return (
    <GlassCard className="p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Thời gian Hệ thống & Giả lập
              {isCustom && <Badge className="bg-amber-500 text-white font-extrabold text-[10px]">Đang giả lập</Badge>}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Tùy chỉnh ngày giờ hiển thị trên ứng dụng để thử nghiệm kịch bản tự động</p>
          </div>
        </div>
        {isCustom && (
          <Button size="sm" variant="destructive" onClick={() => { resetToRealTime(); toast.success("Đã khôi phục giờ thực!"); }} className="font-bold cursor-pointer">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Về giờ thực
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
        <div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Thời gian hiện tại</div>
          <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{currentTime.toLocaleString("vi-VN")}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { addOffset(1); toast.success("+1 Giờ"); }} className="font-bold text-xs cursor-pointer">+1 Giờ</Button>
          <Button size="sm" variant="outline" onClick={() => { addOffset(-1); toast.success("-1 Giờ"); }} className="font-bold text-xs cursor-pointer">-1 Giờ</Button>
          <Button size="sm" variant="outline" onClick={() => { addOffset(0, 1); toast.success("+1 Ngày"); }} className="font-bold text-xs cursor-pointer">+1 Ngày</Button>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Input
          type="datetime-local"
          value={pickerVal}
          onChange={(e) => setPickerVal(e.target.value)}
          className="text-xs font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
        />
        <Button size="sm" onClick={handleApply} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shrink-0">
          Áp dụng
        </Button>
      </div>
    </GlassCard>
  );
}

  return (
    <div className="space-y-5">
      <SystemTimeCard />
      {currentUserRole !== "admin" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ngưỡng cảnh báo theo phòng</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Thiết lập giới hạn an toàn độc lập cho thiết bị và cảm biến tại mỗi khu vực</p>
            </div>
          </div>

          {nodesList.map((node) => {
            const nodeDevs = devices.filter((d) => d.idnode === node.id);
            const tempDev = nodeDevs.find((d) => d.loai_thietbi === "cam_bien_nhietdo") || nodeDevs.find((d) => d.loai_thietbi === "dieu_hoa");
            const humidDev = nodeDevs.find((d) => d.loai_thietbi === "cam_bien_doam") || nodeDevs.find((d) => d.loai_thietbi === "quat");
            const lightDev = nodeDevs.find((d) => d.loai_thietbi === "cam_bien_anhsang") || nodeDevs.find((d) => d.loai_thietbi === "den");
            const gasDev = nodeDevs.find((d) => d.loai_thietbi === "cam_bien_gas");

            const nodeItems: Array<{
              device: DeviceData;
              label: string;
              unit: string;
              min: number;
              max: number;
              color: string;
              icon: any;
              valueKey: string;
              isGas?: boolean;
            }> = [];

            if (tempDev) {
              nodeItems.push({
                device: tempDev,
                label: `Ngưỡng nhiệt độ (Cảnh báo AC)`,
                unit: "°C",
                min: 15,
                max: 40,
                color: "from-rose-500 to-orange-400",
                icon: Thermometer,
                valueKey: "threshold",
              });
            }
            if (humidDev) {
              nodeItems.push({
                device: humidDev,
                label: `Ngưỡng độ ẩm (Cảnh báo Quạt)`,
                unit: "%",
                min: 30,
                max: 90,
                color: "from-sky-500 to-cyan-400",
                icon: Droplets,
                valueKey: "threshold",
              });
            }
            if (lightDev) {
              nodeItems.push({
                device: lightDev,
                label: `Ngưỡng ánh sáng (Cảnh báo Đèn)`,
                unit: "lx",
                min: 0,
                max: 10000,
                color: "from-amber-400 to-yellow-300",
                icon: Sun,
                valueKey: "threshold",
              });
            }
            if (gasDev) {
              nodeItems.push({
                device: gasDev,
                label: `Ngưỡng báo động khí gas (Danger Level)`,
                unit: "ppm",
                min: 50,
                max: 1000,
                color: "from-red-500 to-rose-600",
                icon: Flame,
                valueKey: "threshold",
                isGas: true,
              });
            }

            if (nodeItems.length === 0) return null;

            return (
              <div key={node.id} className="space-y-3 bg-white/40 dark:bg-slate-900/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-500 pl-2">
                  {node.name} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(ID: {node.id})</span>
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {nodeItems.map((it) => {
                    const Icon = it.icon;
                    const val = getValue(it.device.id_thietbi, it.valueKey, it.min);

                    if (it.isGas) {
                      const warnVal = getValue(it.device.id_thietbi, "warn_level", 200);
                      return (
                        <GlassCard key={it.device.id_thietbi} className="p-4 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", it.color)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                {it.device.ten_hienthi || "Cảm biến Gas"}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Thiết bị: {it.device.dia_chi_hw || "MQ-2"}</div>
                            </div>
                          </div>

                          {/* Slider 1: Warn level */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                              <span>Ngưỡng cảnh báo (Warn Level)</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">{warnVal} {it.unit}</span>
                            </div>
                            <Slider
                              value={[warnVal]}
                              min={it.min}
                              max={it.max}
                              step={10}
                              onValueChange={(v) => updateValue(it.device.id_thietbi, "warn_level", v[0])}
                            />
                          </div>

                          {/* Slider 2: Danger level */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                              <span>Ngưỡng báo động (Danger Level)</span>
                              <span className="text-red-600 dark:text-red-400 font-bold">{val} {it.unit}</span>
                            </div>
                            <Slider
                              value={[val]}
                              min={it.min}
                              max={it.max}
                              step={10}
                              onValueChange={(v) => updateValue(it.device.id_thietbi, "threshold", v[0])}
                            />
                          </div>
                        </GlassCard>
                      );
                    }

                    return (
                      <GlassCard key={it.device.id_thietbi} className="p-4 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", it.color)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                {it.device.ten_hienthi || getDeviceTypeLabel(it.device.loai_thietbi)}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Phạm vi: {it.min} – {it.max} {it.unit}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={val}
                              min={it.min}
                              max={it.max}
                              onChange={(e) => updateValue(it.device.id_thietbi, it.valueKey, Number(e.target.value))}
                              className="w-20 h-8 text-xs bg-white/80 dark:bg-slate-900 text-slate-700 dark:text-white text-center rounded-lg"
                            />
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{it.unit}</span>
                          </div>
                        </div>
                        <div className="pt-2">
                          <Slider
                            value={[val]}
                            min={it.min}
                            max={it.max}
                            step={1}
                            onValueChange={(v) => updateValue(it.device.id_thietbi, it.valueKey, v[0])}
                          />
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {currentUserRole !== "admin" && (
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Đăng ký & Liên kết thiết bị ESP32 mới</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Gửi yêu cầu đăng ký Node mới vào hệ thống và chọn các chức năng mong muốn</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Mã thiết bị (Node ID):</label>
              <Input
                placeholder="Nhập Node ID từ thiết bị ESP32 (ví dụ: ESP32-S3-Node-99)"
                value={nodeId}
                onChange={(e) => setNodeId(e.target.value)}
                className="bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-white text-xs h-9.5 rounded-xl border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Tên phòng lắp đặt thiết bị:</label>
              <Input
                placeholder="Ví dụ: Phòng ngủ, Ban công, Sân thượng..."
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-white text-xs h-9.5 rounded-xl border border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Chức năng thiết bị:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {Object.entries(FUNCTION_LABELS).map(([key, label]) => {
                const checked = functions.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-[10px] font-medium cursor-pointer transition-all ${checked
                        ? "border-indigo-500/50 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
                        : "border-slate-200/50 bg-white/50 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
                      }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setFunctions((prev) => [...prev, key]);
                          else setFunctions((prev) => prev.filter((f) => f !== key));
                        }}
                        className="peer sr-only"
                      />
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${checked ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        }`}>
                        {checked && <CheckCircle2 className="w-2.5 h-2.5" />}
                      </div>
                    </div>
                    {label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handlePairDevice}
              disabled={pairingLoading || !nodeId.trim() || !roomName.trim() || functions.length === 0}
              className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20 hover:opacity-90 cursor-pointer text-xs h-9 font-bold px-5"
            >
              {pairingLoading ? "Đang xử lý..." : "Gửi yêu cầu đăng ký"}
            </Button>
          </div>

          {/* User's Nodes List inside the same card */}
          {myNodes.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
              <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Danh sách thiết bị của tôi</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {myNodes.map((n) => (
                  <div key={n.idnode} className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{n.ten_phong}</span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-500">ID: {n.idnode}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {n.chuc_nang?.map((f: string) => (
                          <span key={f} className="text-[9px] px-1.5 py-0.5 rounded flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            {FUNCTION_LABELS[f] || f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      {n.trang_thai_duyet === "approved" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-transparent dark:bg-emerald-950/20 dark:text-emerald-400 flex items-center gap-1 text-[9px] px-2 py-0">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Hoạt động
                        </Badge>
                      ) : n.trang_thai_duyet === "rejected" ? (
                        <Badge className="bg-rose-100 text-rose-700 border-transparent dark:bg-rose-950/20 dark:text-rose-400 flex items-center gap-1 text-[9px] px-2 py-0">
                          <XCircle className="h-3 w-3 text-rose-600" /> Từ chối
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-transparent dark:bg-amber-950/30 dark:text-amber-400 animate-pulse flex items-center gap-1 text-[9px] px-2 py-0">
                          <Clock className="h-3 w-3 text-amber-600 animate-spin" /> Chờ phê duyệt
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {currentUserRole !== "admin" && (
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Đổi tên & Quản lý thiết bị</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tùy chỉnh tên hiển thị cho từng thiết bị cảm biến và điều khiển trong gia đình</p>
            </div>
          </div>

          <div className="space-y-6">
            {nodesList.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400">Không tìm thấy thiết bị nào cần đổi tên. Hãy đăng ký thiết bị trước.</div>
            ) : (
              nodesList.map((node) => {
                const nodeDevs = devices.filter((d) => d.idnode === node.id);
                if (nodeDevs.length === 0) return null;

                return (
                  <div key={node.id} className="space-y-3">
                    <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-500 pl-2">
                      {node.name} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">(ID: {node.id})</span>
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {nodeDevs.map((dev) => (
                        <DeviceRenameRow
                          key={dev.id_thietbi}
                          device={dev}
                          onRename={updateDeviceName}
                          node={node}
                          currentUserId={currentUser?.idnguoidung ? Number(currentUser.idnguoidung) : null}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>
      )}

      {currentUserRole !== "admin" && (
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cấu hình Vị trí & Thời tiết</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Định vị thành phố để hiển thị thời tiết và nhận gợi ý thông minh từ AI Gemini</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Thành phố lấy dự báo thời tiết</label>
            <Select value={geminiCity} onValueChange={setGeminiCity}>
              <SelectTrigger className="w-full bg-white/80 dark:bg-slate-900 text-slate-700 dark:text-white">
                <SelectValue placeholder="Chọn thành phố" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </GlassCard>
      )}

      {currentUserRole === "admin" && (
        <>
          {/* Card 1: AI Gemini Configuration */}
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg">
                  <Sun className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Cấu hình Trợ lý AI Gemini</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Dự báo thời tiết & Đề xuất hẹn giờ tự động</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Gemini API Key</label>
                <Input
                  type="password"
                  placeholder="Nhập API Key của Google Gemini..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  className="bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Lấy API Key miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">Google AI Studio</a>
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Card 2: MQTT Broker Connection Configuration */}
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-lg">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Cấu hình Kết nối MQTT Broker</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Đường dẫn WebSocket kết nối trực tiếp đến Broker và Tiền tố Topic</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Địa chỉ MQTT Broker WebSocket</label>
                <Input
                  type="text"
                  placeholder="Ví dụ: wss://broker.hivemq.com:8884/mqtt"
                  value={mqttBroker}
                  onChange={(e) => setMqttBroker(e.target.value)}
                  className="bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Địa chỉ WebSocket kết nối trực tiếp từ trình duyệt Frontend. Hỗ trợ giao thức wss:// bảo mật.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tiền tố Topic (Prefix)</label>
                <Input
                  type="text"
                  placeholder="Ví dụ: buivansang_iot_pj"
                  value={mqttPrefix}
                  onChange={(e) => setMqttPrefix(e.target.value)}
                  className="bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Tránh trùng lặp kênh điều khiển thiết bị ESP32 của người dùng khác trên Broker công cộng.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Card 3: Fleet Monitoring & Maintenance Configuration */}
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Cấu hình Giám sát & Bảo trì</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Thiết lập các ngưỡng phát hiện cảnh báo Fleet và chế độ bảo trì</div>
                </div>
              </div>
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="flex items-center justify-between bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 p-4 rounded-2xl">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold text-amber-800 dark:text-amber-400">Bật Chế độ Bảo trì Hệ thống</div>
                <div className="text-xs text-amber-600 dark:text-amber-500 leading-relaxed">
                  Khi bật, toàn bộ Buyer sẽ bị khóa quyền điều khiển thiết bị và nhận được thông báo bảo trì.
                </div>
              </div>
              <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
            </div>

            {/* Threshold 1: Heartbeat Timeout */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  Mất kết nối Node (Timeout)
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{hbTimeout} giây</span>
              </div>
              <Slider
                value={[hbTimeout]}
                min={30}
                max={300}
                step={5}
                onValueChange={(v) => setHbTimeout(v[0])}
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Đánh dấu thiết bị Offline và tạo cảnh báo lỗi kỹ thuật nếu không nhận được heartbeat sau X giây.
              </p>
            </div>

            {/* Threshold 2: RSSI limit */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-slate-400" />
                  Cảnh báo sóng yếu (RSSI)
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{rssiThreshold} dBm</span>
              </div>
              <Slider
                value={[rssiThreshold]}
                min={-100}
                max={-40}
                step={1}
                onValueChange={(v) => setRssiThreshold(v[0])}
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Kích hoạt cảnh báo sóng yếu (Warning) khi chỉ số RSSI của thiết bị giảm xuống dưới ngưỡng.
              </p>
            </div>

            {/* Threshold 3: CPU temp limit */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-slate-400" />
                  Quá nhiệt Vi xử lý (Chip)
                </span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{tempThreshold} °C</span>
              </div>
              <Slider
                value={[tempThreshold]}
                min={45}
                max={90}
                step={1}
                onValueChange={(v) => setTempThreshold(v[0])}
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Kích hoạt cảnh báo quá nhiệt (Warning/Critical) khi nhiệt độ bản mạch ESP32 vượt quá ngưỡng.
              </p>
            </div>
          </GlassCard>
        </>
      )}


      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={saving} className="cursor-pointer dark:text-white">Hủy</Button>
        <Button
          onClick={() => {
            console.log("[SettingsTab] Nút Lưu được click!");
            console.log("[SettingsTab] currentUserRole:", currentUserRole);
            console.log("[SettingsTab] saving:", saving);
            handleSave();
          }}
          disabled={saving}
          className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30 hover:opacity-90 cursor-pointer"
        >
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </div>
    </div>
  );
}

function DeviceRenameRow({
  device,
  onRename,
  node,
  currentUserId,
}: {
  device: DeviceData;
  onRename: (
    deviceId: number,
    newName: string,
    oldName: string,
    currentUserId: number | null,
    currentNodeId: string | null
  ) => Promise<boolean>;
  node: any;
  currentUserId: number | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(device.ten_hienthi || "");
  const [loading, setLoading] = useState(false);
  const cfg = getDeviceTypeConfig(device.loai_thietbi);
  const Icon = cfg.icon;

  useEffect(() => {
    setNewName(device.ten_hienthi || "");
  }, [device.ten_hienthi]);

  const handleSave = async () => {
    const cleanName = newName.trim();
    if (!cleanName) {
      toast.error("Tên thiết bị không được để trống!");
      return;
    }
    if (cleanName.length > 50) {
      toast.error("Tên thiết bị không được quá 50 ký tự!");
      return;
    }
    setLoading(true);
    const success = await onRename(
      device.id_thietbi,
      cleanName,
      device.ten_hienthi || cfg.label,
      currentUserId,
      node.id
    );
    setLoading(false);
    if (success) {
      setIsEditing(false);
    }
  };

  return (
    <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm", cfg.gradient)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-900 dark:text-white w-full"
              placeholder="Nhập tên mới..."
              maxLength={50}
              disabled={loading}
              autoFocus
            />
          ) : (
            <>
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {device.ten_hienthi || cfg.label}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                Loại: {cfg.label} · HW: {device.dia_chi_hw || "N/A"}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isEditing ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              onClick={() => {
                setNewName(device.ten_hienthi || "");
                setIsEditing(false);
              }}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              className="h-7 px-2.5 text-[10px] font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Lưu..." : "Lưu"}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] font-semibold border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            onClick={() => setIsEditing(true)}
          >
            Đổi tên
          </Button>
        )}
      </div>
    </div>
  );
}
