import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  Thermometer,
  Droplets,
  Sun,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { GlassCard } from "./GlassCard";
import { CITIES } from "./constants";
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

  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const fetchUsers = async () => {
    if (currentUserRole !== "admin") return;
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from("nguoidung")
        .select("*")
        .order("idnguoidung", { ascending: true });
      if (error) throw error;
      if (data) setUsers(data);
    } catch (e) {
      console.error("Lỗi khi tải danh sách người dùng:", e);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserRole === "admin") {
      fetchUsers();
    }
  }, [currentUserRole]);

  const handleToggleRole = async (targetUser: any) => {
    if (targetUser.idnguoidung === currentUser?.idnguoidung) {
      toast.error("Bạn không thể tự thay đổi vai trò của chính mình!");
      return;
    }
    
    const newRole = targetUser.vaitro === "admin" ? "buyer" : "admin";
    try {
      const { error } = await supabase
        .from("nguoidung")
        .update({ vaitro: newRole })
        .eq("idnguoidung", targetUser.idnguoidung);
      if (error) throw error;
      toast.success(`Đã cập nhật vai trò cho ${targetUser.hoten} thành ${newRole === "admin" ? "Quản trị viên" : "Người mua"}`);
      fetchUsers();
    } catch (err: any) {
      toast.error("Không thể cập nhật vai trò: " + err.message);
    }
  };

  const handleDeleteUser = async (targetUser: any) => {
    if (targetUser.idnguoidung === currentUser?.idnguoidung) {
      toast.error("Bạn không thể tự xóa tài khoản của chính mình!");
      return;
    }
    
    const confirmDelete = window.confirm(`Bạn có chắc chắn muốn xóa tài khoản của ${targetUser.hoten} (${targetUser.email})? Hành động này không thể hoàn tác!`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("nguoidung")
        .delete()
        .eq("idnguoidung", targetUser.idnguoidung);
      if (error) throw error;
      toast.success(`Đã xóa tài khoản của ${targetUser.hoten} thành công!`);
      fetchUsers();
    } catch (err: any) {
      toast.error("Lỗi khi xóa người dùng: " + err.message);
    }
  };

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

    // Tải cấu hình AI Gemini từ biến môi trường làm mặc định (tránh kẹt key cũ lỗi trong localStorage)
    if (typeof window !== "undefined") {
      const storedKey = import.meta.env.VITE_GEMINI_API_KEY || window.localStorage.getItem("sh-gemini-key") || "";
      const storedCity = window.localStorage.getItem("sh-gemini-city");
      if (storedKey) setGeminiKey(storedKey);
      if (storedCity) setGeminiCity(storedCity);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (currentUserRole !== "admin") {
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
      } else {
        toast.success("Đã lưu cấu hình trợ lý AI Gemini thành công!");
      }

      if (currentUserRole === "admin" && typeof window !== "undefined") {
        window.localStorage.setItem("sh-gemini-key", geminiKey);
        window.localStorage.setItem("sh-gemini-city", geminiCity);
      }

    } catch (e) {
        console.error("Lỗi khi lưu cấu hình:", e);
        toast.error("Lỗi khi lưu cấu hình!");
    }
    setSaving(false);
  };

  const items = [
    { label: "Ngưỡng nhiệt độ (Bật điều hòa khi vượt)", unit: "°C", min: 15, max: 40, value: temp, set: setTemp, color: "from-rose-500 to-orange-400", icon: Thermometer },
    { label: "Ngưỡng độ ẩm (Bật quạt khi vượt)", unit: "%", min: 30, max: 90, value: humid, set: setHumid, color: "from-sky-500 to-cyan-400", icon: Droplets },
    { label: "Ngưỡng ánh sáng (Bật đèn khi dưới)", unit: "lx", min: 0, max: 1000, value: light, set: setLight, color: "from-amber-400 to-yellow-300", icon: Sun },
  ];

  return (
    <div className="space-y-5">
      {currentUserRole !== "admin" && items.map((it) => {
        const Icon = it.icon;
        return (
          <GlassCard key={it.label}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", it.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{it.label}</div>
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
                  className="w-24 bg-white/80 text-slate-700"
                />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{it.unit}</span>
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

      {currentUserRole === "admin" && (
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">Cấu hình Trợ lý AI Gemini</div>
                <div className="text-xs text-slate-500">Dự báo thời tiết & Đề xuất hẹn giờ tự động</div>
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
                className="bg-white/80 text-slate-700 dark:text-white"
              />
              <p className="text-[10px] text-slate-500">
                Lấy API Key miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">Google AI Studio</a>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Thành phố lấy dự báo thời tiết</label>
              <Select value={geminiCity} onValueChange={setGeminiCity}>
                <SelectTrigger className="w-full bg-white/80 text-slate-700 dark:text-white">
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
          </div>
        </GlassCard>
      )}

      {currentUserRole === "admin" && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="h-5 w-5 text-indigo-500" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Quản lý Tài khoản</h3>
              <p className="text-xs text-slate-500">Phân quyền, kích hoạt và quản trị danh sách người dùng hệ thống</p>
            </div>
          </div>

          {usersLoading ? (
            <div className="text-center py-6 text-sm text-slate-500 animate-pulse">Đang tải danh sách người dùng...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-500">Chưa có người dùng nào</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold text-xs">
                    <th className="pb-3 pr-4 text-left">Họ và tên</th>
                    <th className="pb-3 px-4 text-left">Email</th>
                    <th className="pb-3 px-4 text-left">Số điện thoại</th>
                    <th className="pb-3 px-4 text-left">Vai trò</th>
                    <th className="pb-3 pl-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.idnguoidung} className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-3.5 pr-4 font-semibold">{u.hoten}</td>
                      <td className="py-3.5 px-4">{u.email}</td>
                      <td className="py-3.5 px-4">{u.sodienthoai || "Chưa cập nhật"}</td>
                      <td className="py-3.5 px-4">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                          u.vaitro === "admin" 
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400" 
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        )}>
                          {u.vaitro === "admin" ? "Admin" : "Buyer"}
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        {u.idnguoidung !== currentUser?.idnguoidung && (
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleToggleRole(u)}
                              className="text-xs py-1 h-8 cursor-pointer border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 dark:text-white"
                            >
                              Đổi quyền
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDeleteUser(u)}
                              className="text-xs py-1 h-8 cursor-pointer border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-700"
                            >
                              Xóa
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={saving} className="cursor-pointer dark:text-white">Hủy</Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30 hover:opacity-90 cursor-pointer"
        >
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </div>
    </div>
  );
}
