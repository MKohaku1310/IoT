import { useState, useEffect } from "react";
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
import { GlassCard } from "./GlassCard";
import { ScheduleRule } from "./types";
import { toast } from "sonner";

const DEVICE_LABELS = {
  ac: { name: "Điều hòa", icon: Wind },
  fan: { name: "Quạt", icon: Fan },
  light: { name: "Đèn", icon: Lightbulb },
};

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function ScheduleTab() {
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
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
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
              <SelectTrigger className="bg-white/80 text-slate-700"><SelectValue /></SelectTrigger>
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
          <Button onClick={saveSchedule} className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white hover:opacity-90 cursor-pointer">
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
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Danh sách lịch đang cài đặt</h3>
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
                      : "border-white/70 bg-white/60 hover:bg-white/80 dark:bg-slate-800/40 dark:border-slate-850"
                  )}
                >
                  <div className={cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", r.action === "on" ? "from-emerald-500 to-teal-400" : "from-slate-500 to-slate-400")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-905 dark:text-white">
                      {D.name} · <span className={r.action === "on" ? "text-emerald-600" : "text-slate-550 dark:text-slate-400"}>{r.action === "on" ? "BẬT" : "TẮT"}</span>
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
                  />
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
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
