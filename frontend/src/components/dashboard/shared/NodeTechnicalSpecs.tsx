import { useState, useEffect, useCallback } from "react";
import {
  Cpu,
  Wifi,
  Thermometer,
  HardDrive,
  Activity,
  Timer,
  Sun,
  Droplets,
  Flame,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useNode } from "@/hooks/use-node-context";
import { getDeviceTypeLabel } from "./constants";
import type { DeviceData } from "./types";

type NodeDetail = {
  idnode: string;
  ten_phong: string;
  loai_phong: string;
  firmware_version: string | null;
  trang_thai: string;
  last_heartbeat: string | null;
  rssi: number | null;
  cpu_temp: number | null;
  flash_used: number | null;
  uptime_percent: number | null;
};

const THRESHOLD_DEFAULTS: Record<string, { key: string; label: string; min: number; max: number; unit: string; icon: any }> = {
  cam_bien_nhietdo: { key: "threshold", label: "Nhiệt độ", min: 15, max: 40, unit: "°C", icon: Thermometer },
  dieu_hoa:        { key: "threshold", label: "Nhiệt độ", min: 15, max: 40, unit: "°C", icon: Thermometer },
  cam_bien_doam:   { key: "threshold", label: "Độ ẩm", min: 30, max: 90, unit: "%", icon: Droplets },
  quat:            { key: "threshold", label: "Độ ẩm", min: 30, max: 90, unit: "%", icon: Droplets },
  cam_bien_anhsang: { key: "threshold", label: "Ánh sáng", min: 0, max: 10000, unit: "lx", icon: Sun },
  den:             { key: "threshold", label: "Ánh sáng", min: 0, max: 10000, unit: "lx", icon: Sun },
  cam_bien_gas:    { key: "threshold", label: "Khí gas", min: 0, max: 1000, unit: "ppm", icon: Flame },
};

export function NodeTechnicalSpecs() {
  const { nodesList } = useNode();
  const [nodeDetails, setNodeDetails] = useState<NodeDetail[]>([]);
  const [nodeDevices, setNodeDevices] = useState<Record<string, DeviceData[]>>({});
  const [changedConfigs, setChangedConfigs] = useState<Record<number, Record<string, any>>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (nodesList.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const nodeIds = nodesList.map((n) => n.id);

      const { data: details } = await supabase
        .from("esp32_nodes")
        .select("idnode, ten_phong, loai_phong, firmware_version, trang_thai, last_heartbeat, rssi, cpu_temp, flash_used, uptime_percent")
        .in("idnode", nodeIds);

      const { data: devices } = await supabase
        .from("thietbi")
        .select("*")
        .in("idnode", nodeIds);

      if (details) setNodeDetails(details as NodeDetail[]);

      if (devices) {
        const grouped: Record<string, DeviceData[]> = {};
        for (const dev of devices) {
          if (!grouped[dev.idnode]) grouped[dev.idnode] = [];
          grouped[dev.idnode].push(dev as DeviceData);
        }
        setNodeDevices(grouped);
      }
    } catch (err) {
      console.error("Lỗi khi tải thông số node:", err);
    } finally {
      setLoading(false);
    }
  }, [nodesList]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getValue = (dev: DeviceData, key: string, fallback: number) => {
    if (changedConfigs[dev.id_thietbi]?.[key] !== undefined) {
      return changedConfigs[dev.id_thietbi][key];
    }
    return dev.cau_hinh?.[key] ?? fallback;
  };

  const updateValue = (devId: number, key: string, val: number) => {
    setChangedConfigs((prev) => {
      const existing = { ...prev[devId] };
      existing[key] = val;
      return { ...prev, [devId]: existing };
    });
  };

  const handleSaveNode = async (nodeId: string) => {
    const devices = nodeDevices[nodeId] || [];
    const relevantDevices = devices.filter((d) => changedConfigs[d.id_thietbi] && Object.keys(changedConfigs[d.id_thietbi]).length > 0);

    if (relevantDevices.length === 0) return;

    setSaving(Date.now());
    try {
      for (const dev of relevantDevices) {
        const newCauHinh = changedConfigs[dev.id_thietbi];
        const { error } = await supabase
          .from("thietbi")
          .update({ cau_hinh: newCauHinh })
          .eq("id_thietbi", dev.id_thietbi);
        if (error) throw error;

        if (newCauHinh.threshold !== undefined) {
          let loaicambien = "";
          let toantu = ">";
          if (dev.loai_thietbi === "cam_bien_nhietdo" || dev.loai_thietbi === "dieu_hoa") {
            loaicambien = "NhietDo";
          } else if (dev.loai_thietbi === "cam_bien_doam" || dev.loai_thietbi === "quat") {
            loaicambien = "DoAm";
          } else if (dev.loai_thietbi === "cam_bien_anhsang" || dev.loai_thietbi === "den") {
            loaicambien = "AnhSang";
            toantu = "<";
          }

          if (loaicambien) {
            const { data: existing } = await supabase
              .from("luat")
              .select("idluat")
              .eq("id_thietbi", dev.id_thietbi)
              .eq("loaicambien", loaicambien)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("luat")
                .update({ nguong: newCauHinh.threshold })
                .eq("idluat", existing.idluat);
            } else {
              await supabase.from("luat").insert([{
                id_thietbi: dev.id_thietbi,
                loaicambien,
                toantu,
                nguong: newCauHinh.threshold,
                automation: true,
              }]);
            }
          }
        }
      }

      toast.success(`Đã lưu ngưỡng cho ${relevantDevices.length} cảm biến!`);
      setChangedConfigs((prev) => {
        const next = { ...prev };
        for (const dev of relevantDevices) {
          delete next[dev.id_thietbi];
        }
        return next;
      });
      await fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi lưu ngưỡng: " + err.message);
    } finally {
      setSaving(null);
    }
  };

  if (nodesList.length === 0) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="h-5 w-5 text-indigo-500" />
          <h3 className="text-lg font-bold text-slate-900">Thông số kỹ thuật Node</h3>
        </div>
        <p className="text-sm text-slate-400 text-center py-4">Chưa có node nào được liên kết với tài khoản.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {nodeDetails.map((node) => {
        const devices = nodeDevices[node.idnode] || [];
        const sensorDevs = devices.filter((d) => THRESHOLD_DEFAULTS[d.loai_thietbi]);
        const hasChanges = devices.some((d) => changedConfigs[d.id_thietbi] && Object.keys(changedConfigs[d.id_thietbi]).length > 0);

        return (
          <GlassCard key={node.idnode} className="p-6">
            {/* Node Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-indigo-500" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{node.ten_phong}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">{node.idnode}</p>
                </div>
              </div>
              <Badge
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold border",
                  node.trang_thai === "online"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                    : "bg-rose-50 text-rose-700 border-rose-200/50"
                )}
              >
                <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5", node.trang_thai === "online" ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                {node.trang_thai === "online" ? "Online" : "Offline"}
              </Badge>
            </div>

            {/* Hardware Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              <SpecItem icon={Wifi} label="WiFi RSSI" value={node.rssi != null ? `${node.rssi} dBm` : "—"} color="text-sky-600" />
              <SpecItem icon={Thermometer} label="CPU Temp" value={node.cpu_temp != null ? `${node.cpu_temp}°C` : "—"} color="text-rose-500" />
              <SpecItem icon={HardDrive} label="Flash" value={node.flash_used != null ? `${node.flash_used}%` : "—"} color="text-purple-500" />
              <SpecItem icon={Activity} label="Uptime" value={node.uptime_percent != null ? `${node.uptime_percent}%` : "—"} color="text-emerald-500" />
              <SpecItem icon={Cpu} label="Firmware" value={node.firmware_version || "—"} color="text-indigo-500" />
              <SpecItem icon={Timer} label="Heartbeat" value={node.last_heartbeat ? formatRelativeTime(node.last_heartbeat) : "—"} color="text-amber-500" />
            </div>

            {/* Device List */}
            {devices.length > 0 && (
              <div className="border-t border-slate-100 pt-4 mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Thiết bị ({devices.length})</p>
                <div className="flex flex-wrap gap-2">
                  {devices.map((dev) => (
                    <Badge key={dev.id_thietbi} variant="outline" className="text-[11px] px-2 py-0.5 rounded-full">
                      {getDeviceTypeLabel(dev.loai_thietbi)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Threshold Sliders */}
            {sensorDevs.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Ngưỡng cảnh báo</p>
                <div className="space-y-4">
                  {sensorDevs.map((dev) => {
                    const cfg = THRESHOLD_DEFAULTS[dev.loai_thietbi];
                    if (!cfg) return null;
                    const val = getValue(dev, cfg.key, (cfg.min + cfg.max) / 2);
                    const isChanged = changedConfigs[dev.id_thietbi]?.[cfg.key] !== undefined;
                    const Icon = cfg.icon;
                    return (
                      <div key={dev.id_thietbi} className={cn("rounded-xl border p-3 transition-all duration-200", isChanged ? "border-indigo-300 bg-indigo-50/50" : "border-slate-100 bg-white/50")}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Icon className="h-4 w-4 text-indigo-500" />
                            <span>{dev.ten_hienthi || getDeviceTypeLabel(dev.loai_thietbi)}</span>
                          </div>
                          <span className="text-sm font-bold text-slate-900 tabular-nums">
                            {val}{cfg.unit}
                          </span>
                        </div>
                        <Slider
                          value={[val]}
                          min={cfg.min}
                          max={cfg.max}
                          step={cfg.unit === "ppm" || cfg.unit === "lx" ? 10 : 1}
                          onValueChange={(v) => updateValue(dev.id_thietbi, cfg.key, v[0])}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    disabled={!hasChanges || saving !== null}
                    onClick={() => handleSaveNode(node.idnode)}
                    className="bg-slate-900 text-white hover:bg-slate-800 cursor-pointer h-9 px-5 text-xs font-semibold disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {saving !== null ? "Đang lưu..." : "Lưu ngưỡng"}
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}

function SpecItem({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white/50 p-3 text-center">
      <Icon className={cn("h-4 w-4 mx-auto mb-1", color)} />
      <div className="text-[11px] text-slate-400 font-semibold">{label}</div>
      <div className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s trước`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h trước`;
  const day = Math.floor(hr / 24);
  return `${day}d trước`;
}
