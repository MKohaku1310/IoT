import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Shield,
  Activity,
  Bell,
  Cpu,
  CheckCircle2,
  FileText,
  LogOut,
  Settings,
  Phone,
  Github,
  ExternalLink,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Hồ sơ người dùng | Smart Home IoT" },
      {
        name: "description",
        content: "Thông tin cá nhân, thiết bị đang quản lý và cấu hình thông báo.",
      },
      { property: "og:title", content: "Hồ sơ người dùng | Smart Home IoT" },
      { property: "og:description", content: "Trang hồ sơ người dùng hệ thống Smart Home." },
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [lastLivingTime, setLastLivingTime] = useState<Date | null>(null);
  const [lastBedroomTime, setLastBedroomTime] = useState<Date | null>(null);
  const [lastKitchenTime, setLastKitchenTime] = useState<Date | null>(null);

  const [nowTime, setNowTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const livingOnline = lastLivingTime ? (nowTime - lastLivingTime.getTime() < 30_000) : false;
  const bedroomOnline = lastBedroomTime ? (nowTime - lastBedroomTime.getTime() < 30_000) : false;
  const kitchenOnline = lastKitchenTime ? (nowTime - lastKitchenTime.getTime() < 30_000) : false;

  useEffect(() => {
    let active = true;
    const fetchLatestDeviceStatus = async () => {
      try {
        const { data: sensorRows, error } = await supabase
          .from("dulieucambien")
          .select("*")
          .order("thoigian", { ascending: false })
          .limit(30);

        if (!active) return;
        if (error) {
          console.error("Lỗi khi tải dữ liệu cảm biến cho trạng thái thiết bị:", error);
          return;
        }

        if (sensorRows && sensorRows.length > 0) {
          const livingRecord = sensorRows.find(r => r.cambien === "ESP32-S3-Node-01" || r.cambien === "ESP32" || !r.cambien);
          const bedroomRecord = sensorRows.find(r => r.cambien === "ESP32-S3-Node-02");
          const kitchenRecord = sensorRows.find(r => r.cambien === "ESP32-C3-Kitchen");

          if (livingRecord) setLastLivingTime(new Date(livingRecord.thoigian));
          if (bedroomRecord) setLastBedroomTime(new Date(bedroomRecord.thoigian));
          if (kitchenRecord) setLastKitchenTime(new Date(kitchenRecord.thoigian));
        }
      } catch (err) {
        console.error("Lỗi hệ thống khi tải trạng thái thiết bị:", err);
      }
    };

    fetchLatestDeviceStatus();
    const interval = setInterval(fetchLatestDeviceStatus, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

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
        // Tự động chuyển hướng về trang login nếu chưa đăng nhập
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
        // Tự động điều hướng về login khi mất phiên hoặc đăng xuất
        navigate({ to: "/login" });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const [deviceOpsCount, setDeviceOpsCount] = useState<number | string>("...");
  const [resolvedAlertsCount, setResolvedAlertsCount] = useState<number | string>("...");
  const [activeNodesCount, setActiveNodesCount] = useState<number | string>("...");
  const [uptimeDays, setUptimeDays] = useState<string>("...");

  useEffect(() => {
    let active = true;
    async function loadStats() {
      try {
        // 1. Thao tác thiết bị
        const { count: totalLogs } = await supabase
          .from("nhatkyhoatdong")
          .select("*", { count: "exact", head: true });

        // Count warning logs
        const { count: warningsCount } = await supabase
          .from("nhatkyhoatdong")
          .select("*", { count: "exact", head: true })
          .or("hanhdong.ilike.%vượt ngưỡng%,hanhdong.ilike.%Lỗi%,hanhdong.ilike.%Cảnh báo%,hanhdong.ilike.%Mất kết nối%");

        if (!active) return;

        const total = totalLogs || 0;
        const warns = warningsCount || 0;

        setDeviceOpsCount((total - warns).toLocaleString("vi-VN"));
        setResolvedAlertsCount(warns.toLocaleString("vi-VN"));

        // 2. Node đang quản lý
        const { count: denCount } = await supabase
          .from("den")
          .select("*", { count: "exact", head: true });
        
        if (!active) return;
        setActiveNodesCount(denCount || 3);

        // 3. Uptime hoạt động
        let earliestDate = profile.thoigian ? new Date(profile.thoigian) : new Date();
        const { data: firstSensor } = await supabase
          .from("dulieucambien")
          .select("thoigian")
          .order("thoigian", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (firstSensor && active) {
          const sensorDate = new Date(firstSensor.thoigian);
          if (sensorDate < earliestDate) {
            earliestDate = sensorDate;
          }
        }
        
        if (!active) return;
        const diffTime = Math.abs(new Date().getTime() - earliestDate.getTime());
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        setUptimeDays(`${diffDays} ngày`);
      } catch (err) {
        console.error("Lỗi khi tải thông số thống kê:", err);
      }
    }

    loadStats();
    return () => {
      active = false;
    };
  }, [profile.thoigian]);

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
          <p className="mt-2 text-sm text-slate-500">Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_-10%_-10%,#dbe7ff_0%,transparent_60%),radial-gradient(900px_500px_at_110%_10%,#ffe4f0_0%,transparent_55%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)] p-4 sm:p-6 lg:p-10 text-slate-800">
      <div className="mx-auto max-w-6xl space-y-6">
        
        {/* Top Navbar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:scale-105 active:scale-95 duration-200"
          >
            <ArrowLeft className="h-4 w-4" /> Về Bảng điều khiển
          </Link>
          
          <div className="flex items-center gap-3">
            {user && (
              <Button
                asChild
                className="bg-slate-900 text-white shadow-md hover:bg-slate-800 hover:scale-105 active:scale-95 duration-200 cursor-pointer rounded-full px-5"
              >
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" /> Chỉnh sửa hồ sơ
                </Link>
              </Button>
            )}
            {user && (
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-full px-5 hover:scale-105 active:scale-95 duration-200 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" /> Đăng xuất
              </Button>
            )}
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 animate-fade-in">
          
          {/* LEFT COLUMN: Showcase Card (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            <GlassCard className="overflow-hidden p-0 relative border-indigo-100/50 shadow-lg">
              {/* Card Banner Background */}
              <div className="h-32 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90 relative">
                {/* Abstract pattern shapes */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.15),transparent)]" />
              </div>
              
              <div className="px-6 pb-8 relative flex flex-col items-center">
                {/* Avatar with Ring */}
                <div className="relative -mt-16 mb-4">
                  <div className="h-32 w-32 rounded-full p-1.5 bg-white shadow-xl">
                    <div className="overflow-hidden rounded-full h-full w-full border-2 border-indigo-500/20 bg-slate-100">
                      <img
                        src={profile.anhdaidien || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop"}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  {/* Status Indicator */}
                  <span className="absolute bottom-1 right-2 flex h-5 w-5 rounded-full border-2 border-white bg-emerald-500 shadow-md">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  </span>
                </div>

                {/* Name and Role */}
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-center">{profile.hoten || "Người dùng"}</h2>
                <Badge className="mt-2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 font-semibold flex items-center gap-1 shadow-sm">
                  <Shield className="h-3.5 w-3.5" /> Quản trị viên
                </Badge>

                {/* Quick Info Grid */}
                <div className="mt-8 w-full space-y-4 border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-3 text-slate-700 hover:bg-slate-50/50 p-2.5 rounded-xl transition duration-150">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Mail className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Email</p>
                      <p className="text-sm font-semibold truncate">{profile.email || "Chưa cập nhật"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700 hover:bg-slate-50/50 p-2.5 rounded-xl transition duration-150">
                    <div className="h-9 w-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                      <Phone className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Số điện thoại</p>
                      <p className="text-sm font-semibold truncate">{profile.sodienthoai || "Chưa cấu hình"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700 hover:bg-slate-50/50 p-2.5 rounded-xl transition duration-150">
                    <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Calendar className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Ngày sinh</p>
                      <p className="text-sm font-semibold truncate">
                        {profile.ngaysinh ? new Date(profile.ngaysinh).toLocaleDateString("vi-VN", { day: 'numeric', month: 'long', year: 'numeric' }) : "Chưa cấu hình"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700 hover:bg-slate-50/50 p-2.5 rounded-xl transition duration-150">
                    <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <Calendar className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Ngày gia nhập</p>
                      <p className="text-sm font-semibold truncate">
                        {new Date(profile.thoigian).toLocaleDateString("vi-VN", { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Social Links & PDF Portfolio */}
                <div className="mt-6 w-full flex flex-col gap-2 border-t border-slate-100 pt-6">
                  {profile.github && (
                    <a
                      href={`https://github.com/${profile.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white/50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-indigo-50/50 hover:border-indigo-200"
                    >
                      <span className="flex items-center gap-2">
                        <Github className="h-4 w-4 text-slate-900" />
                        <span>GitHub: <span className="text-indigo-600 font-bold">@{profile.github}</span></span>
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </a>
                  )}

                  {profile.figma && (
                    <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white/50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm">
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-pink-500 animate-pulse" viewBox="0 0 38 57" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 0C8.5 0 0 8.5 0 19C0 24.3 2.2 29 5.8 32.4C2.2 35.8 0 40.5 0 45.8C0 56.3 8.5 64.8 19 64.8C24.3 64.8 29 62.6 32.4 59C36 62.6 40.7 64.8 46 64.8C56.5 64.8 65 56.3 65 45.8C65 40.5 62.8 35.8 59.2 32.4C62.8 29 65 24.3 65 19C65 8.5 56.5 0 46 0H19Z" fill="url(#figma_grad)" />
                          <defs>
                            <linearGradient id="figma_grad" x1="0" y1="0" x2="65" y2="64.8" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#F24E1E" />
                              <stop offset="0.25" stopColor="#FF7262" />
                              <stop offset="0.5" stopColor="#A259FF" />
                              <stop offset="0.75" stopColor="#1ABCFE" />
                              <stop offset="1" stopColor="#0ACF83" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <span>Figma: <span className="text-slate-900 font-bold">{profile.figma}</span></span>
                      </span>
                    </div>
                  )}

                  {profile.linkpdf && (
                    <a
                      href={profile.linkpdf}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] duration-150 cursor-pointer"
                    >
                      <FileText className="h-4.5 w-4.5" /> Xem Tài liệu PDF (CV)
                    </a>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>

          {/* RIGHT COLUMN: Statistics and Connected Devices (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Thao tác thiết bị", value: deviceOpsCount, icon: Activity, color: "from-indigo-500 to-sky-400" },
                { label: "Cảnh báo đã xử lý", value: resolvedAlertsCount, icon: Bell, color: "from-rose-500 to-orange-400" },
                { label: "Node đang quản lý", value: activeNodesCount, icon: Cpu, color: "from-emerald-500 to-teal-400" },
                { label: "Uptime hoạt động", value: uptimeDays, icon: CheckCircle2, color: "from-amber-400 to-yellow-300" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <GlassCard key={s.label} className="p-5 hover:translate-y-[-2px] transition-transform duration-200">
                    <div className={cn("grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", s.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-4 text-2xl font-bold text-slate-900 tabular-nums">{s.value}</div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">{s.label}</div>
                  </GlassCard>
                );
              })}
            </div>

            {/* Managed devices */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-5 w-5 text-indigo-500 animate-pulse" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Mạng lưới Nodes thông minh</h3>
                  <p className="text-xs text-slate-500">Các phần cứng ESP32 liên kết trực tiếp với tài khoản này</p>
                </div>
              </div>
              <ul className="mt-5 space-y-3">
                {[
                  { name: "ESP32-S3-Node-01 · Phòng khách", status: livingOnline ? "Online" : "Offline", devices: "Điều hòa, Quạt, Đèn, Cảm biến ánh sáng" },
                  { name: "ESP32-S3-Node-02 · Phòng ngủ", status: bedroomOnline ? "Online" : "Offline", devices: "Điều hòa, Đèn ngủ, Cảm biến nhiệt độ" },
                  { name: "ESP32-C3-Kitchen · Nhà bếp", status: kitchenOnline ? "Online" : "Offline", devices: "Quạt hút mùi, Đèn bếp, Cảm biến khí gas" },
                ].map((d) => (
                  <li key={d.name} className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/40 p-4 hover:bg-white/60 transition duration-150 shadow-sm">
                    <div className="min-w-0 pr-3">
                      <div className="text-sm font-semibold text-slate-900">{d.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{d.devices}</div>
                    </div>
                    <Badge
                      className={cn(
                        "rounded-full px-3 py-1 font-bold text-xs tracking-wide shrink-0 border",
                        d.status === "Online"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                          : "bg-rose-50 text-rose-700 border-rose-200/50",
                      )}
                    >
                      <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1.5", d.status === "Online" ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                      {d.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </GlassCard>

            {/* Permission Roles & Security Badge */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-5 w-5 text-indigo-500" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Quyền hạn hệ thống</h3>
                  <p className="text-xs text-slate-500">Mức độ phân quyền bảo mật tài khoản IoT</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {[
                  { desc: "Điều khiển thiết bị thời gian thực", active: true },
                  { desc: "Cấu hình tự động hóa & Ngưỡng", active: true },
                  { desc: "Xem & Truy xuất nhật ký hoạt động", active: true },
                  { desc: "Thêm/Xóa các phần cứng Nodes", active: true }
                ].map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/50 border border-slate-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-700">{p.desc}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

          </div>

        </div>

      </div>
    </div>
  );
}
