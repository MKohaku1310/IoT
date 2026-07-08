import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Shield,
  Activity,
  Bell,
  Cpu,
  KeyRound,
  Camera,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Hồ sơ Admin | Smart Home IoT" },
      {
        name: "description",
        content: "Thông tin cá nhân, thiết bị đang quản lý và cấu hình thông báo của quản trị viên.",
      },
      { property: "og:title", content: "Hồ sơ Admin | Smart Home IoT" },
      { property: "og:description", content: "Trang hồ sơ quản trị viên hệ thống Smart Home." },
    ],
  }),
  component: ProfilePage,
});

function GlassCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_10px_40px_-20px_rgba(30,41,59,0.25)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ProfilePage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [threshold, setThreshold] = useState(30);

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{
    idnguoidung: number;
    hoten: string;
    email: string;
    sodienthoai: string;
    github: string;
    figma: string;
    ngaysinh: string;
    anhdaidien: string;
    linkpdf: string;
    thoigian: string;
  }>({
    idnguoidung: 1,
    hoten: "",
    email: "",
    sodienthoai: "",
    github: "",
    figma: "",
    ngaysinh: "",
    anhdaidien: "",
    linkpdf: "",
    thoigian: new Date().toISOString()
  });

  const loadProfileById = async (id: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("nguoidung")
        .select("*")
        .eq("idnguoidung", id)
        .single();
      if (error) {
        console.error("Lỗi khi tải thông tin hồ sơ theo ID:", error);
        toast.error("Không thể tải hồ sơ người dùng: " + error.message);
      } else if (data) {
        setProfile({
          idnguoidung: data.idnguoidung,
          hoten: data.hoten || "",
          email: data.email || "",
          sodienthoai: data.sodienthoai || "",
          github: data.github || "",
          figma: data.figma || "",
          ngaysinh: data.ngaysinh || "",
          anhdaidien: data.anhdaidien || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
          linkpdf: data.linkpdf || "",
          thoigian: data.thoigian || new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.error("Lỗi khi tải thông tin hồ sơ theo ID:", err);
      toast.error("Lỗi hệ thống khi tải hồ sơ: " + err.message);
    }
    setLoading(false);
  };

  const loadOrCreateProfile = async (authUser: any) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("nguoidung")
        .select("*")
        .eq("email", authUser.email)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          idnguoidung: data.idnguoidung,
          hoten: data.hoten || "",
          email: data.email || "",
          sodienthoai: data.sodienthoai || "",
          github: data.github || "",
          figma: data.figma || "",
          ngaysinh: data.ngaysinh || "",
          anhdaidien: data.anhdaidien || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
          linkpdf: data.linkpdf || "",
          thoigian: data.thoigian || new Date().toISOString()
        });
      } else {
        // Lấy ID lớn nhất hiện tại để cộng thêm 1
        const { data: maxData, error: maxError } = await supabase
          .from("nguoidung")
          .select("idnguoidung")
          .order("idnguoidung", { ascending: false })
          .limit(1);
        
        if (maxError) throw maxError;
        
        const newId = maxData && maxData.length > 0 ? maxData[0].idnguoidung + 1 : 2;
        const displayName = authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0] ||
          "Người dùng";
        
        const newProfile = {
          idnguoidung: newId,
          hoten: displayName,
          email: authUser.email,
          sodienthoai: "",
          github: "",
          figma: "",
          ngaysinh: null,
          anhdaidien: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
          linkpdf: "",
        };

        const { error: insertError } = await supabase
          .from("nguoidung")
          .insert([newProfile]);

        if (insertError) throw insertError;

        setProfile({
          ...newProfile,
          ngaysinh: "",
          thoigian: new Date().toISOString()
        });
        
        toast.info("Đã tự động khởi tạo hồ sơ cá nhân mới!");
      }
    } catch (err: any) {
      console.error("Lỗi khi tải/tạo hồ sơ:", err);
      toast.error("Không thể tải thông tin hồ sơ: " + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    const getSessionUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadOrCreateProfile(session.user);
      } else {
        await loadProfileById(1);
      }
    };
    
    getSessionUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await loadOrCreateProfile(session.user);
      } else {
        setUser(null);
        await loadProfileById(1);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("nguoidung")
        .update({
          hoten: profile.hoten,
          email: profile.email,
          sodienthoai: profile.sodienthoai,
          github: profile.github,
          figma: profile.figma,
          ngaysinh: profile.ngaysinh || null,
          anhdaidien: profile.anhdaidien,
          linkpdf: profile.linkpdf
        })
        .eq("idnguoidung", profile.idnguoidung)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Không có hàng nào được cập nhật. Vui lòng tắt Row Level Security (RLS) cho bảng 'nguoidung' trên Supabase Dashboard!");
      }
      
      await supabase.from("nhatkyhoatdong").insert([{
        idnguoidung: profile.idnguoidung,
        hanhdong: `Cấu hình: Cập nhật thông tin cá nhân của người dùng (${profile.hoten})`
      }]);
      
      toast.success("Cập nhật thông tin hồ sơ thành công!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error("Lỗi khi cập nhật hồ sơ: " + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_-10%_-10%,#dbe7ff_0%,transparent_60%),radial-gradient(900px_500px_at_110%_10%,#ffe4f0_0%,transparent_55%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)] p-6 lg:p-10 text-slate-800">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
        >
          <ArrowLeft className="h-4 w-4" /> Về Bảng điều khiển
        </Link>

        {/* Header card */}
        <GlassCard>
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="relative">
              <div className="overflow-hidden rounded-3xl h-24 w-24 shadow-xl shadow-indigo-500/40">
                <img src={profile.anhdaidien} alt="Avatar" className="h-full w-full object-cover" />
              </div>
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-900 text-white shadow-md transition hover:scale-110"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
                  <div className="space-y-1">
                    <Label htmlFor="fullname" className="text-xs font-semibold text-slate-500">Họ và tên</Label>
                    <Input
                      id="fullname"
                      value={profile.hoten}
                      onChange={(e) => setProfile(p => ({ ...p, hoten: e.target.value }))}
                      className="bg-white/80 h-9 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs font-semibold text-slate-500">Email</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                      className="bg-white/80 h-9 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-xs font-semibold text-slate-500">Số điện thoại</Label>
                    <Input
                      id="phone"
                      value={profile.sodienthoai}
                      onChange={(e) => setProfile(p => ({ ...p, sodienthoai: e.target.value }))}
                      className="bg-white/80 h-9 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dob" className="text-xs font-semibold text-slate-500">Ngày sinh</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={profile.ngaysinh}
                      onChange={(e) => setProfile(p => ({ ...p, ngaysinh: e.target.value }))}
                      className="bg-white/80 h-9 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="github" className="text-xs font-semibold text-slate-500">Github</Label>
                    <Input
                      id="github"
                      value={profile.github}
                      onChange={(e) => setProfile(p => ({ ...p, github: e.target.value }))}
                      className="bg-white/80 h-9 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="figma" className="text-xs font-semibold text-slate-500">Figma</Label>
                    <Input
                      id="figma"
                      value={profile.figma}
                      onChange={(e) => setProfile(p => ({ ...p, figma: e.target.value }))}
                      className="bg-white/80 h-9 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="avatar" className="text-xs font-semibold text-slate-500">Ảnh đại diện URL</Label>
                    <Input
                      id="avatar"
                      value={profile.anhdaidien}
                      onChange={(e) => setProfile(p => ({ ...p, anhdaidien: e.target.value }))}
                      className="bg-white/80 h-9 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="linkpdf" className="text-xs font-semibold text-slate-500">Đường dẫn PDF tài liệu</Label>
                    <Input
                      id="linkpdf"
                      value={profile.linkpdf}
                      onChange={(e) => setProfile(p => ({ ...p, linkpdf: e.target.value }))}
                      className="bg-white/80 h-9 text-slate-900"
                      placeholder="https://example.com/tai-lieu.pdf"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-slate-900">{profile.hoten || "Chưa thiết lập tên"}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                      <Shield className="mr-1 h-3 w-3" /> Quản trị viên
                    </Badge>
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                      <Mail className="h-3.5 w-3.5" /> {profile.email}
                    </span>
                    {profile.sodienthoai && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                        SĐT: {profile.sodienthoai}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                      <Calendar className="h-3.5 w-3.5" /> Tham gia: {new Date(profile.thoigian).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    {profile.github && (
                      <span>
                        Github: <a href={`https://github.com/${profile.github}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{profile.github}</a>
                      </span>
                    )}
                    {profile.figma && (
                      <span>
                        Figma: <span className="font-medium text-slate-700">{profile.figma}</span>
                      </span>
                    )}
                    {profile.ngaysinh && (
                      <span>
                        Sinh nhật: <span className="font-medium text-slate-700">{new Date(profile.ngaysinh).toLocaleDateString("vi-VN")}</span>
                      </span>
                    )}
                    {profile.linkpdf && (
                      <span>
                        Tài liệu: <a href={profile.linkpdf} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"><FileText className="h-3 w-3" /> Xem PDF</a>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button 
                    disabled={saving}
                    onClick={handleSaveProfile}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                  >
                    {saving ? "Đang lưu..." : "Lưu"}
                  </Button>
                  <Button 
                    variant="outline" 
                    disabled={saving}
                    onClick={() => setIsEditing(false)}
                  >
                    Hủy
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)}
                  className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30 hover:opacity-90"
                >
                  Chỉnh sửa
                </Button>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Thao tác thiết bị", value: "1,284", icon: Activity, color: "from-indigo-500 to-sky-400" },
            { label: "Cảnh báo đã xử lý", value: "42", icon: Bell, color: "from-rose-500 to-orange-400" },
            { label: "Node đang quản lý", value: "3", icon: Cpu, color: "from-emerald-500 to-teal-400" },
            { label: "Uptime hoạt động", value: "27 ngày", icon: CheckCircle2, color: "from-amber-400 to-yellow-300" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <GlassCard key={s.label} className="p-4">
                <div className={cn("grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", s.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-2xl font-bold text-slate-900">{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </GlassCard>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Managed devices */}
          <GlassCard>
            <h3 className="text-base font-semibold text-slate-900">Node/Thiết bị đang quản lý</h3>
            <p className="text-xs text-slate-500">Danh sách node ESP32 gắn với tài khoản</p>
            <ul className="mt-4 space-y-2">
              {[
                { name: "ESP32-S3 · Phòng khách", status: "Online", devices: "AC, Fan, Light" },
                { name: "ESP32-S3 · Phòng ngủ", status: "Online", devices: "AC, Light" },
                { name: "ESP32-C3 · Nhà bếp", status: "Offline", devices: "Fan, Sensor" },
              ].map((d) => (
                <li key={d.name} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900">{d.name}</div>
                    <div className="text-xs text-slate-500">{d.devices}</div>
                  </div>
                  <Badge
                    className={cn(
                      "rounded-full",
                      d.status === "Online"
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                        : "bg-rose-100 text-rose-700 hover:bg-rose-100",
                    )}
                  >
                    ● {d.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </GlassCard>

          {/* Change password */}
          <GlassCard>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-500" />
              <h3 className="text-base font-semibold text-slate-900">Đổi mật khẩu</h3>
            </div>
            <form
              className="mt-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                toast.success("Đã đổi mật khẩu thành công");
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="old">Mật khẩu hiện tại</Label>
                <Input id="old" type="password" className="bg-white/80" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new">Mật khẩu mới</Label>
                <Input id="new" type="password" className="bg-white/80" placeholder="Ít nhất 8 ký tự" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
                <Input id="confirm" type="password" className="bg-white/80" />
              </div>
              <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800">
                Cập nhật mật khẩu
              </Button>
            </form>
          </GlassCard>
        </div>

        {/* Notification prefs */}
        <GlassCard>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-slate-500" />
            <h3 className="text-base font-semibold text-slate-900">Cài đặt thông báo cá nhân</h3>
          </div>
          <div className="mt-4 space-y-4">
            <ToggleRow
              label="Nhận cảnh báo qua email"
              hint="Gửi tới admin@smarthome.io khi thiết bị vượt ngưỡng"
              value={emailAlerts}
              onChange={setEmailAlerts}
            />
            <ToggleRow
              label="Thông báo đẩy trong ứng dụng"
              hint="Toast góc phải màn hình khi có sự kiện mới"
              value={pushAlerts}
              onChange={setPushAlerts}
            />
            <ToggleRow
              label="Chỉ báo cảnh báo nghiêm trọng"
              hint="Bỏ qua cảnh báo mức thấp/thông tin"
              value={criticalOnly}
              onChange={setCriticalOnly}
            />
            <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900">Ngưỡng nhiệt độ báo riêng</div>
                  <div className="text-xs text-slate-500">Gửi email khi nhiệt độ vượt giá trị này</div>
                </div>
                <div className="text-lg font-semibold text-slate-900 tabular-nums">
                  {threshold}°C
                </div>
              </div>
              <Slider value={[threshold]} min={20} max={40} step={1} onValueChange={(v) => setThreshold(v[0])} className="mt-4" />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => toast.success("Đã lưu cài đặt thông báo")}
              className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30 hover:opacity-90"
            >
              Lưu cài đặt
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 p-4">
      <div className="min-w-0 pr-3">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="text-xs text-slate-500">{hint}</div>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
