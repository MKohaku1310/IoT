import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Settings as SettingsIcon,
  Search,
  XCircle,
  History,
  Wind,
  Fan,
  Lightbulb,
  User,
  Bot,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Wifi,
  Zap,
  Filter,
  ExternalLink,
  X,
  Info,
  Home,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-card";
import { useRelativeTime } from "@/hooks/use-smart-home";
import { NodeInfo } from "@/hooks/use-node-context";

// ================================================================
// Types
// ================================================================
interface RawLog {
  idnhatky: number;
  thoigian: string;
  hanhdong: string;
  idnguoidung: number | null;
  ten_nguoi_thaotac: string | null;
  idnode: string | null;
  id_thietbi: number | null;
  nguoidung?: { hoten: string; email: string } | null;
}

interface ParsedLog {
  id: number;
  ts: number;
  isoTime: string;
  loai_nhatky: "user_action" | "system_alert" | "legacy";
  loai_thao_tac: string;
  description: string;
  node_id: string;
  node_name: string;
  // actor
  actor_name: string | null;  // tên người thực hiện (từ join hoặc từ JSON)
  actor_is_me?: boolean;
  // user_action fields
  device_id?: number;
  device_name?: string;
  user_name?: string;
  meta_detail?: Record<string, any>;
  // ai_chat fields
  chat_id?: string;
  chat_title?: string;
  // system_alert fields
  detail_content?: string;
  // raw
  idnguoidung: number | null;
  idnode: string | null;
}

const PAGE_SIZE = 15;

// ================================================================
// Log parser — safely handles JSON or legacy plain-text strings
// ================================================================
function parseLog(raw: RawLog, currentUserId?: number | null): ParsedLog {
  // Tên người thực hiện: ưu tiên cột ten_nguoi_thaotac → join nguoidung.hoten → JSON.user_name
  const resolvedActorName =
    raw.ten_nguoi_thaotac ||
    raw.nguoidung?.hoten ||
    null;

  const base: Omit<ParsedLog, "loai_nhatky" | "loai_thao_tac" | "description"> = {
    id: raw.idnhatky,
    ts: Date.parse(raw.thoigian),
    isoTime: raw.thoigian,
    node_id: raw.idnode || "",
    node_name: "",
    actor_name: resolvedActorName,
    actor_is_me: currentUserId != null && raw.idnguoidung === currentUserId,
    idnguoidung: raw.idnguoidung,
    idnode: raw.idnode,
  };

  try {
    const parsed = JSON.parse(raw.hanhdong);
    return {
      ...base,
      loai_nhatky: parsed.loai_nhatky || "user_action",
      loai_thao_tac: parsed.loai_thao_tac || "unknown",
      description: parsed.description || raw.hanhdong,
      node_id: parsed.node_id || raw.idnode || "",
      node_name: parsed.node_name || "",
      actor_name: resolvedActorName || parsed.user_name || null,
      device_id: parsed.device_id,
      device_name: parsed.device_name,
      user_name: parsed.user_name,
      meta_detail: parsed.meta_detail,
      chat_id: parsed.chat_id,
      chat_title: parsed.chat_title,
      detail_content: parsed.detail_content,
    };
  } catch {
    // Legacy plain-text
    const h = raw.hanhdong;
    const isAlert =
      h.includes("vượt ngưỡng") ||
      h.includes("Lỗi") ||
      h.includes("Mất kết nối") ||
      h.includes("Cảnh báo");
    return {
      ...base,
      loai_nhatky: isAlert ? "system_alert" : "legacy",
      loai_thao_tac: isAlert ? "sensor_warning" : "device_toggle",
      description: h,
      node_name: raw.idnode || "",
    };
  }
}

// ================================================================
// Visual helpers
// ================================================================
function getLogMeta(log: ParsedLog) {
  if (log.loai_nhatky === "system_alert") {
    const isConn = log.loai_thao_tac === "connection_loss";
    return {
      Icon: isConn ? Wifi : ShieldAlert,
      gradient: "from-rose-500 to-pink-600",
      badge: "bg-rose-50 text-rose-700 border-rose-200",
      indicatorBg: "bg-rose-400",
      cardBg: "bg-rose-50/40",
      label: isConn ? "Mất kết nối" : "Cảnh báo",
    };
  }
  if (log.loai_thao_tac === "ai_chat") {
    return {
      Icon: Bot,
      gradient: "from-violet-500 to-purple-600",
      badge: "bg-violet-50 text-violet-700 border-violet-200",
      indicatorBg: "bg-violet-400",
      cardBg: "bg-violet-50/30",
      label: "Chat AI",
    };
  }
  if (log.loai_thao_tac === "schedule_create" || log.loai_thao_tac === "schedule_update" || log.loai_thao_tac === "schedule_delete") {
    return {
      Icon: CalendarClock,
      gradient: "from-indigo-500 to-blue-500",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      indicatorBg: "bg-indigo-400",
      cardBg: "bg-indigo-50/30",
      label: "Lịch hẹn",
    };
  }
  if (log.loai_thao_tac === "config_change") {
    return {
      Icon: SettingsIcon,
      gradient: "from-amber-500 to-orange-500",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      indicatorBg: "bg-amber-400",
      cardBg: "bg-amber-50/30",
      label: "Cấu hình",
    };
  }
  // device_toggle — detect device type
  const desc = (log.description || "").toLowerCase();
  const devName = (log.device_name || "").toLowerCase();
  const combined = desc + " " + devName;
  if (combined.includes("dieu_hoa") || combined.includes("điều hòa") || combined.includes("máy lạnh"))
    return { Icon: Wind, gradient: "from-sky-500 to-cyan-500", badge: "bg-sky-50 text-sky-700 border-sky-200", indicatorBg: "bg-sky-400", cardBg: "bg-sky-50/30", label: "Thiết bị" };
  if (combined.includes("quat") || combined.includes("quạt"))
    return { Icon: Fan, gradient: "from-teal-500 to-emerald-500", badge: "bg-teal-50 text-teal-700 border-teal-200", indicatorBg: "bg-teal-400", cardBg: "bg-teal-50/30", label: "Thiết bị" };
  if (combined.includes("den") || combined.includes("đèn"))
    return { Icon: Lightbulb, gradient: "from-yellow-400 to-amber-500", badge: "bg-yellow-50 text-yellow-700 border-yellow-200", indicatorBg: "bg-yellow-400", cardBg: "bg-yellow-50/30", label: "Thiết bị" };
  return {
    Icon: Zap,
    gradient: "from-emerald-500 to-green-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    indicatorBg: "bg-emerald-400",
    cardBg: "bg-emerald-50/30",
    label: "Điều khiển",
  };
}

function formatActionLabel(thao_tac: string): string {
  const map: Record<string, string> = {
    device_toggle: "Bật/Tắt thiết bị",
    schedule_create: "Tạo lịch hẹn",
    schedule_update: "Cập nhật lịch hẹn",
    schedule_delete: "Xóa lịch hẹn",
    config_change: "Thay đổi cấu hình",
    ai_chat: "Chat AI",
    sensor_warning: "Cảnh báo cảm biến",
    connection_loss: "Mất kết nối",
    system_event: "Sự kiện hệ thống",
    household_invite: "Mời thành viên",
    household_remove_member: "Xóa thành viên",
    unknown: "Khác",
  };
  return map[thao_tac] || thao_tac;
}

// ================================================================
// Activity Row Component
// ================================================================
function ActivityRow({
  log,
  isFirst,
  onClick,
}: {
  log: ParsedLog;
  isFirst: boolean;
  onClick: (log: ParsedLog) => void;
}) {
  const rel = useRelativeTime(log.ts);
  const meta = getLogMeta(log);
  const Icon = meta.Icon;
  const timeStr = new Date(log.ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const isAiChat = log.loai_thao_tac === "ai_chat";

  return (
    <li
      onClick={() => onClick(log)}
      className={cn(
        "group relative flex items-start gap-4 rounded-2xl p-4 pl-5 transition-all duration-200 cursor-pointer overflow-hidden",
        "border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 shadow-sm hover:shadow-md hover:-translate-y-0.5",
        meta.cardBg,
      )}
    >
      {/* Cạnh màu trái */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", meta.indicatorBg)} />

      <div
        className={cn(
          "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md",
          meta.gradient,
        )}
      >
        <Icon className="h-5 w-5" />
        {isFirst && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
            {log.loai_thao_tac === "ai_chat" ? (log.chat_title || "Trò chuyện với Trợ lý AI") : log.description}
          </span>
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide shrink-0", meta.badge)}>
            {meta.label}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="tabular-nums">{rel}</span>
          </span>
          {(log.node_name || log.node_id) && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Home className="h-3 w-3" />
                {log.node_name || log.node_id}
              </span>
            </>
          )}
          {/* Actor name — ai thực hiện hành động */}
          {log.actor_name && (
            <>
              <span>·</span>
              <span className={cn(
                "flex items-center gap-1 font-semibold",
                log.actor_is_me ? "text-indigo-600" : "text-slate-600"
              )}>
                <User className="h-3 w-3" />
                {log.actor_is_me ? "Bạn" : log.actor_name}
              </span>
            </>
          )}
          <span className="ml-auto font-mono text-[10px] text-slate-400 tabular-nums">{timeStr}</span>
        </div>
      </div>

      <div className="shrink-0 self-center">
        {isAiChat ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2.5 py-1">
            <ExternalLink className="h-3 w-3" />
            Mở chat
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-colors">
            <Info className="h-3 w-3" />
            Chi tiết
          </span>
        )}
      </div>
    </li>
  );
}

// ================================================================
// Detail Modal
// ================================================================
function DetailModal({ log, onClose }: { log: ParsedLog; onClose: () => void }) {
  const meta = getLogMeta(log);
  const Icon = meta.Icon;
  const isAiChat = log.loai_thao_tac === "ai_chat";

  const handleOpenChat = () => {
    if (log.chat_id) {
      window.dispatchEvent(
        new CustomEvent("open-ai-chat", { detail: { chatId: log.chat_id, title: log.chat_title || "" } })
      );
    }
    onClose();
  };

  const dateStr = new Date(log.ts).toLocaleString("vi-VN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/60 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className={cn("flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r", `${meta.gradient} bg-opacity-10`)}>
          <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", meta.gradient)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              {log.loai_nhatky === "system_alert" ? "Thông báo hệ thống" : "Thao tác người dùng"} · {formatActionLabel(log.loai_thao_tac)}
            </p>
            <h3 className="text-sm font-bold text-white leading-snug mt-0.5 line-clamp-2">
              {isAiChat ? (log.chat_title || "Trò chuyện với Trợ lý AI") : log.description}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Thời gian */}
          <DetailRow label="Thời gian" value={dateStr} icon={<Clock className="h-4 w-4 text-slate-400" />} />

          {/* Người thực hiện */}
          {log.actor_name && (
            <DetailRow
              label="Người thực hiện"
              value={log.actor_is_me ? `Bạn (${log.actor_name})` : log.actor_name}
              icon={<User className="h-4 w-4 text-slate-400" />}
            />
          )}

          {/* Node */}
          {(log.node_name || log.node_id) && (
            <DetailRow label="Node / Khu vực" value={log.node_name || log.node_id} icon={<Home className="h-4 w-4 text-slate-400" />} />
          )}

          {/* TYPE 1 — User Action */}
          {log.loai_nhatky !== "system_alert" && (
            <>
              {isAiChat ? (
                <>
                  <DetailRow label="Tiêu đề đoạn chat" value={log.chat_title || "(Không có tiêu đề)"} icon={<Bot className="h-4 w-4 text-slate-400" />} />
                  {log.chat_id && (
                    <DetailRow label="Chat ID" value={log.chat_id} icon={<Info className="h-4 w-4 text-slate-400" />} mono />
                  )}
                  <div className="mt-2 rounded-2xl bg-violet-50 border border-violet-200 p-4">
                    <p className="text-xs text-violet-700 font-medium">
                      Nội dung hội thoại được lưu trữ an toàn trên thiết bị của bạn và không được ghi vào server.
                      Bấm nút bên dưới để mở lại đoạn chat này.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {log.device_name && (
                    <DetailRow label="Thiết bị" value={log.device_name} icon={<Zap className="h-4 w-4 text-slate-400" />} />
                  )}
                  {log.meta_detail && Object.keys(log.meta_detail).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">Chi tiết thay đổi</p>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-1.5">
                        {Object.entries(log.meta_detail).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-500 min-w-[100px] capitalize">{k.replace(/_/g, " ")}</span>
                            <span className="text-slate-800 font-medium">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* TYPE 2 — System Alert */}
          {log.loai_nhatky === "system_alert" && (
            <>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Nội dung thông báo đầy đủ</p>
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
                  <p className="text-sm text-rose-800 font-medium leading-relaxed">
                    {log.detail_content || log.description}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          {isAiChat && log.chat_id && (
            <button
              onClick={handleOpenChat}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm font-bold shadow-md hover:opacity-90 transition-opacity cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              Mở lại đoạn chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, icon, mono = false }: { label: string; value: string; icon: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={cn("text-sm font-semibold text-slate-800 mt-0.5", mono && "font-mono text-xs text-slate-500")}>{value}</p>
      </div>
    </div>
  );
}

// ================================================================
// Main ActivityTab Component
// ================================================================
export function ActivityTab({
  currentUserId,
  currentNodeId,
  currentUserRole,
  nodesList = [],
}: {
  currentUserId?: number | null;
  currentNodeId?: string;
  currentUserRole?: string;
  nodesList?: NodeInfo[];
}) {
  const [rawLogs, setRawLogs] = useState<RawLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ParsedLog | null>(null);
  const [filterNode, setFilterNode] = useState<string>("__current__");
  const [totalCount, setTotalCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState<"all" | "user_action" | "system_alert" | "ai_chat">("all");

  // Check if user is owner or admin (can see all nodes)
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const checkOwner = async () => {
      if (currentUserRole === "admin") {
        setIsOwner(true);
        return;
      }
      if (!currentUserId) return;
      try {
        const { data } = await supabase
          .from("thanhvien_hogiadinh")
          .select("vaitro")
          .eq("idnguoidung", currentUserId)
          .maybeSingle();
        if (data?.vaitro === "owner") setIsOwner(true);
      } catch {
        setIsOwner(false);
      }
    };
    checkOwner();
  }, [currentUserId, currentUserRole]);

  // Fetch logs with real server-side pagination + node filter
  const fetchLogs = useCallback(async (pageNum: number, nodeFilter: string, searchStr: string, tFilter: "all" | "user_action" | "system_alert" | "ai_chat" = "all") => {
    setLoading(true);
    try {
      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("nhatkyhoatdong")
        .select(`
          *,
          ten_nguoi_thaotac,
          nguoidung:nguoidung(hoten, email)
        `, { count: "exact" })
        .order("thoigian", { ascending: false });

      // Node filter
      if (nodeFilter !== "__all__") {
        const targetNode = nodeFilter === "__current__" ? currentNodeId : nodeFilter;
        if (targetNode) {
          query = query.eq("idnode", targetNode);
        }
      }

      // Type filter - sử dụng cột loai_thongbao mới
      if (tFilter === "system_alert") {
        query = query.eq("loai_thongbao", "system_alert");
      } else if (tFilter === "ai_chat") {
        query = query.ilike("hanhdong", "%ai_chat%");
      } else if (tFilter === "user_action") {
        query = query.eq("loai_thongbao", "user_action");
      } else {
        // all: exclude user_to_admin (chỉ dành cho admin)
        query = query.neq("loai_thongbao", "user_to_admin");
      }

      // Client-side search via ilike on hanhdong
      if (searchStr.trim()) {
        query = query.ilike("hanhdong", `%${searchStr.trim()}%`);
      }

      query = query.range(from, to);

      const { data, count, error } = await query;
      if (!error && data) {
        setRawLogs(data as RawLog[]);
        setTotalCount(count || 0);
      }
    } catch (e) {
      console.error("Lỗi khi tải nhật ký:", e);
    }
    setLoading(false);
  }, [currentNodeId]);

  useEffect(() => {
    fetchLogs(page, filterNode, search, typeFilter);
  }, [page, filterNode, fetchLogs]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchLogs(1, filterNode, search, typeFilter);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
    fetchLogs(1, filterNode, search, typeFilter);
  }, [filterNode, typeFilter]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("activity-tab-realtime-v2")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "nhatkyhoatdong" }, () => {
        // Refresh page 1 on new insert
        fetchLogs(1, filterNode, search, typeFilter);
        setPage(1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filterNode, search, typeFilter, fetchLogs]);

  const parsedLogs = useMemo(
    () => rawLogs.map((r) => parseLog(r, currentUserId)),
    [rawLogs, currentUserId]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Stats across ALL logs (not just current page)
  const [typeCounts, setTypeCounts] = useState({ total: 0, userActions: 0, systemAlerts: 0, aiChats: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const nodeEq = filterNode !== "__all__"
          ? (filterNode === "__current__" ? currentNodeId : filterNode)
          : null;

        const baseAll = nodeEq
          ? supabase.from("nhatkyhoatdong").select("*", { count: "exact", head: true }).eq("idnode", nodeEq)
          : supabase.from("nhatkyhoatdong").select("*", { count: "exact", head: true });

        const baseSys = nodeEq
          ? supabase.from("nhatkyhoatdong").select("*", { count: "exact", head: true }).eq("idnode", nodeEq)
          : supabase.from("nhatkyhoatdong").select("*", { count: "exact", head: true });

        const baseAi = nodeEq
          ? supabase.from("nhatkyhoatdong").select("*", { count: "exact", head: true }).eq("idnode", nodeEq)
          : supabase.from("nhatkyhoatdong").select("*", { count: "exact", head: true });

        const [allRes, sysAlertRes, aiChatRes] = await Promise.all([
          baseAll,
          baseSys.or("hanhdong.ilike.%vượt ngưỡng%,hanhdong.ilike.%Cảnh báo%,hanhdong.ilike.%Mất kết nối%,hanhdong.ilike.%Lỗi%"),
          baseAi.ilike("hanhdong", "%ai_chat%"),
        ]);
        const totalAll = allRes.count || 0;
        const systemAlerts = sysAlertRes.count || 0;
        const aiChats = aiChatRes.count || 0;
        const userActions = Math.max(0, totalAll - systemAlerts - aiChats);
        setTypeCounts({ total: totalAll, userActions, systemAlerts, aiChats });
      } catch (e) {
        console.error("Lỗi khi đếm type:", e);
      }
    };
    fetchCounts();
  }, [filterNode, currentNodeId]);

  // Stats across ALL logs — use server-side counts

  const handleRowClick = (log: ParsedLog) => {
    if (log.loai_thao_tac === "ai_chat" && log.chat_id) {
      // Deep-link directly without modal
      window.dispatchEvent(
        new CustomEvent("open-ai-chat", { detail: { chatId: log.chat_id, title: log.chat_title || "" } })
      );
      return;
    }
    setSelectedLog(log);
  };

  return (
    <div className="space-y-4">
      {/* Stats — clickable to filter */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Tổng sự kiện", value: typeCounts.total, color: "from-indigo-500 to-sky-500", icon: Clock, filterKey: "all" as const },
          { label: "Thao tác người dùng", value: typeCounts.userActions, color: "from-emerald-500 to-teal-500", icon: CheckCircle2, filterKey: "user_action" as const },
          { label: "Cảnh báo hệ thống", value: typeCounts.systemAlerts, color: "from-rose-500 to-pink-500", icon: ShieldAlert, filterKey: "system_alert" as const },
          { label: "Chat AI", value: typeCounts.aiChats, color: "from-violet-500 to-purple-600", icon: Bot, filterKey: "ai_chat" as const },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = typeFilter === s.filterKey;
          return (
            <div
              key={s.label}
              onClick={() => setTypeFilter(s.filterKey)}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl shadow-sm cursor-pointer transition-all duration-200 select-none",
                "bg-white/95 dark:bg-slate-900/90 border-slate-200/80 dark:border-white/10",
                isActive
                  ? "border-indigo-500 ring-2 ring-indigo-500/40 shadow-md -translate-y-0.5"
                  : "hover:border-indigo-300 dark:hover:border-white/20 hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              <div className={cn("absolute -right-3 -top-3 h-14 w-14 rounded-full bg-gradient-to-br opacity-10", s.color)} />
              <div className={cn("mb-2 inline-grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br text-white shadow", s.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{s.value}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">{s.label}</div>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-b-2xl" />
              )}
            </div>
          );
        })}
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Node filter */}
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Filter className="h-4 w-4 text-slate-400 shrink-0" />
          <select
            value={filterNode}
            onChange={(e) => setFilterNode(e.target.value)}
            className="flex-1 text-sm rounded-xl border border-slate-200/80 dark:border-white/15 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm transition-colors cursor-pointer"
          >
            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="__current__">
              Node hiện tại {currentNodeId ? `(${currentNodeId})` : ""}
            </option>
            {isOwner && (
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="__all__">
                Tất cả các node
              </option>
            )}
            {isOwner && nodesList.map((n) => (
              <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" key={n.id} value={n.id}>
                {n.name} ({n.id})
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Tìm kiếm sự kiện, thiết bị, loại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/80 dark:border-white/15 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-400 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <GlassCard className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Nhật ký hoạt động</h3>
            <p className="text-xs text-slate-500">
              Trang {page}/{totalPages} · {totalCount} sự kiện
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium text-emerald-700">Live</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-slate-100" />
                  <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : parsedLogs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
            <History className="h-10 w-10 opacity-30" />
            <p className="text-sm">{search ? "Không tìm thấy kết quả phù hợp" : "Chưa có nhật ký hoạt động"}</p>
          </div>
        ) : (
          <div className="relative">
            <ul className="space-y-3">
              {parsedLogs.map((log, i) => (
                <ActivityRow
                  key={log.id}
                  log={log}
                  isFirst={page === 1 && i === 0}
                  onClick={handleRowClick}
                />
              ))}
            </ul>

            {/* Pagination */}
            <div className="mt-5 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500 tabular-nums">
                Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} / {totalCount} sự kiện
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {totalPages > 1 && Array.from({ length: totalPages }).map((_, idx) => {
                  const p = idx + 1;
                  const near = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
                  if (!near) {
                    if (p === 2 || p === totalPages - 1) return <span key={p} className="px-0.5 text-xs text-slate-400">…</span>;
                    return null;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition cursor-pointer",
                        p === page
                          ? "bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-200"
                          : "border border-white/60 bg-white/60 text-slate-600 hover:bg-white shadow-sm"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Detail Modal */}
      {selectedLog && (
        <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
