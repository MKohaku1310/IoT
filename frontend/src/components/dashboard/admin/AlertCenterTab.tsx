import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
  Settings,
  RefreshCw,
  Clock,
  Radio,
  Cpu,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type TechAlert = {
  idcanhbao: number;
  idnode: string;
  loai_loi: string;
  muc_do: "critical" | "warning" | "info";
  chi_tiet: string;
  trang_thai: "unresolved" | "resolved";
  thoigian: string;
  esp32_nodes?: {
    ten_phong: string;
    idnguoidung: number;
  };
};

export function AlertCenterTab() {
  const [alerts, setAlerts] = useState<TechAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("unresolved");
  const [levelFilter, setLevelFilter] = useState<"all" | "critical" | "warning" | "info">("all");

  // Sub Tab state
  const [activeSubTab, setActiveSubTab] = useState<"monitor" | "broadcast">("monitor");
  const [recentBroadcasts, setRecentBroadcasts] = useState<any[]>([]);

  // Thresholds state removed (moved to SettingsTab)

  // Broadcast Notification state
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastLevel, setBroadcastLevel] = useState<"info" | "warn" | "error">("info");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Guideline response state
  const [selectedAlertForGuideline, setSelectedAlertForGuideline] = useState<TechAlert | null>(null);
  const [guidelineMsg, setGuidelineMsg] = useState("");
  const [sendingGuideline, setSendingGuideline] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("canh_bao_ky_thuat")
        .select("*, esp32_nodes(ten_phong, idnguoidung)")
        .order("thoigian", { ascending: false });

      if (error) throw error;
      setAlerts(data || []);
    } catch (err: any) {
      console.error("Lỗi khi tải cảnh báo kỹ thuật:", err);
      toast.error("Lỗi tải trung tâm cảnh báo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const { data, error } = await supabase
        .from("nhatkyhoatdong")
        .select("*")
        .is("idnguoidung", null)
        .or("hanhdong.like.[Thông báo hệ thống]%,hanhdong.like.[Cảnh báo hệ thống]%,hanhdong.like.[Thông báo khẩn]%")
        .order("thoigian", { ascending: false })
        .limit(10);
      if (!error && data) {
        setRecentBroadcasts(data);
      }
    } catch (e) {
      console.error("Lỗi khi tải lịch sử phát thông báo:", e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchBroadcasts();

    // Subscribe to realtime technical alerts
    const channel = supabase
      .channel("tech-alerts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "canh_bao_ky_thuat" },
        () => {
          fetchAlerts();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "canh_bao_ky_thuat" },
        () => {
          fetchAlerts();
        }
      )
      .subscribe();

    // Subscribe to realtime nhatkyhoatdong for broadcasts
    const logChannel = supabase
      .channel("broadcasts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nhatkyhoatdong" },
        () => {
          fetchBroadcasts();
        }
      )
      .subscribe();

    // Config load removed (moved to SettingsTab)

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(logChannel);
    };
  }, []);

  const handleResolveAlert = async (id: number) => {
    try {
      const { error } = await supabase
        .from("canh_bao_ky_thuat")
        .update({ trang_thai: "resolved" })
        .eq("idcanhbao", id);

      if (error) throw error;
      toast.success("Đã đánh dấu xử lý sự cố kỹ thuật thành công!");
      
      // Auto write to admin audit log
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
            hanhdong: "Xử lý sự cố",
            chi_tiet: `Đã xác nhận xử lý cảnh báo kỹ thuật ID: ${id}`
          }]);
        }
      }
      fetchAlerts();
    } catch (err: any) {
      toast.error("Lỗi khi xử lý sự cố: " + err.message);
    }
  };

  // handleSaveConfig removed (moved to SettingsTab)

  const handleSendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setSendingBroadcast(true);
    try {
      // Tiền tố giúp Buyer NotificationsTab nhận dạng mức độ lỗi/cảnh báo/thông tin
      const prefix = broadcastLevel === "error"
        ? `[Thông báo khẩn] Lỗi hệ thống: ${broadcastMsg}`
        : broadcastLevel === "warn"
        ? `[Cảnh báo hệ thống] ${broadcastMsg}`
        : `[Thông báo hệ thống] ${broadcastMsg}`;

      const { error } = await supabase
        .from("nhatkyhoatdong")
        .insert([{
          hanhdong: prefix,
          idnguoidung: null, // phát cho toàn bộ user
          loai_thongbao: 'system_alert'
        }]);

      if (error) throw error;

      // Ghi audit log admin
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
            hanhdong: "Phát thông báo hệ thống",
            chi_tiet: `Phát thông báo cấp độ ${broadcastLevel}: ${broadcastMsg}`
          }]);
        }
      }

      toast.success("Đã phát thông báo thành công đến toàn bộ người dùng!");
      setBroadcastMsg("");
      fetchBroadcasts();
    } catch (err: any) {
      toast.error("Lỗi phát thông báo: " + err.message);
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleSendGuideline = async () => {
    if (!selectedAlertForGuideline || !guidelineMsg.trim()) return;
    setSendingGuideline(true);
    try {
      const alert = selectedAlertForGuideline;
      const targetUserId = alert.esp32_nodes?.idnguoidung;

      // 1. Đóng sự cố (đổi trạng thái sang resolved)
      const { error: alertErr } = await supabase
        .from("canh_bao_ky_thuat")
        .update({ trang_thai: "resolved" })
        .eq("idcanhbao", alert.idcanhbao);
      if (alertErr) throw alertErr;

      // 2. Ghi thông báo hướng dẫn sửa chữa vào nhật ký hoạt động của user đó để hiển thị trên NotificationsTab
      const errorLabel = alert.loai_loi === "mqtt_disconnect" 
        ? "Mất kết nối Node" 
        : alert.loai_loi === "cpu_overheat"
        ? "Quá nhiệt vi xử lý"
        : alert.loai_loi === "rssi_weak"
        ? "Sóng yếu"
        : alert.loai_loi;

      const prefix = `[Hướng dẫn sửa chữa] Lỗi ${errorLabel} tại phòng ${alert.esp32_nodes?.ten_phong || 'thiết bị'}: ${guidelineMsg}`;
      
      const { error: logErr } = await supabase
        .from("nhatkyhoatdong")
        .insert([{
          idnguoidung: targetUserId || null,
          hanhdong: prefix,
          loai_thongbao: 'admin_notification'
        }]);
      if (logErr) throw logErr;

      // 3. Ghi audit log admin
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
            hanhdong: "Gửi hướng dẫn sửa chữa",
            chi_tiet: `Đã phản hồi lỗi online và gửi hướng dẫn đến User ID=${targetUserId} cho lỗi Node ${alert.idnode}`
          }]);
        }
      }

      toast.success("Đã gửi hướng dẫn sửa chữa online đến người dùng thành công!");
      setSelectedAlertForGuideline(null);
      fetchAlerts();
    } catch (err: any) {
      toast.error("Lỗi gửi hướng dẫn: " + err.message);
    } finally {
      setSendingGuideline(false);
    }
  };

  const [alertPage, setAlertPage] = useState(1);
  const ALERT_PAGE_SIZE = 5;

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      // SYSTEM_CONFIG row is not a technical warning to be logged in list
      if (a.idnode === "SYSTEM_CONFIG") return false;
      const matchStatus = filter === "all" || a.trang_thai === filter;
      const matchLevel = levelFilter === "all" || a.muc_do === levelFilter;
      return matchStatus && matchLevel;
    });
  }, [alerts, filter, levelFilter]);

  const totalAlertPages = Math.max(1, Math.ceil(filteredAlerts.length / ALERT_PAGE_SIZE));
  const paginatedAlerts = useMemo(() => {
    return filteredAlerts.slice((alertPage - 1) * ALERT_PAGE_SIZE, alertPage * ALERT_PAGE_SIZE);
  }, [filteredAlerts, alertPage]);

  useEffect(() => {
    setAlertPage(1);
  }, [filter, levelFilter]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-indigo-500" />
            Trung tâm cảnh báo kỹ thuật (Technical Alert Center)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            Giám sát cảnh báo mất kết nối, cấu hình ngưỡng hệ thống và quản lý phát thông báo.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchAlerts();
            fetchBroadcasts();
          }}
          disabled={loading}
          className="border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900 cursor-pointer text-slate-800 dark:text-slate-200 font-bold"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {/* Sub Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm">
        <button
          onClick={() => setActiveSubTab("monitor")}
          className={`pb-2.5 font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "monitor"
              ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          }`}
        >
          <Settings className="h-4 w-4" />
          Giám sát & Cấu hình sự cố
          {activeSubTab === "monitor" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("broadcast")}
          className={`pb-2.5 font-bold transition-all relative cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "broadcast"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <Megaphone className="h-4 w-4" />
          Phát thông báo hệ thống
          {activeSubTab === "broadcast" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
          )}
        </button>
      </div>

      {/* TAB CONTENT: MONITORING */}
      {activeSubTab === "monitor" && (
        <div className="grid grid-cols-1 gap-6">
          {/* Full-width Alerts Logger */}
          <div className="space-y-4">
            <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={filter === "unresolved" ? "default" : "outline"}
                  onClick={() => setFilter("unresolved")}
                  className="text-xs px-3 cursor-pointer"
                >
                  Chưa xử lý
                </Button>
                <Button
                  size="sm"
                  variant={filter === "resolved" ? "default" : "outline"}
                  onClick={() => setFilter("resolved")}
                  className="text-xs px-3 cursor-pointer"
                >
                  Đã xử lý
                </Button>
                <Button
                  size="sm"
                  variant={filter === "all" ? "default" : "outline"}
                  onClick={() => setFilter("all")}
                  className="text-xs px-3 cursor-pointer"
                >
                  Tất cả
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Mức độ:</span>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value as any)}
                  className="text-xs border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900 p-1.5 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  <option value="all">Tất cả mức độ</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
            </GlassCard>

            {/* List technical warnings */}
            <div className="space-y-4">
              {loading && alerts.length === 0 ? (
                <div className="text-center py-12 text-slate-500 animate-pulse bg-white/50 rounded-3xl border border-white/70">
                  Đang tải dữ liệu cảnh báo kỹ thuật...
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="text-center py-12 text-slate-500 bg-white/60 dark:bg-slate-900/30 rounded-3xl border border-white/70 dark:border-slate-800">
                  Không có sự cố kỹ thuật nào cần xử lý.
                </div>
              ) : (
                <>
                  {paginatedAlerts.map((a) => {
                    const isResolved = a.trang_thai === "resolved";
                    return (
                      <GlassCard
                        key={a.idcanhbao}
                        className={`p-4 border transition-all ${
                          isResolved
                            ? "opacity-60 border-slate-100"
                            : a.muc_do === "critical"
                            ? "border-rose-200 bg-rose-50/20"
                            : a.muc_do === "warning"
                            ? "border-amber-200 bg-amber-50/10"
                            : "border-sky-100 bg-sky-50/10"
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Left Icon level */}
                          <div className="mt-0.5">
                            {a.muc_do === "critical" ? (
                              <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-950/20 text-rose-600 flex items-center justify-center">
                                <ShieldAlert className="h-4.5 w-4.5 animate-bounce" />
                              </div>
                            ) : a.muc_do === "warning" ? (
                              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                                <AlertTriangle className="h-4.5 w-4.5" />
                              </div>
                            ) : (
                              <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
                                <Info className="h-4.5 w-4.5" />
                              </div>
                            )}
                          </div>

                          {/* Content details */}
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                  Node: {a.idnode}
                                </span>
                                {a.esp32_nodes?.ten_phong && (
                                  <Badge className="bg-slate-100 text-slate-600 border-transparent dark:bg-slate-800 dark:text-slate-400 font-semibold px-2 py-0">
                                    {a.esp32_nodes.ten_phong}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {new Date(a.thoigian).toLocaleString("vi-VN")}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
                              {a.chi_tiet}
                            </p>
                          </div>

                          {/* Action Resolve & Feedback */}
                          {!isResolved && (
                            <div className="flex flex-col sm:flex-row gap-2 items-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAlertForGuideline(a);
                                  setGuidelineMsg("");
                                }}
                                className="text-xs cursor-pointer border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:hover:bg-indigo-950/30"
                              >
                                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                                Hẹn sửa / Phản hồi
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResolveAlert(a.idcanhbao)}
                                className="text-xs cursor-pointer border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:border-slate-800 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Xong
                              </Button>
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    );
                  })}

                  {/* Alert Pagination Footer */}
                  {totalAlertPages > 1 && (
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div>
                        Hiển thị {(alertPage - 1) * ALERT_PAGE_SIZE + 1} –{" "}
                        {Math.min(alertPage * ALERT_PAGE_SIZE, filteredAlerts.length)} trong tổng số{" "}
                        {filteredAlerts.length} cảnh báo
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={alertPage === 1}
                          onClick={() => setAlertPage((p) => p - 1)}
                          className="h-8 w-16 cursor-pointer border-slate-200 dark:border-slate-800"
                        >
                          Trước
                        </Button>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Trang {alertPage} / {totalAlertPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={alertPage === totalAlertPages}
                          onClick={() => setAlertPage((p) => p + 1)}
                          className="h-8 w-16 cursor-pointer border-slate-200 dark:border-slate-800"
                        >
                          Sau
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: BROADCAST SYSTEM */}
      {activeSubTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Composing announcement */}
          <div className="lg:col-span-2 space-y-4">
            <GlassCard className="p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <Megaphone className="h-4.5 w-4.5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Soạn thông điệp hệ thống</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nội dung thông báo:</label>
                  <textarea
                    placeholder="Nhập thông điệp, lịch bảo trì hệ thống hoặc hướng dẫn chung gửi đến toàn bộ người dùng..."
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    className="w-full h-32 border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950 p-3 rounded-2xl text-xs text-slate-800 dark:text-white font-medium resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cấp độ cảnh báo:</label>
                    <select
                      value={broadcastLevel}
                      onChange={(e) => setBroadcastLevel(e.target.value as any)}
                      className="w-full border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900 p-2.5 rounded-xl text-slate-800 dark:text-white text-xs font-semibold outline-none cursor-pointer"
                    >
                      <option value="info">Thông tin (Info)</option>
                      <option value="warn">Cảnh báo (Warning)</option>
                      <option value="error">Khẩn cấp (Critical / Error)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={handleSendBroadcast}
                      disabled={sendingBroadcast || !broadcastMsg.trim()}
                      className="w-full bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-700 hover:to-sky-600 text-white shadow-md shadow-indigo-500/25 cursor-pointer text-xs h-10 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingBroadcast ? "Đang phát..." : "Phát thông báo hệ thống"}
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Right Column: History of announcements */}
          <div className="space-y-4">
            <GlassCard className="p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <Clock className="h-4.5 w-4.5 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Lịch sử phát thông báo</h3>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {recentBroadcasts.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    Chưa có thông báo nào được phát trước đó.
                  </div>
                ) : (
                  recentBroadcasts.map((b) => {
                    const isError = b.hanhdong.includes("[Thông báo khẩn]");
                    const isWarn = b.hanhdong.includes("[Cảnh báo hệ thống]");
                    const levelLabel = isError ? "Khẩn cấp" : isWarn ? "Cảnh báo" : "Thông tin";
                    const cleanMsg = b.hanhdong
                      .replace("[Thông báo khẩn] Lỗi hệ thống: ", "")
                      .replace("[Cảnh báo hệ thống] ", "")
                      .replace("[Thông báo hệ thống] ", "");

                    return (
                      <div
                        key={b.idnhatky}
                        className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                          isError
                            ? "bg-rose-50/20 border-rose-200"
                            : isWarn
                            ? "bg-amber-50/10 border-amber-300"
                            : "bg-emerald-50/10 border-emerald-300"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${
                            isError
                              ? "bg-rose-100 text-rose-700"
                              : isWarn
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {levelLabel}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {new Date(b.thoigian).toLocaleTimeString("vi-VN")} - {new Date(b.thoigian).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {cleanMsg}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Dialog for repair guidelines */}
      {selectedAlertForGuideline && (
        <Dialog open={!!selectedAlertForGuideline} onOpenChange={(open) => !open && setSelectedAlertForGuideline(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">Hướng dẫn sửa chữa & Phản hồi lỗi online</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Gửi phản hồi chẩn đoán hoặc lên lịch sửa chữa trực tiếp cho người dùng của Node <b>{selectedAlertForGuideline.idnode}</b>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-3">
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 rounded-2xl text-xs space-y-1">
                <p className="font-semibold text-indigo-900 dark:text-indigo-300">Thông tin sự cố:</p>
                <p className="text-slate-600 dark:text-slate-400 font-medium">{selectedAlertForGuideline.chi_tiet}</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nội dung hướng dẫn / Lịch hẹn sửa:</label>
                <textarea
                  placeholder="Ví dụ: Kỹ thuật viên đã đánh giá lỗi online. Mất kết nối do router Wi-Fi phòng khách bị ngắt nguồn. Kỹ thuật sẽ ghé hỗ trợ lúc 14h00 hôm nay..."
                  value={guidelineMsg}
                  onChange={(e) => setGuidelineMsg(e.target.value)}
                  className="w-full h-24 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 rounded-2xl text-xs text-slate-800 dark:text-white font-medium"
                />
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAlertForGuideline(null)}
                className="text-xs cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleSendGuideline}
                disabled={sendingGuideline || !guidelineMsg.trim()}
                className="bg-indigo-600 hover:bg-indigo-750 text-white text-xs cursor-pointer font-semibold"
              >
                {sendingGuideline ? "Đang gửi..." : "Gửi thông báo & Đóng lỗi"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
