import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  CalendarClock,
  Wind,
  Fan,
  Lightbulb,
  Plus,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { GlassCard } from "@/components/ui/glass-card";
import { toast } from "sonner";
import { useAllDevices } from "@/hooks/use-all-devices";
import { useNode } from "@/hooks/use-node-context";

const DEVICE_LABELS = {
  ac: { name: "Điều hòa", icon: Wind },
  fan: { name: "Quạt", icon: Fan },
  light: { name: "Đèn", icon: Lightbulb },
};

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function ScheduleTab({ 
  currentUserRole = "buyer",
  currentUserId,
}: { 
  currentUserRole?: string;
  currentUserId?: number;
}) {
  const { devices } = useAllDevices();
  const { currentNodeId, nodesList } = useNode();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNode, setFilterNode] = useState<string>("all");
  const [householdRole, setHouseholdRole] = useState<'owner' | 'member' | null>(null);

  const [draft, setDraft] = useState<{
    device_id: number | null;
    device: "ac" | "fan" | "light";
    action: "on" | "off";
    time: string;
    days: number[];
    enabled: boolean;
    node: string;
  }>({
    device_id: null,
    device: "light",
    action: "on",
    time: "20:00",
    days: [1, 2, 3, 4, 5],
    enabled: true,
    node: "",
  });
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);

  // Lấy các thiết bị điều khiển thuộc node đang chọn (draft.node hoặc currentNodeId)
  const nodeControllableDevices = useMemo(() => {
    const targetNode = draft.node || currentNodeId;
    return devices.filter(
      (d) => d.idnode === targetNode && ["den", "quat", "dieu_hoa"].includes(d.loai_thietbi)
    );
  }, [devices, draft.node, currentNodeId]);

  // Cập nhật draft khi đổi active node
  useEffect(() => {
    if (editingRuleId === null) {
      const defaultDevice = nodeControllableDevices[0];
      let devKey: "ac" | "fan" | "light" = "light";
      if (defaultDevice) {
        if (defaultDevice.loai_thietbi === "dieu_hoa") devKey = "ac";
        else if (defaultDevice.loai_thietbi === "quat") devKey = "fan";
      }

      setDraft((s) => ({
        ...s,
        node: currentNodeId,
        device_id: defaultDevice ? defaultDevice.id_thietbi : null,
        device: devKey,
      }));
    }
  }, [currentNodeId, nodeControllableDevices, editingRuleId]);

  // Tải vai trò của user trong hộ gia đình
  useEffect(() => {
    const fetchRole = async () => {
      if (!currentUserId) return;
      try {
        const { data, error } = await supabase
          .from("thanhvien_hogiadinh")
          .select("vaitro")
          .eq("idnguoidung", currentUserId)
          .maybeSingle();
        if (!error && data) {
          setHouseholdRole(data.vaitro as 'owner' | 'member');
        } else {
          setHouseholdRole(currentUserRole === "admin" ? "owner" : "member");
        }
      } catch (e) {
        console.error("Lỗi khi tải vai trò hộ gia đình:", e);
      }
    };
    fetchRole();
  }, [currentUserId, currentUserRole]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lichhengio")
        .select("*, thietbi(*)")
        .order("idid", { ascending: true });
      if (data) {
        const mapped = data.map((item) => {
          let deviceType: "ac" | "fan" | "light" = "light";
          if (item.thietbi) {
            const type = item.thietbi.loai_thietbi;
            if (type === "dieu_hoa") deviceType = "ac";
            else if (type === "quat") deviceType = "fan";
            else deviceType = "light";
          }

          return {
            id: Number(item.idid),
            id_thietbi: item.id_thietbi,
            device: deviceType,
            action: item.hanhdong,
            time: item.thoigian.substring(0, 5),
            days: item.thu || [],
            enabled: item.kichhoat,
            node: item.thietbi?.idnode || item.idnode || "living",
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

    const channel = supabase
      .channel("schedule-tab-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "lichhengio" }, () => {
        fetchSchedules();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const saveSchedule = async () => {
    let selectedDevice = devices.find(d => d.id_thietbi === draft.device_id);
    
    if (!selectedDevice && draft.device_id === null) {
      selectedDevice = nodeControllableDevices[0];
    }

    if (!selectedDevice) {
      toast.error("Vui lòng chọn một thiết bị hợp lệ!");
      return;
    }

    const draftDeviceName = selectedDevice.ten_hienthi || (selectedDevice.loai_thietbi === "dieu_hoa" ? "Điều hòa" : selectedDevice.loai_thietbi === "quat" ? "Quạt" : "Đèn");

    try {
      if (editingRuleId !== null) {
        // Kiểm tra quyền sửa
        const isOwner = householdRole === "owner";
        const isAuthorizedMember = householdRole === "member" && devices.some(d => d.id_thietbi === selectedDevice.id_thietbi);
        const canModifyRule = currentUserRole === "admin" || isOwner || isAuthorizedMember;
        
        if (!canModifyRule) {
          toast.error("Bạn không có quyền sửa lịch hẹn cho thiết bị này!");
          return;
        }

        const { error } = await supabase
          .from("lichhengio")
          .update({
            id_thietbi: selectedDevice.id_thietbi,
            hanhdong: draft.action,
            thoigian: `${draft.time.length === 5 ? draft.time + ":00" : draft.time}`,
            thu: draft.days,
            kichhoat: draft.enabled,
            idnode: draft.node,
          })
          .eq("idid", editingRuleId);

        if (error) throw error;

        toast.success(`Đã cập nhật lịch hẹn: ${draftDeviceName} ${draft.action === "on" ? "BẬT" : "TẮT"} lúc ${draft.time}`);

        // Ghi nhật ký hoạt động
        await supabase.from("nhatkyhoatdong").insert([{
          idnguoidung: currentUserId,
          idnode: draft.node,
          id_thietbi: selectedDevice.id_thietbi,
          loai_thongbao: 'user_action',
          hanhdong: JSON.stringify({
            loai_nhatky: "user_action",
            loai_thao_tac: "schedule_update",
            description: `Cập nhật lịch hẹn giờ ID=${editingRuleId} cho thiết bị "${draftDeviceName}" (${draft.action === "on" ? "BẬT" : "TẮT"} lúc ${draft.time})`,
            device_id: selectedDevice.id_thietbi,
            device_name: draftDeviceName,
            node_id: draft.node || "",
            timestamp: new Date().toISOString(),
            meta_detail: { schedule_id: editingRuleId, action: draft.action, time: draft.time, days: draft.days },
          }),
        }]);

        setEditingRuleId(null);
      } else {
        // Khi tạo lịch hẹn mới, chỉ cho chọn thiết bị thuộc node đang active (locked)
        if (draft.node !== currentNodeId) {
          toast.error("Chỉ được tạo lịch hẹn cho node đang hoạt động!");
          return;
        }

        const { error } = await supabase
          .from("lichhengio")
          .insert([{
            id_thietbi: selectedDevice.id_thietbi,
            hanhdong: draft.action,
            thoigian: `${draft.time}:00`,
            thu: draft.days,
            kichhoat: draft.enabled,
            idnode: draft.node,
          }]);

        if (error) throw error;

        toast.success(`Đã thêm lịch hẹn: ${draftDeviceName} ${draft.action === "on" ? "BẬT" : "TẮT"} lúc ${draft.time}`);

        // Ghi nhật ký hoạt động
        await supabase.from("nhatkyhoatdong").insert([{
          idnguoidung: currentUserId,
          idnode: draft.node,
          id_thietbi: selectedDevice.id_thietbi,
          loai_thongbao: 'user_action',
          hanhdong: JSON.stringify({
            loai_nhatky: "user_action",
            loai_thao_tac: "schedule_create",
            description: `Thêm lịch hẹn giờ mới cho thiết bị "${draftDeviceName}" (${draft.action === "on" ? "BẬT" : "TẮT"} lúc ${draft.time})`,
            device_id: selectedDevice.id_thietbi,
            device_name: draftDeviceName,
            node_id: draft.node || "",
            timestamp: new Date().toISOString(),
            meta_detail: { action: draft.action, time: draft.time, days: draft.days },
          }),
        }]);
      }

      // Reset draft
      const defaultDevice = nodeControllableDevices[0];
      let devKey: "ac" | "fan" | "light" = "light";
      if (defaultDevice) {
        if (defaultDevice.loai_thietbi === "dieu_hoa") devKey = "ac";
        else if (defaultDevice.loai_thietbi === "quat") devKey = "fan";
      }
      setDraft({
        device_id: defaultDevice ? defaultDevice.id_thietbi : null,
        device: devKey,
        action: "on",
        time: "20:00",
        days: [1, 2, 3, 4, 5],
        enabled: true,
        node: currentNodeId,
      });
      fetchSchedules();
    } catch (err) {
      toast.error("Lỗi khi lưu lịch hẹn: " + (err as any).message);
    }
  };

  const handleEdit = (rule: any) => {
    const isOwner = householdRole === "owner";
    const canModifyRule = currentUserRole === "admin" || isOwner;
    
    if (!canModifyRule) {
      toast.error("Bạn không có quyền sửa lịch hẹn cho thiết bị này!");
      return;
    }

    setEditingRuleId(rule.id);
    setDraft({
      device_id: rule.id_thietbi || null,
      device: rule.device,
      action: rule.action,
      time: rule.time,
      days: rule.days,
      enabled: rule.enabled,
      node: rule.node,
    });
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
    const defaultDevice = nodeControllableDevices[0];
    let devKey: "ac" | "fan" | "light" = "light";
    if (defaultDevice) {
      if (defaultDevice.loai_thietbi === "dieu_hoa") devKey = "ac";
      else if (defaultDevice.loai_thietbi === "quat") devKey = "fan";
    }
    setDraft({
      device_id: defaultDevice ? defaultDevice.id_thietbi : null,
      device: devKey,
      action: "on",
      time: "20:00",
      days: [1, 2, 3, 4, 5],
      enabled: true,
      node: currentNodeId,
    });
  };

  const remove = async (id: number) => {
    const ruleToRemove = rules.find(r => r.id === id);
    if (!ruleToRemove) return;

    const isOwner = householdRole === "owner";
    const canModifyRule = currentUserRole === "admin" || isOwner;
    
    if (!canModifyRule) {
      toast.error("Bạn không có quyền xóa lịch hẹn cho thiết bị này!");
      return;
    }

    const dev = devices.find(d => d.id_thietbi === ruleToRemove.id_thietbi);
    const deviceName = dev?.ten_hienthi || (ruleToRemove.device === "ac" ? "Điều hòa" : ruleToRemove.device === "fan" ? "Quạt" : "Đèn");

    try {
      const { error } = await supabase
        .from("lichhengio")
        .delete()
        .eq("idid", id);
      if (error) throw error;
      
      toast.success("Đã xóa lịch hẹn thành công");

      // Ghi nhật ký hoạt động
      await supabase.from("nhatkyhoatdong").insert([{
        idnguoidung: currentUserId,
        idnode: ruleToRemove.node,
        id_thietbi: ruleToRemove.id_thietbi || null,
        loai_thongbao: 'user_action',
        hanhdong: JSON.stringify({
          loai_nhatky: "user_action",
          loai_thao_tac: "schedule_delete",
          description: `Xóa lịch hẹn giờ ID=${id} của thiết bị "${deviceName}" (${ruleToRemove.action === "on" ? "BẬT" : "TẮT"} lúc ${ruleToRemove.time})`,
          device_name: deviceName,
          node_id: ruleToRemove.node || "",
          timestamp: new Date().toISOString(),
          meta_detail: { schedule_id: id, action: ruleToRemove.action, time: ruleToRemove.time },
        }),
      }]);

      if (editingRuleId === id) {
        handleCancelEdit();
      }
      fetchSchedules();
    } catch (err) {
      toast.error("Lỗi khi xóa lịch hẹn: " + (err as any).message);
    }
  };

  const handleToggleActive = async (id: number, enabled: boolean) => {
    const rule = rules.find(r => r.id === id);
    if (!rule) return;

    const isOwner = householdRole === "owner";
    const canModifyRule = currentUserRole === "admin" || isOwner;
    
    if (!canModifyRule) {
      toast.error("Bạn không có quyền thay đổi trạng thái lịch hẹn này!");
      return;
    }

    const dev = devices.find(d => d.id_thietbi === rule.id_thietbi);
    const deviceName = dev?.ten_hienthi || (rule.device === "ac" ? "Điều hòa" : rule.device === "fan" ? "Quạt" : "Đèn");

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

      // Ghi nhật ký hoạt động
      await supabase.from("nhatkyhoatdong").insert([{
        idnguoidung: currentUserId,
        idnode: rule.node,
        id_thietbi: rule.id_thietbi || null,
        loai_thongbao: 'user_action',
        hanhdong: JSON.stringify({
          loai_nhatky: "user_action",
          loai_thao_tac: "schedule_update",
          description: `${enabled ? "Kích hoạt" : "Tạm dừng"} lịch hẹn giờ ID=${id} của thiết bị "${deviceName}"`,
          device_name: deviceName,
          node_id: rule.node || "",
          timestamp: new Date().toISOString(),
          meta_detail: { schedule_id: id, enabled },
        }),
      }]);
    } catch (err) {
      toast.error("Lỗi thay đổi trạng thái: " + (err as any).message);
    }
  };

  const toggleDay = (d: number) =>
    setDraft((s) => ({ ...s, days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d].sort() }));

  return (
    <div className="space-y-6">
      {currentUserRole !== "viewer" && (
        <GlassCard className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-indigo-500" />
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {editingRuleId !== null ? "Chỉnh sửa lịch hẹn giờ" : "Thêm lịch hẹn giờ mới"}
            </h3>
            <p className="text-xs text-slate-500">
              {editingRuleId !== null ? "Thay đổi cấu hình lịch hẹn giờ của thiết bị và lưu lại" : "Tự động bật/tắt thiết bị theo giờ, độc lập với ngưỡng cảm biến"}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">Vị trí (Node)</div>
            <Select
              value={draft.node}
              onValueChange={(v) => {
                // Khi đổi node, reset thiết bị về device đầu tiên của node đó
                const newNodeDevices = devices.filter(
                  (d) => d.idnode === v && ["den", "quat", "dieu_hoa"].includes(d.loai_thietbi)
                );
                const defaultDevice = newNodeDevices[0];
                let devKey: "ac" | "fan" | "light" = "light";
                if (defaultDevice) {
                  if (defaultDevice.loai_thietbi === "dieu_hoa") devKey = "ac";
                  else if (defaultDevice.loai_thietbi === "quat") devKey = "fan";
                }
                setDraft((s) => ({
                  ...s,
                  node: v,
                  device_id: defaultDevice ? defaultDevice.id_thietbi : null,
                  device: devKey,
                }));
              }}
            >
              <SelectTrigger className="bg-white/80 text-slate-700"><SelectValue placeholder="Chọn vị trí" /></SelectTrigger>
              <SelectContent>
                {nodesList.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">Thiết bị</div>
            <Select 
              value={draft.device_id ? String(draft.device_id) : ""} 
              onValueChange={(v) => {
                const devId = Number(v);
                const dev = nodeControllableDevices.find(d => d.id_thietbi === devId);
                if (dev) {
                  let devKey: "ac" | "fan" | "light" = "light";
                  if (dev.loai_thietbi === "dieu_hoa") devKey = "ac";
                  else if (dev.loai_thietbi === "quat") devKey = "fan";
                  setDraft(s => ({
                    ...s,
                    device_id: devId,
                    device: devKey,
                  }));
                }
              }}
            >
              <SelectTrigger className="bg-white/80 text-slate-700">
                <SelectValue placeholder="Chọn thiết bị" />
              </SelectTrigger>
              <SelectContent>
                {nodeControllableDevices.map((d) => (
                  <SelectItem key={d.id_thietbi} value={String(d.id_thietbi)}>
                    {d.ten_hienthi || (d.loai_thietbi === "dieu_hoa" ? "Điều hòa" : d.loai_thietbi === "quat" ? "Quạt" : "Đèn")}
                  </SelectItem>
                ))}
                {nodeControllableDevices.length === 0 && (
                  <SelectItem value="none" disabled>Không có thiết bị điều khiển</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">Hành động</div>
            <Select value={draft.action} onValueChange={(v) => setDraft((s) => ({ ...s, action: v as "on" | "off" }))}>
              <SelectTrigger className="bg-white/80 text-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="on">Bật</SelectItem>
                <SelectItem value="off">Tắt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-500">Giờ</div>
            <Input type="time" value={draft.time} onChange={(e) => setDraft((s) => ({ ...s, time: e.target.value }))} className="bg-white/80 text-slate-700" />
          </div>
          <div className="space-y-1.5 md:col-span-5 lg:col-span-1">
            <div className="text-xs font-medium text-slate-500">Ngày lặp lại</div>
            <div className="flex flex-wrap gap-1">
              {DAY_LABELS.map((d, i) => {
                const on = draft.days.includes(i);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg text-xs font-medium transition cursor-pointer",
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
            <Button variant="outline" onClick={handleCancelEdit} className="cursor-pointer">
              Hủy sửa
            </Button>
          )}
          <Button onClick={saveSchedule} className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white hover:opacity-90 cursor-pointer" disabled={nodeControllableDevices.length === 0}>
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
      )}

      <GlassCard className="p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/50 dark:border-slate-800/50 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Danh sách lịch đang cài đặt</h3>
            <p className="text-xs text-slate-500">{rules.filter((r) => r.enabled).length}/{rules.length} lịch đang hoạt động</p>
          </div>
          {/* Lọc theo Node */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Lọc theo Vị trí:</span>
            <Select value={filterNode} onValueChange={setFilterNode}>
              <SelectTrigger className="w-[150px] bg-white/80 text-slate-700 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả Node</SelectItem>
                {nodesList.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-6 text-sm text-slate-500">Đang tải lịch hẹn...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">Chưa cấu hình lịch hẹn nào</div>
        ) : rules.filter((r) => filterNode === "all" || r.node === filterNode).length === 0 ? (
          <div className="text-center py-6 text-sm text-slate-500">Không tìm thấy lịch hẹn phù hợp ở vị trí này</div>
        ) : (
          <ul className="space-y-2">
            {rules
              .filter((r) => filterNode === "all" || r.node === filterNode)
              .map((r) => {
                const D = DEVICE_LABELS[r.device as keyof typeof DEVICE_LABELS];
                const Icon = D.icon;
                
                // Lấy tên và thiết bị mới nhất
                const rCustomDev = r.id_thietbi 
                  ? devices.find(d => d.id_thietbi === r.id_thietbi)
                  : devices.find(d => d.idnode === r.node && d.loai_thietbi === (r.device === "ac" ? "dieu_hoa" : r.device === "fan" ? "quat" : "den"));
                
                const rDeviceName = rCustomDev?.ten_hienthi || D.name;
                const rNodeName = nodesList.find(n => n.id === r.node)?.name || r.node || "Chưa rõ";
                
                const isOwner = householdRole === "owner";
                const canModify = currentUserRole === "admin" || isOwner;

                return (
                  <li
                    key={r.id}
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-2xl border p-4 transition",
                      r.id === editingRuleId
                        ? "border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20"
                        : "border-white/70 bg-white/60 hover:bg-white/80 dark:bg-slate-800/40 dark:border-slate-800"
                    )}
                  >
                    <div className={cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm shadow-indigo-100 dark:shadow-none", r.action === "on" ? "from-emerald-500 to-teal-400" : "from-slate-500 to-slate-400")}>
                       <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 mr-1.5">
                          [{rNodeName}]
                        </span>
                        {rDeviceName} · <span className={r.action === "on" ? "text-emerald-600" : "text-slate-500 dark:text-slate-400"}>{r.action === "on" ? "BẬT" : "TẮT"}</span>
                        {r.id === editingRuleId && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            Đang sửa
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {r.time}</span>
                        <span>·</span>
                        <span className="flex gap-1">
                          {DAY_LABELS.map((d, i) => (
                            <span key={d} className={cn("rounded px-1 py-0.5 text-[10px]", r.days.includes(i) ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 font-medium" : "text-slate-300 dark:text-slate-600")}>
                              {d}
                            </span>
                          ))}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={r.enabled}
                      onCheckedChange={(v) => handleToggleActive(r.id, v)}
                      disabled={!canModify}
                    />
                    {canModify && (
                      <>
                        <button
                          onClick={() => handleEdit(r)}
                          className={cn(
                            "grid h-9 w-9 place-items-center rounded-lg transition cursor-pointer",
                            r.id === editingRuleId
                              ? "text-indigo-600 bg-indigo-100"
                              : "text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700"
                          )}
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(r.id)}
                          className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950 cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
