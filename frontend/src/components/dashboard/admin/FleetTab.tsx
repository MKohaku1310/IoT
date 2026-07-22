import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Server,
  Search,
  Radio,
  Cpu,
  Database,
  ArrowUpCircle,
  PlusCircle,
  Clock,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  User,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

type ESP32Node = {
  idnode: string;
  idnguoidung: number | null;
  ten_phong: string;
  ngay_kich_hoat: string;
  firmware_version: string;
  trang_thai: "online" | "offline";
  last_heartbeat: string;
  uptime_percent: number;
  rssi: number;
  flash_used: number;
  cpu_temp: number;
  pairing_token: string;
  target_firmware: string | null;
  ota_status: "idle" | "pending" | "updating" | "success" | "failed";
  trang_thai_duyet?: "pending" | "approved" | "rejected";
  chuc_nang?: string[];
  nguoidung?: {
    hoten: string;
    email: string;
  };
};

type UserOption = {
  idnguoidung: number;
  hoten: string;
  email: string;
};

export function FleetTab() {
  const [nodes, setNodes] = useState<ESP32Node[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  // Selected node for drill-down details
  const [selectedNode, setSelectedNode] = useState<ESP32Node | null>(null);

  // Provisioning state
  const [provDialogOpen, setProvDialogOpen] = useState(false);
  const [provNodeId, setProvNodeId] = useState("");
  const [provRoom, setProvRoom] = useState("");
  const [provUser, setProvUser] = useState("");
  const [provChucNang, setProvChucNang] = useState<string[]>([]);
  const [generatedToken, setGeneratedToken] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  // OTA state
  const [otaDialogOpen, setOtaDialogOpen] = useState(false);
  const [otaTargetVersion, setOtaTargetVersion] = useState("1.0.1");
  const [otaMode, setOtaMode] = useState("major"); // "silent" | "major"
  const [pushingOta, setPushingOta] = useState(false);

  // Edit node name state
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [editingNodeName, setEditingNodeName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Delete node state
  const [nodeToDelete, setNodeToDelete] = useState<ESP32Node | null>(null);
  const [deletingNode, setDeletingNode] = useState(false);

  // Blocked nodes state
  const [blockedNodes, setBlockedNodes] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 0. Sync auth_uid if needed so RLS recognizes current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const { data: prof } = await supabase
          .from("nguoidung")
          .select("idnguoidung, auth_uid")
          .eq("email", session.user.email)
          .maybeSingle();
        if (prof && (!prof.auth_uid || prof.auth_uid !== session.user.id)) {
          await supabase
            .from("nguoidung")
            .update({ auth_uid: session.user.id })
            .eq("idnguoidung", prof.idnguoidung);
        }
      }

      // 1. Fetch nodes (with fallback if relationship join fails)
      let nodeData: any[] | null = null;
      let nodeError: any = null;

      const res = await supabase
        .from("esp32_nodes")
        .select("*, nguoidung(hoten, email)")
        .neq("idnode", "SYSTEM_CONFIG")
        .order("idnode", { ascending: true });

      if (res.error) {
        console.warn("[FleetTab] Join query failed, falling back to simple select:", res.error);
        const fallbackRes = await supabase
          .from("esp32_nodes")
          .select("*")
          .neq("idnode", "SYSTEM_CONFIG")
          .order("idnode", { ascending: true });
        nodeData = fallbackRes.data;
        nodeError = fallbackRes.error;
      } else {
        nodeData = res.data;
      }

      if (nodeError) throw nodeError;

      // 2. Fetch users for provisioning dropdown & fallback user mapping
      const { data: userData } = await supabase
        .from("nguoidung")
        .select("idnguoidung, hoten, email, vaitro")
        .order("idnguoidung", { ascending: true });

      if (userData && nodeData) {
        const userMap = new Map(userData.map((u) => [u.idnguoidung, u]));
        nodeData = nodeData.map((node) => ({
          ...node,
          nguoidung: node.nguoidung || (node.idnguoidung ? userMap.get(node.idnguoidung) || null : null),
        }));
      }

      setNodes(nodeData || []);
      setUsers((userData || []).filter((u: any) => u.vaitro !== "admin"));

      // 3. Fetch blocked nodes
      const { data: blockedData } = await supabase
        .from("blocked_nodes")
        .select("*")
        .order("thoigian", { ascending: false });
      setBlockedNodes(blockedData || []);
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu Fleet:", err);
      toast.error("Không thể tải thông tin Fleet: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Re-fetch data when auth state resolves or changes (ensures JWT session header is attached)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchData();
      }
    });

    // Subscribe to realtime changes in nodes
    const channel = supabase
      .channel("nodes-fleet-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "esp32_nodes" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Update selectedNode state when database updates realtime
  useEffect(() => {
    if (selectedNode) {
      const updated = nodes.find((n) => n.idnode === selectedNode.idnode);
      if (updated) setSelectedNode(updated);
    }
  }, [nodes, selectedNode]);

  const handleGeneratePairing = () => {
    if (!provNodeId || !provRoom) {
      toast.error("Vui lòng điền mã ID thiết bị và Phòng lắp đặt!");
      return;
    }
    // Generate pairing token
    setGeneratedToken(crypto.randomUUID());
  };

  const handleProvisionSubmit = async () => {
    if (!provNodeId || !provRoom || !generatedToken) return;
    setProvisioning(true);

    try {
      const { error } = await supabase.from("esp32_nodes").insert([
        {
          idnode: provNodeId,
          ten_phong: provRoom,
          idnguoidung: provUser ? Number(provUser) : null,
          pairing_token: generatedToken,
          trang_thai: "offline",
          firmware_version: "1.0.0",
          uptime_percent: 100.0,
          chuc_nang: provChucNang.length > 0 ? provChucNang : ['temp', 'humid', 'light', 'light_dev', 'fan_dev', 'ac_dev'],
        },
      ]);

      if (error) throw error;
      toast.success("Đăng ký (Provisioning) thiết bị thành công!");

      // Log audit
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("nguoidung")
          .select("idnguoidung, hoten")
          .eq("auth_uid", session.user.id)
          .single();
        if (profile) {
          await supabase.from("audit_log").insert([{
            idnguoidung: profile.idnguoidung,
            hoten: profile.hoten,
            hanhdong: "Provisioning thiết bị",
            chi_tiet: `Đã kích hoạt node mới ${provNodeId} gán cho phòng ${provRoom} với token pairing`
          }]);
        }
      }

      setProvDialogOpen(false);
      setProvNodeId("");
      setProvRoom("");
      setProvUser("");
      setProvChucNang([]);
      setGeneratedToken("");
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi kích hoạt thiết bị: " + err.message);
    } finally {
      setProvisioning(false);
    }
  };

  const handlePushOTA = async () => {
    if (!selectedNode) return;
    setPushingOta(true);

    try {
      // 1. Update database
      const { error } = await supabase
        .from("esp32_nodes")
        .update({
          target_firmware: otaTargetVersion,
          ota_status: "pending",
        })
        .eq("idnode", selectedNode.idnode);

      if (error) throw error;
      
      const successMsg = otaMode === "silent"
        ? `Đã lên lịch cập nhật OTA tự động (Silent) lên v${otaTargetVersion} lúc 2h sáng`
        : `Đã gửi yêu cầu cập nhật OTA bản lớn lên v${otaTargetVersion} để chờ Buyer phê duyệt`;
      toast.success(successMsg);

      // Log audit
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("nguoidung")
          .select("idnguoidung, hoten")
          .eq("auth_uid", session.user.id)
          .single();
        if (profile) {
          await supabase.from("audit_log").insert([{
            idnguoidung: profile.idnguoidung,
            hoten: profile.hoten,
            hanhdong: "Đẩy OTA Firmware",
            chi_tiet: `Đẩy firmware OTA Node: ${selectedNode.idnode} lên v${otaTargetVersion} (Chế độ: ${otaMode === "silent" ? "Silent/Ban đêm" : "Major/Cần Consent"})`
          }]);
        }
      }

      setOtaDialogOpen(false);
    } catch (err: any) {
      toast.error("Lỗi cập nhật OTA: " + err.message);
    } finally {
      setPushingOta(false);
    }
  };

  const handleApproveNode = async (node: ESP32Node) => {
    try {
      const { data: updatedNode, error } = await supabase
        .from("esp32_nodes")
        .update({ trang_thai_duyet: "approved" })
        .eq("idnode", node.idnode)
        .select();

      if (error) throw error;
      if (!updatedNode || updatedNode.length === 0) {
        throw new Error("CSDL không cho phép sửa (chưa đúng quyền Admin hoặc bị RLS Policy chặn).");
      }

      // Tự động tạo thietbi + luat từ mảng chuc_nang
      const FUNC_MAP: Record<string, { loai: string; ten: string; hw: string; sensor: boolean; luat?: { loaicambien: string; toantu: string; nguong: number } }> = {
        temp:         { loai: "cam_bien_nhietdo", ten: "Cảm biến Nhiệt độ",    hw: "DHT11",     sensor: true,  luat: { loaicambien: "NhietDo", toantu: ">", nguong: 30.0 } },
        humid:        { loai: "cam_bien_doam",    ten: "Cảm biến Độ ẩm",       hw: "DHT11",     sensor: true,  luat: { loaicambien: "DoAm",    toantu: ">", nguong: 75.0 } },
        light:        { loai: "cam_bien_anhsang", ten: "Cảm biến Ánh sáng",    hw: "BH1750",    sensor: true,  luat: { loaicambien: "AnhSang", toantu: "<", nguong: 200.0 } },
        gas_sensor:   { loai: "cam_bien_gas",     ten: "Cảm biến Gas MQ-2",    hw: "ADC-34",    sensor: true },
        light_dev:    { loai: "den",              ten: "Đèn",                  hw: "GPIO-2",    sensor: false },
        fan_dev:      { loai: "quat",             ten: "Quạt",                 hw: "GPIO-4",    sensor: false },
        ac_dev:       { loai: "dieu_hoa",         ten: "Điều hòa",             hw: "IR-TX-5",   sensor: false },
        dehumidifier: { loai: "may_hut_am",       ten: "Máy hút ẩm",          hw: "GPIO-12",   sensor: false },
      };

      const chucNang = node.chuc_nang || [];
      const { data: existingDevs } = await supabase
        .from("thietbi")
        .select("loai_thietbi")
        .eq("idnode", node.idnode);
      const existingTypes = new Set((existingDevs || []).map((d: any) => d.loai_thietbi));

      const devicesToInsert: any[] = [];
      const sensorFuncs: Array<{ func: string; mapping: typeof FUNC_MAP[string] }> = [];

      for (const func of chucNang) {
        const mapping = FUNC_MAP[func];
        if (!mapping || existingTypes.has(mapping.loai)) continue;
        devicesToInsert.push({
          idnode: node.idnode,
          loai_thietbi: mapping.loai,
          ten_hienthi: mapping.ten,
          dia_chi_hw: mapping.hw,
          trangthai: 0,
          tu_dong: true,
          cau_hinh: mapping.loai === "cam_bien_gas"
            ? { threshold: 300, unit: "ppm", gas_type: "LPG/Methane", warn_level: 200, danger_level: 300 }
            : {},
        });
        if (mapping.luat) sensorFuncs.push({ func, mapping });
      }

      if (devicesToInsert.length > 0) {
        const { data: insertedDevs } = await supabase
          .from("thietbi")
          .insert(devicesToInsert)
          .select("id_thietbi, loai_thietbi");

        if (insertedDevs && sensorFuncs.length > 0) {
          // Lấy idluat max
          const { data: maxLuat } = await supabase
            .from("luat")
            .select("idluat")
            .order("idluat", { ascending: false })
            .limit(1);
          let nextId = (maxLuat && maxLuat.length > 0) ? maxLuat[0].idluat + 1 : 1;

          const devIdMap: Record<string, number> = {};
          for (const d of insertedDevs) devIdMap[d.loai_thietbi] = d.id_thietbi;

          const luatRows = sensorFuncs
            .filter(s => devIdMap[s.mapping.loai])
            .map(s => ({
              id_thietbi: devIdMap[s.mapping.loai],
              loaicambien: s.mapping.luat!.loaicambien,
              toantu: s.mapping.luat!.toantu,
              nguong: s.mapping.luat!.nguong,
              automation: true,
            }));

          if (luatRows.length > 0) {
            await supabase.from("luat").insert(luatRows);
          }
        }

        toast.success(`Đã phê duyệt thiết bị ${node.idnode} và tạo ${devicesToInsert.length} thiết bị!`);
      } else {
        toast.success(`Đã phê duyệt và kích hoạt thiết bị ${node.idnode}!`);
      }

      // Log audit
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("nguoidung")
          .select("idnguoidung, hoten")
          .eq("auth_uid", session.user.id)
          .maybeSingle();
        if (profile) {
          await supabase.from("audit_log").insert([{
            idnguoidung: profile.idnguoidung,
            hoten: profile.hoten,
            hanhdong: "Phê duyệt thiết bị",
            chi_tiet: `Đã phê duyệt và bàn giao node ${node.idnode} lắp tại ${node.ten_phong} cho người dùng ID=${node.idnguoidung}`
          }]);
        }
      }

      setSelectedNode(null);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi phê duyệt thiết bị: " + err.message);
    }
  };

  const handleRejectNode = async (node: ESP32Node) => {
    if (!confirm(`Bạn có chắc chắn muốn từ chối yêu cầu đăng ký thiết bị ${node.idnode}?`)) return;
    try {
      const { data: updatedNode, error } = await supabase
        .from("esp32_nodes")
        .update({ trang_thai_duyet: "rejected", idnguoidung: null })
        .eq("idnode", node.idnode)
        .select();

      if (error) throw error;
      if (!updatedNode || updatedNode.length === 0) {
        throw new Error("CSDL không cho phép sửa (chưa đúng quyền Admin hoặc bị RLS Policy chặn).");
      }

      // Chặn MAC để ESP32 không tự tạo lại node
      await supabase.from("blocked_nodes").insert([{
        idnode: node.idnode,
        ly_do: `Từ chối bởi admin`,
      }]);

      toast.success(`Đã từ chối yêu cầu đăng ký của thiết bị ${node.idnode}`);

      // Log audit
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("nguoidung")
          .select("idnguoidung, hoten")
          .eq("auth_uid", session.user.id)
          .maybeSingle();
        if (profile) {
          await supabase.from("audit_log").insert([{
            idnguoidung: profile.idnguoidung,
            hoten: profile.hoten,
            hanhdong: "Từ chối thiết bị",
            chi_tiet: `Đã từ chối yêu cầu đăng ký node ${node.idnode} của người dùng ID=${node.idnguoidung}`
          }]);
        }
      }

      setSelectedNode(null);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi từ chối thiết bị: " + err.message);
    }
  };

  const handleEditNodeName = async () => {
    if (!selectedNode || !editingNodeName.trim()) return;
    setSavingName(true);

    try {
      const { error } = await supabase
        .from("esp32_nodes")
        .update({ ten_phong: editingNodeName.trim() })
        .eq("idnode", selectedNode.idnode);

      if (error) throw error;
      toast.success("Đã cập nhật tên phòng thành công!");

      // Log audit
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("nguoidung")
          .select("idnguoidung, hoten")
          .eq("auth_uid", session.user.id)
          .single();
        if (profile) {
          await supabase.from("audit_log").insert([{
            idnguoidung: profile.idnguoidung,
            hoten: profile.hoten,
            hanhdong: "Cập nhật tên node",
            chi_tiet: `Đã đổi tên node ${selectedNode.idnode} từ "${selectedNode.ten_phong}" thành "${editingNodeName.trim()}"`
          }]);
        }
      }

      setEditNameDialogOpen(false);
      setEditingNodeName("");
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi cập nhật tên phòng: " + err.message);
    } finally {
      setSavingName(false);
    }
  };

  const openEditNameDialog = () => {
    if (selectedNode) {
      setEditingNodeName(selectedNode.ten_phong);
      setEditNameDialogOpen(true);
    }
  };

  const handleDeleteNode = async () => {
    if (!nodeToDelete) return;
    setDeletingNode(true);

    try {
      // Delete from esp32_nodes (cascade will delete related devices)
      const { error } = await supabase
        .from("esp32_nodes")
        .delete()
        .eq("idnode", nodeToDelete.idnode);

      if (error) throw error;

      // Chặn MAC để ESP32 không tự tạo lại node
      await supabase.from("blocked_nodes").insert([{
        idnode: nodeToDelete.idnode,
        ly_do: `Xóa bởi admin`,
      }]);

      toast.success(`Đã xóa node "${nodeToDelete.ten_phong}" thành công!`);

      // Log audit
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("nguoidung")
          .select("idnguoidung, hoten")
          .eq("auth_uid", session.user.id)
          .single();
        if (profile) {
          await supabase.from("audit_log").insert([{
            idnguoidung: profile.idnguoidung,
            hoten: profile.hoten,
            hanhdong: "Xóa node",
            chi_tiet: `Đã xóa node ${nodeToDelete.idnode} (${nodeToDelete.ten_phong})`
          }]);
        }
      }

      setNodeToDelete(null);
      setSelectedNode(null);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi xóa node: " + err.message);
    } finally {
      setDeletingNode(false);
    }
  };

  const handleUnblockNode = async (idnode: string) => {
    try {
      const { error } = await supabase
        .from("blocked_nodes")
        .delete()
        .eq("idnode", idnode);
      if (error) throw error;
      toast.success(`Đã bỏ chặn node "${idnode}". Node sẽ tự kết nối lại khi ESP32 gửi heartbeat.`);
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi bỏ chặn: " + err.message);
    }
  };

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchSearch =
        (n.idnode || "").toLowerCase().includes(search.toLowerCase()) ||
        (n.ten_phong || "").toLowerCase().includes(search.toLowerCase()) ||
        (n.nguoidung?.hoten ? n.nguoidung.hoten.toLowerCase().includes(search.toLowerCase()) : false);
      const matchStatus = statusFilter === "all" || n.trang_thai === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [nodes, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredNodes.length / PAGE_SIZE));
  const paginatedNodes = useMemo(() => {
    return filteredNodes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredNodes, page]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const total = nodes.length;
    const online = nodes.filter((n) => n.trang_thai === "online").length;
    const updateNeeded = nodes.filter((n) => n.firmware_version !== "1.0.1").length; // assuming latest is 1.0.1
    return { total, online, updateNeeded };
  }, [nodes]);

  // Mock RSSI history for charts
  const mockRssiHistory = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      name: `${i * 2}s`,
      rssi: -55 - Math.floor(Math.random() * 12),
    }));
  }, [selectedNode]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="h-5 w-5 text-indigo-500" />
            Quản lý Fleet thiết bị đầu cuối
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            Giám sát trạng thái hoạt động thực, cấu hình firmware, và provisioning thiết bị cho khách hàng.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setProvDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 cursor-pointer font-bold"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Provisioning Node mới
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900 cursor-pointer text-slate-800 dark:text-slate-200 font-semibold"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Fleet Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassCard className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-slate-600 dark:text-slate-300 font-bold">Tổng thiết bị đã bán (Fleet)</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.total} Node</div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500">
            <Server className="h-5 w-5" />
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-slate-600 dark:text-slate-300 font-bold">Thiết bị đang trực tuyến</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.online} / {stats.total} Active
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
            <CheckCircle className="h-5 w-5" />
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-xs text-slate-600 dark:text-slate-300 font-bold">Cần cập nhật Firmware</div>
            <div className="text-2xl font-black text-amber-500">
              {stats.updateNeeded} Node
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500">
            <ArrowUpCircle className="h-5 w-5" />
          </div>
        </GlassCard>
      </div>

      {/* Search and Filters */}
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-indigo-500" />
          <Input
            placeholder="Tìm theo Device ID, vị trí phòng hoặc chủ sở hữu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
          >
            <option value="all">Tất cả thiết bị</option>
            <option value="online">Trực tuyến (Online)</option>
            <option value="offline">Ngoại tuyến (Offline)</option>
          </select>
        </div>
      </GlassCard>

      {/* Nodes Table Card */}
      <GlassCard className="p-6 overflow-hidden">
        {loading && nodes.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-600 dark:text-slate-300 font-semibold animate-pulse">
            Đang tải danh sách thiết bị trong fleet...
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-600 dark:text-slate-400 font-medium">
            Không tìm thấy thiết bị nào khớp bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-4 text-left">Device ID / MAC</th>
                  <th className="pb-3 px-4 text-left">Chủ sở hữu</th>
                  <th className="pb-3 px-4 text-left">Vị trí phòng</th>
                  <th className="pb-3 px-4 text-center">Trạng thái</th>
                  <th className="pb-3 px-4 text-left">Uptime 30d</th>
                  <th className="pb-3 px-4 text-left">Bản firmware</th>
                  <th className="pb-3 pl-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedNodes.map((n) => {
                  const isOnline = n.trang_thai === "online";
                  return (
                    <tr
                      key={n.idnode}
                      className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition-colors cursor-pointer"
                      onClick={() => setSelectedNode(n)}
                    >
                      <td className="py-3.5 pr-4 font-mono font-bold text-slate-900 dark:text-slate-200">
                        {n.idnode}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        {n.nguoidung ? (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            {n.nguoidung.hoten}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa bàn giao</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{n.ten_phong}</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Badge
                            className={`rounded-full border-transparent font-bold ${
                              isOnline
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                            }`}
                          >
                            {isOnline ? "Online" : "Offline"}
                          </Badge>
                          {(n as any).trang_thai_duyet === "pending" && (
                            <Badge className="rounded-full bg-amber-500 text-white font-extrabold text-[10px] animate-pulse px-2 py-0">
                              Chờ duyệt
                            </Badge>
                          )}
                          {(n as any).trang_thai_duyet === "rejected" && (
                            <Badge className="rounded-full bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0">
                              Từ chối
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium">{n.uptime_percent}%</td>
                      <td className="py-3.5 px-4 font-mono text-xs">v{n.firmware_version}</td>
                      <td className="py-3.5 pl-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNode(n);
                            }}
                            className="text-xs text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer font-bold"
                          >
                            Chi tiết →
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNodeToDelete(n);
                            }}
                            className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                            title="Xóa node"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-500">
                <div>
                  Hiển thị {(page - 1) * PAGE_SIZE + 1} –{" "}
                  {Math.min(page * PAGE_SIZE, filteredNodes.length)} trong tổng số{" "}
                  {filteredNodes.length} node
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 w-16 cursor-pointer border-slate-200 dark:border-slate-800"
                  >
                    Trước
                  </Button>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Trang {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 w-16 cursor-pointer border-slate-200 dark:border-slate-800"
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Blocked Nodes */}
      {blockedNodes.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Node đã chặn ({blockedNodes.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Các MAC address này bị chặn không cho phép ESP32 tự kết nối lại. Bỏ chặn nếu muốn cho phép kết nối lại.
          </p>
          <div className="space-y-2.5">
            {blockedNodes.map((bn) => (
              <div key={bn.idnode} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <div className="text-xs">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{bn.idnode}</span>
                  {bn.ly_do && <span className="ml-2 text-slate-500 dark:text-slate-400">— {bn.ly_do}</span>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnblockNode(bn.idnode)}
                  className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/20 cursor-pointer font-bold"
                >
                  Bỏ chặn
                </Button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Drill-down Detail Modal */}
      <Dialog open={selectedNode !== null} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-y-auto max-h-[90vh]">
          {selectedNode && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-indigo-500" />
                      Chi tiết thiết bị: {selectedNode.idnode}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 text-xs">
                      Phòng lắp đặt: <b>{selectedNode.ten_phong}</b> · Ngày kích hoạt:{" "}
                      {new Date(selectedNode.ngay_kich_hoat).toLocaleDateString("vi-VN")}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`rounded-full font-bold px-3 py-0.5 border-transparent ${
                        selectedNode.trang_thai === "online"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                      }`}
                    >
                      {selectedNode.trang_thai === "online" ? "Online" : "Offline"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openEditNameDialog}
                      className="border-slate-200 dark:border-slate-800 cursor-pointer text-xs"
                    >
                      Đổi tên phòng
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              {/* Banner phê duyệt yêu cầu đăng ký Node mới */}
              {selectedNode.trang_thai_duyet === "pending" && (
                <div className="p-4 bg-amber-50 dark:bg-amber-955/20 text-amber-800 dark:text-amber-300 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 text-xs space-y-3">
                  <div className="flex gap-2 items-start">
                    <Clock className="h-4 w-4 shrink-0 mt-0.5 animate-pulse text-amber-500" />
                    <div>
                      <p className="font-bold text-sm">Yêu cầu đăng ký thiết bị mới cần phê duyệt</p>
                      <p className="mt-1">
                        Khách hàng: <b>{selectedNode.nguoidung?.hoten || "Không rõ"}</b> ({selectedNode.nguoidung?.email}) đã gửi yêu cầu kết nối Node này cho vị trí <b>{selectedNode.ten_phong}</b>.
                      </p>
                      {selectedNode.chuc_nang && selectedNode.chuc_nang.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 items-center">
                          <span className="font-bold text-slate-500">Chức năng yêu cầu:</span>
                          {selectedNode.chuc_nang.map((f: string) => (
                            <span key={f} className="bg-amber-100/50 dark:bg-amber-900/50 text-[10px] px-2.5 py-0.5 rounded-full font-semibold">
                              {f === "temp" ? "Nhiệt độ" :
                               f === "humid" ? "Độ ẩm" :
                               f === "light" ? "Ánh sáng" :
                               f === "light_dev" ? "Đèn" :
                               f === "fan_dev" ? "Quạt" :
                               f === "ac_dev" ? "Điều hòa" : f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end border-t border-amber-200/40 dark:border-amber-900/20 pt-2.5">
                    <Button
                      size="sm"
                      onClick={() => handleRejectNode(selectedNode)}
                      className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer px-3 py-1 h-8 text-xs font-bold"
                    >
                      Từ chối yêu cầu
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveNode(selectedNode)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-3 py-1 h-8 text-xs font-bold"
                    >
                      Phê duyệt & kích hoạt
                    </Button>
                  </div>
                </div>
              )}

              {/* Warnings alert banner for offline devices */}
              {selectedNode.trang_thai === "offline" && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-2xl border border-rose-100 dark:border-rose-900 text-xs space-y-1.5 flex gap-2 items-start">
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Dữ liệu cũ - Mất kết nối</p>
                    <p>
                      Mọi số liệu dưới đây chỉ là lịch sử lần cuối hoạt động. Heartbeat cuối nhận được lúc:{" "}
                      <b>{new Date(selectedNode.last_heartbeat).toLocaleString("vi-VN")}</b>
                    </p>
                  </div>
                </div>
              )}

              {/* Stats detail grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
                  <Radio className="h-5 w-5 text-sky-500 mb-2 animate-pulse" />
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Cường độ sóng (RSSI)</div>
                  <div className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">
                    {selectedNode.trang_thai === "online" ? `${selectedNode.rssi} dBm` : "Offline"}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    {selectedNode.rssi >= -65 ? "Sóng tốt" : selectedNode.rssi >= -80 ? "Sóng yếu" : "Sóng rất yếu"}
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
                  <Database className="h-5 w-5 text-indigo-500 mb-2" />
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Dung lượng Flash đã dùng</div>
                  <div className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">
                    {selectedNode.flash_used}%
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    Trống: {(100 - selectedNode.flash_used).toFixed(1)}% (Free)
                  </div>
                </GlassCard>

                <GlassCard className="p-4 flex flex-col items-center justify-center text-center">
                  <Cpu className="h-5 w-5 text-amber-500 mb-2" />
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Nhiệt độ chip</div>
                  <div className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">
                    {selectedNode.trang_thai === "online" ? `${selectedNode.cpu_temp} °C` : "Offline"}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">Nhiệt độ nhân ESP32</div>
                </GlassCard>
              </div>

              {/* RSSI signals charts */}
              {selectedNode.trang_thai === "online" && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cường độ sóng WiFi (RSSI) trong 30s qua</div>
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockRssiHistory} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRssi" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis domain={[-95, -40]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="rssi" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorRssi)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* OTA & pairings */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-wrap gap-4 items-center justify-between text-xs">
                <div className="space-y-1">
                  <p className="text-slate-400">Pairing Token thiết bị:</p>
                  <code className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                    {selectedNode.pairing_token}
                  </code>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOtaDialogOpen(true)}
                    disabled={selectedNode.trang_thai === "offline"}
                    className="border-slate-200 dark:border-slate-800 cursor-pointer flex items-center gap-1 font-bold"
                  >
                    <ArrowUpCircle className="h-4 w-4 text-indigo-500" />
                    Đẩy nâng cấp OTA
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Node Name Dialog */}
      <Dialog open={editNameDialogOpen} onOpenChange={setEditNameDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-indigo-600 flex items-center gap-1.5 font-bold">
              <PlusCircle className="h-5 w-5 text-indigo-500" />
              Đổi tên phòng
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Cập nhật tên phòng cho thiết bị {selectedNode?.idnode}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tên phòng mới:</label>
              <Input
                placeholder="Ví dụ: Phòng ngủ, Phòng khách..."
                value={editingNodeName}
                onChange={(e) => setEditingNodeName(e.target.value)}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditNameDialogOpen(false)}
              className="border-slate-200 dark:border-slate-800 cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              onClick={handleEditNodeName}
              disabled={savingName || !editingNodeName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              {savingName ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Node Confirmation Dialog */}
      <Dialog open={nodeToDelete !== null} onOpenChange={(open) => !open && setNodeToDelete(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              Xác nhận xóa Node
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Thao tác này sẽ xóa vĩnh viễn node và tất cả thiết bị liên quan. Hành động này **không thể hoàn tác**.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs space-y-1">
              <p className="font-semibold">ID Node: <b>{nodeToDelete?.idnode}</b></p>
              <p className="font-semibold">Tên phòng: <b>{nodeToDelete?.ten_phong}</b></p>
              <p className="font-semibold">Chủ sở hữu: <b>{nodeToDelete?.nguoidung?.hoten || "Chưa bàn giao"}</b></p>
            </div>
            <div className="text-xs text-slate-500">
              <p>⚠️ Lưu ý:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Tất cả thiết bị thuộc node này sẽ bị xóa</li>
                <li>Lịch sử hoạt động sẽ bị xóa</li>
                <li>Không thể khôi phục sau khi xóa</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNodeToDelete(null)}
              disabled={deletingNode}
              className="cursor-pointer dark:text-white"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteNode}
              disabled={deletingNode}
              className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              {deletingNode ? "Đang xóa..." : "Xác nhận Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provisioning Dialog */}
      <Dialog open={provDialogOpen} onOpenChange={setProvDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-indigo-600 flex items-center gap-1.5 font-bold">
              <PlusCircle className="h-5 w-5 text-indigo-500" />
              Provisioning thiết bị đầu cuối mới
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Khai báo ID phần cứng mới, gán cho khách hàng, và sinh token bảo mật phục vụ kết nối MQTT lần đầu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mã thiết bị (Device ID / MAC):</label>
              <Input
                placeholder="Ví dụ: ESP32-S3-Node-04..."
                value={provNodeId}
                onChange={(e) => setProvNodeId(e.target.value)}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white h-9 text-xs font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phòng / Địa điểm lắp đặt:</label>
              <Input
                placeholder="Ví dụ: Phòng ăn, Ban công..."
                value={provRoom}
                onChange={(e) => setProvRoom(e.target.value)}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Gán cho chủ sở hữu (Khách hàng):</label>
              <select
                value={provUser}
                onChange={(e) => setProvUser(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 rounded-lg text-slate-800 dark:text-white text-xs"
              >
                <option value="">-- Để trống (Chưa bàn giao) --</option>
                {users.map((u) => (
                  <option key={u.idnguoidung} value={u.idnguoidung}>
                    {u.hoten} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Chức năng thiết bị:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'temp', label: 'Đo nhiệt độ' },
                  { id: 'humid', label: 'Đo độ ẩm' },
                  { id: 'light', label: 'Đo ánh sáng' },
                  { id: 'light_dev', label: 'Điều khiển đèn' },
                  { id: 'fan_dev', label: 'Điều khiển quạt' },
                  { id: 'ac_dev', label: 'Điều khiển điều hòa' },
                ].map((func) => (
                  <button
                    key={func.id}
                    type="button"
                    onClick={() => {
                      setProvChucNang(prev =>
                        prev.includes(func.id)
                          ? prev.filter(f => f !== func.id)
                          : [...prev, func.id]
                      );
                    }}
                    className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                      provChucNang.includes(func.id)
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                    }`}
                  >
                    {func.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleGeneratePairing}
                className="w-full border-indigo-200 dark:border-indigo-900 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-950 font-bold"
              >
                Sinh Pairing Token bảo mật
              </Button>

              {generatedToken && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Pairing token sinh ra:</p>
                  <code className="bg-slate-200 dark:bg-slate-900 px-2 py-0.5 rounded text-[10px] font-mono text-slate-800 dark:text-slate-300 block select-all break-all text-center">
                    {generatedToken}
                  </code>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProvDialogOpen(false)} disabled={provisioning} className="cursor-pointer">
              Hủy
            </Button>
            <Button
              onClick={handleProvisionSubmit}
              disabled={provisioning || !provNodeId || !provRoom || !generatedToken}
              className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              {provisioning ? "Đang gán..." : "Đăng ký thiết bị"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTA Confirm Dialog */}
      <Dialog open={otaDialogOpen} onOpenChange={setOtaDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-indigo-600 flex items-center gap-1.5 font-bold">
              <ArrowUpCircle className="h-5 w-5 text-indigo-500" />
              Đẩy bản cập nhật OTA nâng cấp phần mềm
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
              Lệnh nâng cấp sẽ gửi đến thiết bị qua MQTT. Thiết bị sẽ tự động tải bản build mới và khởi động lại.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Chọn phiên bản nâng cấp:</label>
              <select
                value={otaTargetVersion}
                onChange={(e) => setOtaTargetVersion(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 rounded-lg text-slate-800 dark:text-white text-xs"
              >
                <option value="1.0.1">v1.0.1 (Bản vá lỗi kết nối dht11)</option>
                <option value="1.1.0">v1.1.0 (Bản bổ sung cảm biến khói)</option>
                <option value="2.0.0">v2.0.0 (Bản nâng cấp phần cứng lớn)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Chế độ nâng cấp OTA:</label>
              <select
                value={otaMode}
                onChange={(e) => setOtaMode(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 rounded-lg text-slate-800 dark:text-white text-xs"
              >
                <option value="silent">Silent Background Update (Cập nhật ngầm lúc 2h sáng)</option>
                <option value="major">Major Firmware Upgrade (Cần xác nhận từ Buyer trên App)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtaDialogOpen(false)} disabled={pushingOta} className="cursor-pointer">
              Hủy
            </Button>
            <Button
              onClick={handlePushOTA}
              disabled={pushingOta}
              className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              {pushingOta ? "Đang gửi..." : "Xác nhận Đẩy OTA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
