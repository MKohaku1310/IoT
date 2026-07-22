import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  User,
  Shield,
  KeyRound,
  LogOut,
  Sliders,
  ShieldAlert,
  Clock,
  Settings,
  Cpu,
  CheckCircle2,
  Lock,
  Unlock,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/glass-card";
import { SettingsTab } from "@/components/dashboard/shared/SettingsTab";
import { NodeTechnicalSpecs } from "@/components/dashboard/shared/NodeTechnicalSpecs";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Cài đặt tài khoản | Smart Home IoT" },
      {
        name: "description",
        content: "Cấu hình bảo mật và đổi mật khẩu tài khoản.",
      },
      { property: "og:title", content: "Cài đặt tài khoản | Smart Home IoT" },
      { property: "og:description", content: "Trang cấu hình bảo mật tài khoản hệ thống Smart Home." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState<any>(null);
  const isFetchingRef = useRef(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const [activeTab, setActiveTab] = useState<"profile" | "system" | "consent" | "danger">("profile");

  // Remote Access Consent State for Buyer
  const [consentActive, setConsentActive] = useState(false);
  const [consentTimeLeft, setConsentTimeLeft] = useState<number | null>(null);
  const [consentExpiresAt, setConsentExpiresAt] = useState<string | null>(null);

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
    vaitro: "admin" | "buyer" | string;
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
    vaitro: "buyer",
    thoigian: new Date().toISOString()
  });

  const checkActiveConsent = async (id: number) => {
    try {
      const { data, error } = await supabase
        .from("remote_access_consent")
        .select("*")
        .eq("idnguoidung", id)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setConsentActive(true);
        setConsentExpiresAt(data.expires_at);
      } else {
        setConsentActive(false);
        setConsentExpiresAt(null);
      }
    } catch (e) {
      console.error("Lỗi khi kiểm tra consent:", e);
    }
  };

  useEffect(() => {
    if (!consentExpiresAt) {
      setConsentTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const diff = new Date(consentExpiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setConsentActive(false);
        setConsentExpiresAt(null);
        setConsentTimeLeft(null);
        clearInterval(interval);
      } else {
        setConsentTimeLeft(Math.floor(diff / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [consentExpiresAt]);

  const loadOrCreateProfile = async (authUser: any) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
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
          vaitro: data.vaitro || "buyer",
          thoigian: data.thoigian || new Date().toISOString()
        });
        checkActiveConsent(data.idnguoidung);
      } else {
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
            vaitro: "buyer",
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
            vaitro: insertedData.vaitro || "buyer",
            thoigian: insertedData.thoigian || new Date().toISOString()
          });
          checkActiveConsent(insertedData.idnguoidung);
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
          toast.info("Ảnh đại diện đã được lưu dưới dạng chuỗi Base64.");
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
        loai_thongbao: 'user_action',
        hanhdong: `Cấu hình: Cập nhật thông tin cá nhân của người dùng (${profile.hoten})`
      }]);
      
      toast.success("Cập nhật thông tin hồ sơ thành công!");
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

    if (!oldPwd) {
      toast.error("Vui lòng nhập mật khẩu hiện tại!");
      return;
    }

    if (!newPwd || newPwd.length < 6) {
      toast.error("Mật khẩu mới phải từ 6 ký tự trở lên!");
      return;
    }

    if (newPwd !== confirmPwd) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPwd,
      });
      if (signInError) {
        toast.error("Mật khẩu hiện tại không đúng!");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success("Đã đổi mật khẩu thành công!");
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err: any) {
      toast.error("Lỗi khi đổi mật khẩu: " + err.message);
    }
  };

  const handleGrantConsent = async () => {
    if (!profile.idnguoidung) return;
    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("remote_access_consent")
        .insert([{
          idnguoidung: profile.idnguoidung,
          expires_at: expiresAt,
          is_active: true
        }]);

      if (error) throw error;
      setConsentActive(true);
      setConsentExpiresAt(expiresAt);
      toast.success("✓ Đã cấp quyền chẩn đoán từ xa cho Kỹ thuật viên (Hiệu lực: 30 phút)!");

      await supabase.from("audit_log").insert([{
        idnguoidung: profile.idnguoidung,
        hoten: profile.hoten,
        hanhdong: "Cấp quyền Remote Diagnostics",
        chi_tiet: `Khách hàng ${profile.email} cấp quyền chẩn đoán từ xa 30 phút`
      }]);
    } catch (e: any) {
      toast.error("Lỗi cấp quyền chẩn đoán: " + e.message);
    }
  };

  const handleRevokeConsent = async () => {
    if (!profile.idnguoidung) return;
    try {
      const { error } = await supabase
        .from("remote_access_consent")
        .update({ is_active: false })
        .eq("idnguoidung", profile.idnguoidung)
        .eq("is_active", true);

      if (error) throw error;
      setConsentActive(false);
      setConsentExpiresAt(null);
      setConsentTimeLeft(null);
      toast.success("✓ Đã thu hồi quyền chẩn đoán từ xa thành công!");

      await supabase.from("audit_log").insert([{
        idnguoidung: profile.idnguoidung,
        hoten: profile.hoten,
        hanhdong: "Thu hồi quyền Remote Diagnostics",
        chi_tiet: `Khách hàng ${profile.email} thu hồi quyền chẩn đoán từ xa trước thời hạn`
      }]);
    } catch (e: any) {
      toast.error("Lỗi thu hồi quyền: " + e.message);
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
          <p className="mt-2 text-sm text-slate-500">Đang tải cấu hình cài đặt...</p>
        </div>
      </div>
    );
  }

  const isAdmin = profile.vaitro === "admin";

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_-10%_-10%,#dbe7ff_0%,transparent_60%),radial-gradient(900px_500px_at_110%_10%,#ffe4f0_0%,transparent_55%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)] dark:bg-[radial-gradient(1200px_600px_at_-10%_-10%,#1e1b4b_0%,transparent_60%),radial-gradient(900px_500px_at_110%_10%,#31102b_0%,transparent_55%),linear-gradient(180deg,#0f172a_0%,#020617_100%)] p-6 lg:p-10 text-slate-800 dark:text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur transition hover:bg-white dark:hover:bg-slate-800 hover:scale-105 active:scale-95 duration-200"
            >
              <ArrowLeft className="h-4 w-4" /> Về Bảng điều khiển
            </Link>
            {user && (
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 rounded-full border border-white/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur transition hover:bg-white dark:hover:bg-slate-800 hover:scale-105 active:scale-95 duration-200"
              >
                <User className="h-4 w-4 text-slate-500 dark:text-slate-400" /> Xem Hồ sơ cá nhân
              </Link>
            )}
          </div>

          {!user && (
            <div className="flex-1 min-w-[280px] flex items-center justify-between gap-4 rounded-full border border-amber-200 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-950/40 px-4 py-2 text-xs text-amber-800 dark:text-amber-300 shadow-sm backdrop-blur-lg">
              <span>
                <span className="font-bold">Chế độ khách:</span> Đăng nhập để chỉnh sửa cài đặt tài khoản!
              </span>
              <Link to="/login" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Đăng nhập</Link>
            </div>
          )}
          {user && (
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-700 rounded-full px-5 hover:scale-105 active:scale-95 duration-200 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
            </Button>
          )}
        </div>

        {/* Role-tailored Header Banner */}
        <GlassCard className="p-6 relative overflow-hidden border-indigo-100/50 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "grid h-12 w-12 place-items-center rounded-2xl text-white shadow-lg",
                  isAdmin ? "bg-gradient-to-br from-indigo-600 to-purple-600 shadow-indigo-500/30" : "bg-gradient-to-br from-sky-500 to-indigo-500 shadow-sky-500/30"
                )}>
                  {isAdmin ? <Shield className="h-6 w-6" /> : <Settings className="h-6 w-6" />}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {isAdmin ? "Trung tâm Cấu hình & Vận hành Quản trị" : "Cài đặt Tài khoản & Nhà thông minh"}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAdmin
                      ? "Cấu hình hạ tầng MQTT, trợ lý AI Gemini, bảo trì hệ thống và tham số giám sát Fleet toàn quốc."
                      : "Cấu hình thông tin cá nhân, cài đặt thiết bị cảm biến gia đình và cấp quyền chẩn đoán từ xa."}
                  </p>
                </div>
              </div>
            </div>

            {/* Role Badge and User Quick Info */}
            <div className="flex items-center gap-3 self-start md:self-auto">
              <Badge className={cn(
                "rounded-2xl px-4 py-2 text-xs font-bold shadow-sm flex items-center gap-1.5 border",
                isAdmin ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800" : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800"
              )}>
                <Shield className="h-4 w-4" />
                {isAdmin ? "Quản trị viên Tối cao (Admin)" : "Gia chủ Smart Home (Buyer)"}
              </Badge>
              <div className="hidden sm:block rounded-2xl bg-white/70 dark:bg-slate-900/80 px-4 py-2 border border-slate-200/60 dark:border-slate-800 shadow-sm text-right">
                <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Tài khoản</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[160px]">{profile.hoten || profile.email}</div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Role-Specific Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer select-none",
              activeTab === "profile"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md shadow-slate-900/20 scale-105"
                : "bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/60 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:border-slate-800"
            )}
          >
            <User className="h-4 w-4" />
            {isAdmin ? "Hồ sơ & Mật khẩu Admin" : "Thông tin & Mật khẩu Cá nhân"}
          </button>

          <button
            onClick={() => setActiveTab("system")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer select-none",
              activeTab === "system"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-105"
                : "bg-white/70 text-slate-600 hover:bg-white hover:text-indigo-600 border border-slate-200/60 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400 dark:border-slate-800"
            )}
          >
            <Sliders className="h-4 w-4" />
            {isAdmin ? "Cấu hình Vận hành & Hệ thống" : "Cài đặt Thiết bị & Tự động hóa"}
          </button>

          {!isAdmin && (
            <button
              onClick={() => setActiveTab("consent")}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer select-none",
                activeTab === "consent"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-105"
                  : "bg-white/70 text-slate-600 hover:bg-white hover:text-emerald-600 border border-slate-200/60 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-emerald-400 dark:border-slate-800"
              )}
            >
              <ShieldAlert className="h-4 w-4" />
              Quyền Chẩn đoán từ xa (Consent)
              {consentActive && (
                <span className="h-2 w-2 rounded-full bg-emerald-300 animate-ping ml-1" />
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab("danger")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer select-none ml-auto",
              activeTab === "danger"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/25 scale-105"
                : "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
            )}
          >
            <ShieldAlert className="h-4 w-4" />
            {isAdmin ? "Bảo mật & Quyền Admin" : "Vùng nguy hiểm"}
          </button>
        </div>

        {/* ================= TAB 1: PERSONAL PROFILE & PASSWORD ================= */}
        {activeTab === "profile" && (
          <div className="space-y-6 animate-fade-in">
            {/* Personal Profile Form */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isAdmin ? "Thông tin Tài khoản Quản trị viên" : "Thông tin Cá nhân Gia chủ"}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                {isAdmin
                  ? "Cập nhật thông tin nhận dạng và phương thức liên hệ chính thức của Quản trị viên."
                  : "Cập nhật thông tin cá nhân của bạn để đồng bộ trên các báo cáo và thiết bị Smart Home."}
              </p>

              <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSaveProfile}>
                <div className="space-y-1.5">
                  <Label htmlFor="fullname" className="text-slate-700 dark:text-slate-300">Họ và tên</Label>
                  <Input
                    id="fullname"
                    value={profile.hoten}
                    onChange={(e) => setProfile(p => ({ ...p, hoten: e.target.value }))}
                    className="bg-white/80 dark:bg-slate-900 h-10 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email đăng nhập</Label>
                  <Input
                    id="email"
                    value={profile.email}
                    className="bg-white/80 dark:bg-slate-900/50 h-10 text-slate-500 dark:text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-800"
                    disabled
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300">Số điện thoại liên hệ</Label>
                  <Input
                    id="phone"
                    value={profile.sodienthoai}
                    onChange={(e) => setProfile(p => ({ ...p, sodienthoai: e.target.value }))}
                    className="bg-white/80 dark:bg-slate-900 h-10 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"
                    placeholder="Ví dụ: 0987654321"
                  />
                </div>
                {!isAdmin && (
                  <div className="space-y-1.5">
                    <Label htmlFor="dob" className="text-slate-700 dark:text-slate-300">Ngày sinh</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={profile.ngaysinh}
                      onChange={(e) => setProfile(p => ({ ...p, ngaysinh: e.target.value }))}
                      className="bg-white/80 dark:bg-slate-900 h-10 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"
                    />
                  </div>
                )}
                {!isAdmin && (
                  <div className="space-y-1.5">
                    <Label htmlFor="github" className="text-slate-700 dark:text-slate-300">GitHub Username</Label>
                    <Input
                      id="github"
                      value={profile.github}
                      onChange={(e) => setProfile(p => ({ ...p, github: e.target.value }))}
                      className="bg-white/80 dark:bg-slate-900 h-10 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"
                      placeholder="Ví dụ: mygithubusername"
                    />
                  </div>
                )}
                {!isAdmin && (
                  <div className="space-y-1.5">
                    <Label htmlFor="figma" className="text-slate-700 dark:text-slate-300">Figma Username</Label>
                    <Input
                      id="figma"
                      value={profile.figma}
                      onChange={(e) => setProfile(p => ({ ...p, figma: e.target.value }))}
                      className="bg-white/80 dark:bg-slate-900 h-10 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"
                      placeholder="Ví dụ: myfigmausername"
                    />
                  </div>
                )}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="avatar-file" className="font-semibold text-slate-700 dark:text-slate-300">Ảnh đại diện</Label>
                  <div className="flex flex-col sm:flex-row gap-4 items-center rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-4">
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
                          className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer h-9 px-4 text-xs font-semibold"
                        >
                          {uploading ? "Đang tải lên..." : "Tải ảnh từ thiết bị"}
                        </Button>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Tối đa 2MB (JPG, PNG, GIF)</span>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="avatar" className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Hoặc điền URL ảnh trực tiếp</Label>
                        <Input
                          id="avatar"
                          value={profile.anhdaidien}
                          onChange={(e) => setProfile(p => ({ ...p, anhdaidien: e.target.value }))}
                          className="bg-white/80 dark:bg-slate-900 h-9 text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 flex justify-end pt-2">
                  <Button type="submit" disabled={saving} className="bg-slate-900 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 hover:bg-slate-800 h-10 px-6 cursor-pointer rounded-xl font-bold">
                    {saving ? "Đang lưu..." : "Lưu thông tin cá nhân"}
                  </Button>
                </div>
              </form>
            </GlassCard>

            {/* Change Password Card */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="h-5 w-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Đổi mật khẩu bảo mật</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Đổi mật khẩu định kỳ giúp tăng cường an toàn thông tin tài khoản và thiết bị phần cứng.
              </p>
              <form className="space-y-4 max-w-xl" onSubmit={handleUpdatePassword}>
                <div className="space-y-1.5">
                  <Label htmlFor="old" className="text-slate-700 dark:text-slate-300">Mật khẩu hiện tại</Label>
                  <Input id="old" type="password" className="bg-white/80 dark:bg-slate-900 h-10 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800" placeholder="••••••••" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="new" className="text-slate-700 dark:text-slate-300">Mật khẩu mới</Label>
                    <Input id="new" type="password" className="bg-white/80 dark:bg-slate-900 h-10 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800" placeholder="Ít nhất 6 ký tự" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm" className="text-slate-700 dark:text-slate-300">Xác nhận mật khẩu</Label>
                    <Input id="confirm" type="password" className="bg-white/80 dark:bg-slate-900 h-10 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800" placeholder="Nhập lại mật khẩu mới" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" className="bg-slate-900 text-white dark:bg-indigo-600 dark:hover:bg-indigo-700 hover:bg-slate-800 h-10 px-6 cursor-pointer rounded-xl font-bold">
                    Cập nhật mật khẩu mới
                  </Button>
                </div>
              </form>
            </GlassCard>
          </div>
        )}

        {/* ================= TAB 2: SYSTEM / DEVICE SETTINGS ================= */}
        {activeTab === "system" && (
          <div className="space-y-6 animate-fade-in">
            {/* Embedded Role-Based SettingsTab */}
            <SettingsTab currentUserRole={profile.vaitro} currentUser={profile} />

            {/* If Admin: also include Node Technical Specs & Hardware Monitor */}
            {isAdmin && (
              <div className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Thông số Kỹ thuật & Cấu hình Ngưỡng Hardware Nodes</h3>
                </div>
                <NodeTechnicalSpecs />
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: BUYER REMOTE DIAGNOSTICS CONSENT ================= */}
        {!isAdmin && activeTab === "consent" && (
          <div className="space-y-6 animate-fade-in">
            <GlassCard className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quản lý Quyền Chẩn đoán từ xa (Remote Diagnostics)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cho phép Admin / Kỹ thuật viên kết nối chẩn đoán và xử lý sự cố thiết bị khi có yêu cầu</p>
                  </div>
                </div>

                <Badge className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-bold border flex items-center gap-1.5",
                  consentActive ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800"
                )}>
                  <span className={cn("h-2 w-2 rounded-full", consentActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                  {consentActive ? "Đang bật chẩn đoán" : "Đang tắt chẩn đoán"}
                </Badge>
              </div>

              {consentActive ? (
                <div className="rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      Quyền chẩn đoán từ xa đang có hiệu lực trong 30 phút
                    </div>
                    {consentTimeLeft !== null && (
                      <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-white/80 dark:bg-slate-900 px-3 py-1 rounded-xl shadow-sm border border-emerald-200 dark:border-emerald-800">
                        <Clock className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                        Còn lại: {Math.floor(consentTimeLeft / 60)}m {consentTimeLeft % 60}s
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed">
                    Kỹ thuật viên hệ thống hiện có thể kiểm tra dữ liệu nhật ký vi điều khiển và đọc trạng thái phần cứng để hỗ trợ bạn trực tiếp.
                  </p>
                  <Button
                    onClick={handleRevokeConsent}
                    variant="outline"
                    className="border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 cursor-pointer font-bold text-xs h-9 px-4 rounded-xl"
                  >
                    Thu hồi quyền lập tức
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                    <Lock className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    Chẩn đoán từ xa đang được TẮT để bảo vệ sự riêng tư
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Khi bạn thông báo sự cố phần cứng, hãy nhấp vào nút bên dưới để cấp quyền tạm thời cho Kỹ thuật viên (hiệu lực tự động hết hạn sau 30 phút).
                  </p>
                  <Button
                    onClick={handleGrantConsent}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer font-bold text-xs h-10 px-5 rounded-xl"
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Cấp quyền chẩn đoán 30 phút
                  </Button>
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* ================= TAB 4: DANGER ZONE & SECURITY POLICIES ================= */}
        {activeTab === "danger" && (
          <div className="space-y-6 animate-fade-in">
            <GlassCard className={cn(
              "p-6 border",
              isAdmin ? "border-indigo-200 bg-indigo-50/20 dark:border-indigo-900 dark:bg-indigo-950/20" : "border-rose-200 bg-rose-50/20 dark:border-rose-900 dark:bg-rose-950/20"
            )}>
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className={cn("h-6 w-6", isAdmin ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400")} />
                <h3 className={cn("text-lg font-bold", isAdmin ? "text-indigo-900 dark:text-indigo-200" : "text-rose-900 dark:text-rose-200")}>
                  {isAdmin ? "Bảo mật & Quy chế Tài khoản Admin Tối cao" : "Vùng nguy hiểm - Xóa Tài khoản"}
                </h3>
              </div>

              {isAdmin ? (
                <div className="space-y-4 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                  <div className="p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-indigo-100 dark:border-indigo-950 shadow-sm space-y-2">
                    <div className="font-bold text-sm text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Chính sách Bảo vệ Tài khoản Quản trị
                    </div>
                    <p>
                      🔒 Tài khoản Quản trị viên (Admin) sở hữu toàn bộ quyền vận hành hệ thống, phê duyệt Node ESP32, cấu hình Broker MQTT và xử lý ticket sự cố.
                    </p>
                    <p>
                      Để đảm bảo tính liên tục và an toàn của hệ thống Smart Home, tài khoản Admin không được phép tự xóa thủ công từ giao diện người dùng.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Hành động xóa tài khoản sẽ hủy toàn bộ thông tin cá nhân và đăng xuất khỏi hệ thống Smart Home. Thao tác này không thể hoàn tác.
                  </p>
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleDeleteAccount}
                      className="bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20 cursor-pointer font-bold text-xs h-10 px-6 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Xóa vĩnh viễn tài khoản của tôi
                    </Button>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        )}

      </div>
    </div>
  );
}
