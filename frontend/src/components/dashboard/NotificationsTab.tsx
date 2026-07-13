import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "./GlassCard";
import { useRelativeTime } from "@/lib/smart-home";

function NotifItem({
  notif,
  isRead,
  onMark,
}: {
  notif: { id: any; ts: number; detail: string; level: "error" | "warn" | "info"; isoTime: string };
  isRead: boolean;
  onMark: () => void;
}) {
  const rel = useRelativeTime(notif.ts);
  const timeStr = new Date(notif.ts).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const cfg = notif.level === "error"
    ? { icon: AlertTriangle, gradient: "from-rose-500 to-pink-500", badge: "bg-rose-100 text-rose-700", bg: isRead ? "hover:bg-slate-100/50" : "bg-rose-50/20 hover:bg-rose-50/40" }
    : notif.level === "warn"
    ? { icon: AlertTriangle, gradient: "from-amber-500 to-orange-400", badge: "bg-amber-100 text-amber-700", bg: isRead ? "hover:bg-slate-100/50" : "bg-amber-50/20 hover:bg-amber-50/40" }
    : { icon: CheckCircle2, gradient: "from-emerald-500 to-teal-400", badge: "bg-emerald-100 text-emerald-700", bg: isRead ? "hover:bg-slate-100/50" : "bg-emerald-50/10 hover:bg-emerald-50/20" };

  const Icon = cfg.icon;

  return (
    <li className={cn("flex items-start gap-4 px-5 py-4 transition relative", cfg.bg, !isRead && "font-medium")}>
      {!isRead && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/50" />
      )}
      <div className={cn(
        "mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md transition-all duration-300",
        cfg.gradient,
        isRead && "opacity-60 grayscale"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm leading-snug transition-colors duration-300", isRead ? "text-slate-500" : "text-slate-800 font-semibold")}>
          {notif.detail}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {rel}</span>
          <span>·</span>
          <span className="tabular-nums">{timeStr}</span>
          <div className="ml-auto flex items-center gap-2">
            {!isRead && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onMark();
                }}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                Đã đọc
              </button>
            )}
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", cfg.badge)}>
              {notif.level === "error" ? "Lỗi" : notif.level === "warn" ? "Cảnh báo" : "Thông tin"}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

export function NotificationsTab({
  readAlertIds,
  onMarkAsRead,
  onMarkAllAsRead,
}: {
  readAlertIds: number[];
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: (ids: number[]) => void;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "error" | "warn" | "info">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("nhatkyhoatdong")
          .select("*")
          .order("thoigian", { ascending: false })
          .limit(100);
        if (data) setLogs(data);
      } catch (e) {
        console.error("Lỗi tải thông báo:", e);
      }
      setLoading(false);
    }
    fetchAll();

    const chan = supabase
      .channel("notif-tab-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "nhatkyhoatdong" }, (payload) => {
        setLogs((prev) => [payload.new, ...prev].slice(0, 100));
      })
      .subscribe();

    return () => { supabase.removeChannel(chan); };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, pageSize]);

  const mapped = useMemo(() => logs.map((l) => {
    const isError = l.hanhdong.includes("Lỗi") || l.hanhdong.includes("Mất kết nối");
    const isWarn = l.hanhdong.includes("vượt ngưỡng") || l.hanhdong.includes("Cảnh báo");
    const level: "error" | "warn" | "info" = isError ? "error" : isWarn ? "warn" : "info";
    return { id: Number(l.idnhatky), ts: Date.parse(l.thoigian), detail: l.hanhdong, level, isoTime: l.thoigian };
  }), [logs]);

  const filtered = useMemo(() => filter === "all" ? mapped : mapped.filter((n) => n.level === filter), [mapped, filter]);

  const counts = useMemo(() => ({
    all: mapped.length,
    error: mapped.filter((n) => n.level === "error").length,
    warn: mapped.filter((n) => n.level === "warn").length,
    info: mapped.filter((n) => n.level === "info").length,
  }), [mapped]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const FILTERS: { key: "all" | "error" | "warn" | "info"; label: string; color: string }[] = [
    { key: "all", label: "Tất cả", color: "from-indigo-500 to-sky-500" },
    { key: "error", label: "Lỗi", color: "from-rose-500 to-pink-500" },
    { key: "warn", label: "Cảnh báo", color: "from-amber-500 to-orange-400" },
    { key: "info", label: "Thông tin", color: "from-emerald-500 to-teal-400" },
  ];

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-4 text-left transition-all cursor-pointer",
              filter === f.key
                ? "border-transparent ring-2 ring-indigo-400 shadow-lg bg-white"
                : "border-white/60 bg-white/60 backdrop-blur-md shadow-sm hover:bg-white/80"
            )}
          >
            <div className={cn("absolute -right-3 -top-3 h-14 w-14 rounded-full bg-gradient-to-br opacity-15", f.color)} />
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{counts[f.key]}</div>
            <div className="text-xs text-slate-500 mt-0.5">{f.label}</div>
          </button>
        ))}
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between px-5 py-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Trung tâm thông báo</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {filtered.length} thông báo · Cập nhật realtime
            </p>
          </div>
          <div className="flex items-center gap-3">
            {filtered.some((n) => !readAlertIds.includes(n.id)) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkAllAsRead(filtered.filter((n) => !readAlertIds.includes(n.id)).map((n) => n.id))}
                className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer h-8"
              >
                Đọc tất cả
              </Button>
            )}
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-emerald-700">Live</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-px">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-slate-100" />
                  <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <Bell className="h-12 w-12 opacity-20" />
            <p className="text-sm">Không có thông báo nào</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100/80">
            {paginatedData.map((n) => (
              <NotifItem
                key={n.id}
                notif={n}
                isRead={readAlertIds.includes(n.id)}
                onMark={() => onMarkAsRead(n.id)}
              />
            ))}
          </ul>
        )}

        {/* Pagination Controller */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200/70 p-4 bg-slate-50/30 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>
                Hiển thị <b>{Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}</b> đến{" "}
                <b>{Math.min(filtered.length, currentPage * pageSize)}</b> trong tổng số{" "}
                <b>{filtered.length}</b> bản ghi
              </span>
              <div className="flex items-center gap-1.5">
                <span>Số dòng:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>

              {totalPages > 1 && Array.from({ length: totalPages }).map((_, idx) => {
                const p = idx + 1;
                const near = p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                if (!near) {
                  if (p === 2 || p === totalPages - 1) return <span key={p} className="px-0.5 text-xs text-slate-400">…</span>;
                  return null;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition cursor-pointer",
                      p === currentPage
                        ? "bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-200"
                        : "border border-white/60 bg-white/60 text-slate-600 hover:bg-white shadow-sm"
                    )}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
