import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LifeBuoy,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";

type SupportTicket = {
  idticket: number;
  idnguoidung: number;
  tieu_de: string;
  noi_dung: string;
  trang_thai: "new" | "processing" | "resolved";
  phan_hoi: string | null;
  thoigian: string;
  thoigian_capnhat: string;
};

export function SupportTab({ currentUser }: { currentUser: any }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userNodes, setUserNodes] = useState<any[]>([]);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedNode, setSelectedNode] = useState("");
  const [grantRemoteAccess, setGrantRemoteAccess] = useState(false);

  const fetchTickets = async () => {
    if (!currentUser?.idnguoidung) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ho_tro_tickets")
        .select("*")
        .eq("idnguoidung", currentUser.idnguoidung)
        .order("thoigian", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (e: any) {
      console.error("Lỗi khi tải ticket hỗ trợ:", e);
      toast.error("Không thể tải danh sách yêu cầu: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserNodes = async () => {
    if (!currentUser?.idnguoidung) return;
    try {
      // Fetch households user is a member of
      const { data: memberHhs } = await supabase
        .from("thanhvien_hogiadinh")
        .select("id_hogiadinh")
        .eq("idnguoidung", currentUser.idnguoidung);

      const hhIds = memberHhs?.map((m: any) => m.id_hogiadinh) || [];

      // Fetch nodes matching direct ownership or member households
      let query = supabase
        .from("esp32_nodes")
        .select("idnode, ten_phong, trang_thai, hogiadinh:hogiadinh(ten_nha)");

      if (hhIds.length > 0) {
        query = query.or(`idnguoidung.eq.${currentUser.idnguoidung},id_hogiadinh.in.(${hhIds.join(",")})`);
      } else {
        query = query.eq("idnguoidung", currentUser.idnguoidung);
      }

      const { data: nodesData } = await query;
      setUserNodes(nodesData || []);
    } catch (e: any) {
      console.error("Lỗi khi tải danh sách node:", e);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchUserNodes();

    // Lắng nghe thay đổi realtime trên bảng ho_tro_tickets cho riêng user này
    if (!currentUser?.idnguoidung) return;
    const ticketChan = supabase
      .channel(`user-tickets-${currentUser.idnguoidung}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ho_tro_tickets",
          filter: `idnguoidung=eq.${currentUser.idnguoidung}`,
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChan);
    };
  }, [currentUser]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.idnguoidung) {
      toast.error("Vui lòng đăng nhập để gửi yêu cầu hỗ trợ!");
      return;
    }
    if (!title.trim() || !content.trim()) {
      toast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung!");
      return;
    }

    setSubmitting(true);
    try {
      const noiDung = selectedNode
        ? JSON.stringify({ device: selectedNode, content: content.trim() })
        : content.trim();

      const { error } = await supabase.from("ho_tro_tickets").insert([
        {
          idnguoidung: currentUser.idnguoidung,
          tieu_de: title.trim(),
          noi_dung: noiDung,
          trang_thai: "new",
        },
      ]);

      if (error) throw error;

      // Nếu user chọn cấp quyền remote access, tạo record trong remote_access_consent
      if (grantRemoteAccess) {
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 phút
        const { error: consentError } = await supabase
          .from("remote_access_consent")
          .insert([{
            idnguoidung: currentUser.idnguoidung,
            expires_at: expiresAt,
            is_active: true,
          }]);

        if (consentError) {
          console.warn("Không thể tạo remote access consent:", consentError.message);
          // Không throw error vì ticket đã được gửi thành công
        } else {
          toast.info("✓ Đã cấp quyền chẩn đoán từ xa cho Admin trong 30 phút!");
        }
      }

      // Lưu nhatkyhoatdong cho user
      await supabase.from("nhatkyhoatdong").insert([
        {
          idnguoidung: currentUser.idnguoidung,
          loai_thongbao: 'user_to_admin',
          hanhdong: JSON.stringify({
            loai_nhatky: "user_action",
            loai_thao_tac: "support_ticket",
            description: `Gửi yêu cầu hỗ trợ kỹ thuật: "${title.trim()}"`,
            device: selectedNode || null,
            remote_access: grantRemoteAccess,
          }),
        },
      ]);

      toast.success("✓ Đã gửi yêu cầu hỗ trợ thành công! Kỹ thuật viên sẽ xử lý sớm nhất.");
      setTitle("");
      setContent("");
      setSelectedNode("");
      setGrantRemoteAccess(false);
      fetchTickets();
    } catch (err: any) {
      console.error("Lỗi gửi ticket:", err);
      toast.error("Lỗi gửi yêu cầu hỗ trợ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-indigo-500 animate-spin duration-3000" />
            Trung tâm Hỗ trợ Kỹ thuật & Báo sự cố
          </h2>
          <p className="text-xs text-slate-500">
            Gửi yêu cầu chẩn đoán và theo dõi trạng thái hỗ trợ lỗi trực tiếp từ các Admin/Kỹ thuật viên vận hành.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTickets}
          disabled={loading}
          className="border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form (lg:col-span-5) */}
        <div className="lg:col-span-5">
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <HelpCircle className="h-5 w-5 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tạo yêu cầu trợ giúp mới</h3>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ticket-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tiêu đề lỗi / Yêu cầu</Label>
                <Input
                  id="ticket-title"
                  placeholder="Ví dụ: Thiết bị AC không phản hồi tự động..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-white/80 dark:bg-slate-900 text-slate-900 dark:text-white text-xs h-10 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ticket-device" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Thiết bị gặp sự cố (Tùy chọn)</Label>
                <select
                  id="ticket-device"
                  value={selectedNode}
                  onChange={(e) => setSelectedNode(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900 p-2.5 rounded-xl text-slate-800 dark:text-white text-xs"
                >
                  <option value="">-- Không liên kết thiết bị cụ thể --</option>
                  {userNodes.map((n: any) => (
                    <option key={n.idnode} value={`${n.ten_phong} (${n.idnode})`}>
                      {n.hogiadinh?.ten_nha || "Nhà của tôi"} - {n.ten_phong} ({n.idnode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ticket-content" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Chi tiết sự cố</Label>
                <textarea
                  id="ticket-content"
                  placeholder="Mô tả kỹ tình trạng lỗi, ví dụ: Nhiệt độ đo được đã quá 32 độ từ cảm biến DHT nhưng điều hòa không tự bật, trạng thái kết nối MQTT của node vẫn báo Connected..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-32 border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 p-3 rounded-2xl text-xs text-slate-900 dark:text-white leading-relaxed resize-none"
                  required
                />
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/40">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="grant-remote-access"
                    checked={grantRemoteAccess}
                    onChange={(e) => setGrantRemoteAccess(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <Label htmlFor="grant-remote-access" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Cấp quyền chẩn đoán từ xa cho Admin
                  </Label>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Cho phép Admin truy cập phần cứng ESP32 của bạn trong 30 phút để chẩn đoán lỗi. Quyền sẽ tự động hết hạn sau 30 phút.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting || !title.trim() || !content.trim()}
                className="w-full bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20 hover:opacity-90 cursor-pointer text-xs h-10 font-bold px-5"
              >
                <Send className="h-3.5 w-3.5 mr-2" />
                {submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu hỗ trợ"}
              </Button>
            </form>
          </GlassCard>
        </div>

        {/* Right Column: History of tickets (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Clock className="h-4.5 w-4.5 text-indigo-500" />
            Lịch sử yêu cầu hỗ trợ của bạn
          </div>

          {loading && tickets.length === 0 ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/40 animate-pulse" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <GlassCard className="p-8 text-center text-slate-500">
              Bạn chưa gửi yêu cầu hỗ trợ nào. Khi gặp sự cố phần cứng hoặc tự động hóa, hãy sử dụng form bên trái để gửi thông tin cho kỹ thuật viên.
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {tickets.map((t) => {
                const isNew = t.trang_thai === "new";
                const isProcessing = t.trang_thai === "processing";
                const isResolved = t.trang_thai === "resolved";

                return (
                  <GlassCard
                    key={t.idticket}
                    className={`p-5 border transition-all ${
                      isResolved
                        ? "opacity-80 border-slate-100 dark:border-slate-800"
                        : "border-indigo-100/50 dark:border-slate-800/80 shadow-sm"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Header row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {t.tieu_de}
                          </span>
                          <Badge
                            className={`rounded-full border-transparent font-semibold text-[10px] ${
                              isNew
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                : isProcessing
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            {isNew ? "Chờ xử lý" : isProcessing ? "Đang xử lý" : "Đã giải quyết"}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(t.thoigian).toLocaleString("vi-VN")}
                        </span>
                      </div>

                      {/* Detail body */}
                      {(() => {
                        let displayText = t.noi_dung;
                        let deviceTag = "";
                        try {
                          const obj = JSON.parse(t.noi_dung);
                          if (obj.content) {
                            displayText = obj.content;
                            deviceTag = obj.device || "";
                          }
                        } catch {}
                        return (
                          <div>
                            {deviceTag && (
                              <div className="text-[10px] text-indigo-600 font-semibold mb-1">
                                Thiết bị: {deviceTag}
                              </div>
                            )}
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium bg-slate-50/70 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              {displayText}
                            </p>
                          </div>
                        );
                      })()}

                      {/* Reply from Admin */}
                      {t.phan_hoi ? (
                        <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10 p-3.5 rounded-xl border border-emerald-100/50 dark:border-emerald-950/40 relative">
                          <div className="absolute top-3.5 right-3.5 text-[9px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Đã phản hồi
                          </div>
                          <div className="font-bold mb-1">Kỹ thuật viên phản hồi:</div>
                          <div className="leading-relaxed font-medium">{t.phan_hoi}</div>
                          <div className="text-[9px] text-slate-400 mt-2">
                            Cập nhật lúc: {new Date(t.thoigian_capnhat).toLocaleString("vi-VN")}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-semibold">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          Yêu cầu đang nằm trong hàng đợi chẩn đoán lỗi. Bạn có thể bật **Quyền chẩn đoán từ xa** trong mục Hồ sơ để Admin có thể kiểm tra phần cứng trực tiếp.
                        </div>
                      )}
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
