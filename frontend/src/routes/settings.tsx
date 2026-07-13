import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Bell,
  KeyRound,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Cài đặt tài khoản | Smart Home IoT" },
      {
        name: "description",
        content: "Cấu hình bảo mật, đổi mật khẩu và cài đặt thông báo cá nhân.",
      },
      { property: "og:title", content: "Cài đặt tài khoản | Smart Home IoT" },
      { property: "og:description", content: "Trang cấu hình bảo mật tài khoản hệ thống Smart Home." },
    ],
  }),
  component: SettingsPage,
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

function SettingsPage() {
  const navigate = useNavigate();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [threshold, setThreshold] = useState(30);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState<any>(null);
  const isFetchingRef = useRef(false);
  const [profile, setProfile] = useState<{
    idnguoidung: number;
    auth_uid?: string;
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
    auth_uid: "",
    hoten: "",
    email: "",
    sodienthoai: "",
    github: "",
    figma: "",
    ngaysinh: "",
    anhdaidien: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    linkpdf: "",
    thoigian: new Date().toISOString()
  });

  const loadOrCreateProfile = async (authUser: any) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      // Truy vấn khớp auth_uid
      const { data, error } = await supabase
        .from("nguoidung")
        .select("*")
        .eq("auth_uid", authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          idnguoidung: data.idnguoidung,
          auth_uid: data.auth_uid,
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
        // Tự khởi tạo hồ sơ nếu chưa có trong DB
        const displayName = authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          authUser.email?.split('@')[0] ||
          "Người dùng";
        
        const newProfileData = {
          auth_uid: authUser.id,
          hoten: displayName,
          email: authUser.email,
          sodienthoai: "",
          github: "",
          figma: "",
          ngaysinh: null,
          anhdaidien: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
          linkpdf: "",
        };

        const { data: insertedData, error: insertError } = await supabase
          .from("nguoidung")
          .upsert([newProfileData], { onConflict: "auth_uid" })
          .select()
          .single();

        if (insertError) {
          console.warn("Không thể tạo hồ sơ trong database:", insertError);
          setProfile({
            idnguoidung: 0,
            ...newProfileData,
            ngaysinh: "",
            thoigian: new Date().toISOString()
          });
          toast.warning(`Không thể lưu hồ sơ lên DB: ${insertError.message}`);
        } else if (insertedData) {
          setProfile({
            idnguoidung: insertedData.idnguoidung,
            auth_uid: insertedData.auth_uid,
            hoten: insertedData.hoten || "",
            email: insertedData.email || "",
            sodienthoai: insertedData.sodienthoai || "",
            github: insertedData.github || "",
            figma: insertedData.figma || "",
            ngaysinh: insertedData.ngaysinh || "",
            anhdaidien: insertedData.anhdaidien || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
            linkpdf: insertedData.linkpdf || "",
            thoigian: insertedData.thoigian || new Date().toISOString()
          });
          toast.info("Đã tự động khởi tạo hồ sơ cá nhân mới!");
        }
      }
    } catch (err: any) {
      console.error("Lỗi khi tải/tạo hồ sơ:", err);
      toast.error("Không thể tải thông tin hồ sơ: " + err.message);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const getSessionUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (session?.user) {
        setUser(session.user);
        await loadOrCreateProfile(session.user);
      } else {
        navigate({ to: "/login" });
      }
    };
    
    getSessionUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      if (session?.user) {
        setUser(session.user);
        await loadOrCreateProfile(session.user);
      } else {
        setUser(null);
        navigate({ to: "/login" });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Load notification settings from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedEmail = window.localStorage.getItem("sh-settings-email");
        if (storedEmail !== null) setEmailAlerts(storedEmail === "true");

        const storedPush = window.localStorage.getItem("sh-settings-push");
        if (storedPush !== null) setPushAlerts(storedPush === "true");

        const storedCritical = window.localStorage.getItem("sh-settings-critical");
        if (storedCritical !== null) setCriticalOnly(storedCritical === "true");

        const storedThreshold = window.localStorage.getItem("sh-settings-threshold");
        if (storedThreshold !== null) setThreshold(Number(storedThreshold));
      } catch (e) {
        console.error("Lỗi khi đọc cài đặt thông báo:", e);
      }
    }
  }, []);

  const handleSaveNotifications = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("sh-settings-email", String(emailAlerts));
        window.localStorage.setItem("sh-settings-push", String(pushAlerts));
        window.localStorage.setItem("sh-settings-critical", String(criticalOnly));
        window.localStorage.setItem("sh-settings-threshold", String(threshold));
        toast.success("Đã lưu cài đặt thông báo thành công!");
      } catch (e: any) {
        toast.error("Lỗi khi lưu cài đặt thông báo: " + e.message);
      }
    }
  };

  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast.error("Vui lòng đăng nhập để thực hiện tải ảnh lên!");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp ảnh hợp lệ!");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Dung lượng ảnh tối đa là 2MB!");
      return;
    }

    setUploading(true);
    try {
      // 1. Check if "avatars" bucket exists
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) throw bucketError;
      
      const bucketExists = buckets?.some((b) => b.name === "avatars");
      if (!bucketExists) {
        await supabase.storage.createBucket("avatars", {
          public: true,
          fileSizeLimit: 2 * 1024 * 1024,
          allowedMimeTypes: ["image/*"],
        });
      }

      // 2. Upload file
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatar-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 3. Get URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setProfile((p) => ({ ...p, anhdaidien: publicUrl }));
      toast.success("Tải ảnh đại diện mới thành công! Nhớ nhấn 'Lưu thông tin cá nhân' để lưu lại thay đổi.");
    } catch (err: any) {
      console.error("Lỗi khi tải ảnh đại diện lên Storage, thử dùng Base64:", err);
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfile((p) => ({ ...p, anhdaidien: reader.result as string }));
          toast.info("Ảnh đại diện đã được lưu dưới dạng chuỗi Base64 do cấu hình Storage hạn chế.");
        };
        reader.readAsDataURL(file);
      } catch (base64Err) {
        toast.error("Không thể xử lý ảnh: " + err.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Không thể xác nhận phiên người dùng!");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("nguoidung")
        .update({
          hoten: profile.hoten,
          sodienthoai: profile.sodienthoai,
          github: profile.github,
          figma: profile.figma,
          ngaysinh: profile.ngaysinh || null,
          anhdaidien: profile.anhdaidien,
          linkpdf: profile.linkpdf
        })
        .eq("auth_uid", user.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Không thể cập nhật thông tin. Vui lòng kiểm tra lại quyền RLS!");
      }
      
      await supabase.from("nhatkyhoatdong").insert([{
        idnguoidung: profile.idnguoidung,
        hanhdong: `Cấu hình: Cập nhật thông tin cá nhân của người dùng (${profile.hoten})`
      }]);
      
      toast.success("Cập nhật thông tin hồ sơ thành công!");
      
      // Re-fetch data mới nhất
      await loadOrCreateProfile(user);
    } catch (err: any) {
      toast.error("Lỗi khi cập nhật hồ sơ: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Đang ở chế độ khách, không thể đổi mật khẩu!");
      return;
    }
    const newPwd = (document.getElementById("new") as HTMLInputElement)?.value;
    const confirmPwd = (document.getElementById("confirm") as HTMLInputElement)?.value;

    if (!newPwd || newPwd.length < 6) {
      toast.error("Mật khẩu mới phải từ 6 ký tự trở lên!");
      return;
    }

    if (newPwd !== confirmPwd) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success("Đã đổi mật khẩu thành công!");
      
      // Clear inputs
      const oldInput = document.getElementById("old") as HTMLInputElement;
      const newInput = document.getElementById("new") as HTMLInputElement;
      const confirmInput = document.getElementById("confirm") as HTMLInputElement;
      if (oldInput) oldInput.value = "";
      if (newInput) newInput.value = "";
      if (confirmInput) confirmInput.value = "";
    } catch (err: any) {
      toast.error("Lỗi khi đổi mật khẩu: " + err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      toast.error("Không thể xác định phiên người dùng!");
      return;
    }
    const confirmDelete = window.confirm("Hành động này sẽ xóa vĩnh viễn hồ sơ của bạn khỏi hệ thống Smart Home và đăng xuất. Bạn có chắc chắn muốn xóa tài khoản này không?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("nguoidung")
        .delete()
        .eq("auth_uid", user.id);

      if (error) {
        toast.error("Không thể xóa tài khoản từ database: " + error.message);
        return;
      }

      toast.success("Xóa tài khoản thành công!");
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error("Lỗi hệ thống khi xóa tài khoản: " + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Đã đăng xuất thành công!");
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error("Lỗi khi đăng xuất: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
          <p className="mt-2 text-sm text-slate-500">Đang tải cấu hình...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_-10%_-10%,#dbe7ff_0%,transparent_60%),radial-gradient(900px_500px_at_110%_10%,#ffe4f0_0%,transparent_55%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)] p-6 lg:p-10 text-slate-800">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" /> Về Bảng điều khiển
            </Link>
            {user && (
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
              >
                <User className="h-4 w-4 text-slate-500" /> Hồ sơ cá nhân
              </Link>
            )}
          </div>

          {!user && (
            <div className="flex-1 min-w-[280px] flex items-center justify-between gap-4 rounded-full border border-amber-200 bg-amber-50/80 px-4 py-2 text-xs text-amber-800 shadow-sm backdrop-blur-lg">
              <span>
                <span className="font-bold">Chế độ khách:</span> Đăng nhập để chỉnh sửa cài đặt tài khoản!
              </span>
              <Link to="/login" className="font-bold text-indigo-600 hover:underline">Đăng nhập</Link>
            </div>
          )}
          {user && (
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
            </Button>
          )}
        </div>

        {/* Header Summary card */}
        <GlassCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Cài đặt tài khoản</h1>
              <p className="text-sm text-slate-500 mt-1">Cấu hình mật khẩu, thông báo và quyền bảo mật.</p>
            </div>
            <div className="rounded-2xl bg-white/60 p-4 border border-white/80 max-w-sm">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Đang đăng nhập với</div>
              <div className="text-sm font-bold text-slate-900 mt-1">{profile.hoten || "Người dùng"}</div>
              <div className="text-xs text-slate-500">{profile.email}</div>
            </div>
          </div>
        </GlassCard>

        {/* Personal Profile Edit Form */}
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-slate-900">Thông tin cá nhân</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">Cập nhật thông tin chi tiết tài khoản của bạn để đồng bộ trên hệ thống.</p>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSaveProfile}>
            <div className="space-y-1.5">
              <Label htmlFor="fullname">Họ và tên</Label>
              <Input
                id="fullname"
                value={profile.hoten}
                onChange={(e) => setProfile(p => ({ ...p, hoten: e.target.value }))}
                className="bg-white/80 h-10 text-slate-900"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.email}
                className="bg-white/80 h-10 text-slate-400 cursor-not-allowed"
                disabled
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input
                id="phone"
                value={profile.sodienthoai}
                onChange={(e) => setProfile(p => ({ ...p, sodienthoai: e.target.value }))}
                className="bg-white/80 h-10 text-slate-900"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dob">Ngày sinh</Label>
              <Input
                id="dob"
                type="date"
                value={profile.ngaysinh}
                onChange={(e) => setProfile(p => ({ ...p, ngaysinh: e.target.value }))}
                className="bg-white/80 h-10 text-slate-900"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="github">GitHub Username</Label>
              <Input
                id="github"
                value={profile.github}
                onChange={(e) => setProfile(p => ({ ...p, github: e.target.value }))}
                className="bg-white/80 h-10 text-slate-900"
                placeholder="Ví dụ: mygithubusername"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="figma">Figma Username</Label>
              <Input
                id="figma"
                value={profile.figma}
                onChange={(e) => setProfile(p => ({ ...p, figma: e.target.value }))}
                className="bg-white/80 h-10 text-slate-900"
                placeholder="Ví dụ: myfigmausername"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="avatar-file" className="font-semibold text-slate-700">Ảnh đại diện</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-center rounded-2xl border border-white/60 bg-white/60 p-4">
                <div className="relative group shrink-0">
                  <div className="overflow-hidden rounded-full h-20 w-20 border-2 border-indigo-500 shadow-md">
                    <img src={profile.anhdaidien || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop"} alt="Avatar preview" className="h-full w-full object-cover" />
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center gap-2">
                    <input
                      id="avatar-file"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => document.getElementById("avatar-file")?.click()}
                      className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 cursor-pointer h-9 px-4 text-xs font-semibold"
                    >
                      {uploading ? "Đang tải lên..." : "Tải ảnh từ thiết bị"}
                    </Button>
                    <span className="text-[10px] text-slate-500">Tối đa 2MB (JPG, PNG, GIF)</span>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="avatar" className="text-[11px] font-medium text-slate-500">Hoặc điền URL ảnh trực tiếp</Label>
                    <Input
                      id="avatar"
                      value={profile.anhdaidien}
                      onChange={(e) => setProfile(p => ({ ...p, anhdaidien: e.target.value }))}
                      className="bg-white/80 h-9 text-xs text-slate-700"
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="linkpdf">Đường dẫn tài liệu PDF</Label>
              <Input
                id="linkpdf"
                value={profile.linkpdf}
                onChange={(e) => setProfile(p => ({ ...p, linkpdf: e.target.value }))}
                className="bg-white/80 h-10 text-slate-900"
                placeholder="https://example.com/tailieu.pdf"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800 h-10 px-6 cursor-pointer">
                {saving ? "Đang lưu..." : "Lưu thông tin cá nhân"}
              </Button>
            </div>
          </form>
        </GlassCard>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Change password */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="h-5 w-5 text-indigo-500" />
              <h3 className="text-lg font-bold text-slate-900">Đổi mật khẩu</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">Bạn nên sử dụng mật khẩu mạnh gồm chữ thường, chữ hoa, số và ký tự đặc biệt.</p>
            <form className="space-y-3.5" onSubmit={handleUpdatePassword}>
              <div className="space-y-1.5">
                <Label htmlFor="old">Mật khẩu hiện tại</Label>
                <Input id="old" type="password" className="bg-white/80 h-10 text-slate-900" placeholder="••••••••" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new">Mật khẩu mới</Label>
                <Input id="new" type="password" className="bg-white/80 h-10 text-slate-900" placeholder="Ít nhất 6 ký tự" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
                <Input id="confirm" type="password" className="bg-white/80 h-10 text-slate-900" placeholder="Nhập lại mật khẩu mới" />
              </div>
              <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800 h-10 cursor-pointer">
                Cập nhật mật khẩu
              </Button>
            </form>
          </GlassCard>

          {/* Notification settings */}
          <GlassCard className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-slate-900">Cấu hình nhận cảnh báo</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">Bật tắt các kênh truyền thông tin báo động khi hệ thống vượt ngưỡng an toàn.</p>
              
              <div className="space-y-4">
                <ToggleRow
                  label="Nhận cảnh báo qua email"
                  hint="Gửi thông tin tới email đã đăng ký khi cảm biến vượt ngưỡng"
                  value={emailAlerts}
                  onChange={setEmailAlerts}
                />
                <ToggleRow
                  label="Thông báo đẩy (Push notification)"
                  hint="Hiện tin nhắn nổi trong ứng dụng khi có sự kiện khẩn cấp"
                  value={pushAlerts}
                  onChange={setPushAlerts}
                />
                <ToggleRow
                  label="Chỉ thông báo sự kiện nghiêm trọng"
                  hint="Bỏ qua các thông tin cảnh báo nhẹ/thông tin hệ thống thông thường"
                  value={criticalOnly}
                  onChange={setCriticalOnly}
                />
                <div className="rounded-2xl border border-white/70 bg-white/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-900">Ngưỡng nhiệt độ báo động riêng</div>
                      <div className="text-xs text-slate-500">Gửi mail lập tức khi nhiệt độ phòng vượt giá trị này</div>
                    </div>
                    <div className="text-lg font-bold text-slate-900 tabular-nums">
                      {threshold}°C
                    </div>
                  </div>
                  <Slider value={[threshold]} min={20} max={40} step={1} onValueChange={(v) => setThreshold(v[0])} className="mt-4" />
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveNotifications}
                className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30 hover:opacity-90 cursor-pointer h-10 px-6"
              >
                Lưu cài đặt thông báo
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* Danger Zone */}
        {user && (
          <GlassCard className="border-rose-200/50 bg-rose-50/10">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-rose-500" />
              <h3 className="text-lg font-bold text-rose-600">Vùng nguy hiểm</h3>
            </div>
            <p className="text-xs text-slate-500">
              Hành động này sẽ xóa vĩnh viễn hồ sơ và tài khoản của bạn khỏi hệ thống Smart Home. Thao tác này không thể hoàn tác.
            </p>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleDeleteAccount}
                className="bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 cursor-pointer"
              >
                Xóa tài khoản
              </Button>
            </div>
          </GlassCard>
        )}
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
