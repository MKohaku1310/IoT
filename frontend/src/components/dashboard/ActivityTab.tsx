import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { GlassCard } from "./GlassCard";
import { useRelativeTime } from "@/lib/smart-home";

function getActMeta(type: string, detail: string, ok: boolean) {
  if (!ok) return { icon: AlertTriangle, gradient: "from-rose-500 to-pink-500", badge: "bg-rose-100 text-rose-700 border-rose-200", indicatorBg: "bg-rose-400", bg: "bg-rose-50/40" };
  if (type === "Cấu hình") return { icon: SettingsIcon, gradient: "from-violet-500 to-indigo-500", badge: "bg-violet-100 text-violet-700 border-violet-200", indicatorBg: "bg-violet-400", bg: "bg-violet-50/40" };
  if (detail.includes("Điều hòa")) return { icon: Wind, gradient: "from-sky-500 to-cyan-500", badge: "bg-sky-100 text-sky-700 border-sky-200", indicatorBg: "bg-sky-400", bg: "bg-sky-50/40" };
  if (detail.includes("Quạt")) return { icon: Fan, gradient: "from-teal-500 to-emerald-500", badge: "bg-teal-100 text-teal-700 border-teal-200", indicatorBg: "bg-teal-400", bg: "bg-teal-50/40" };
  if (detail.includes("Đèn")) return { icon: Lightbulb, gradient: "from-amber-500 to-yellow-400", badge: "bg-amber-100 text-amber-700 border-amber-200", indicatorBg: "bg-amber-400", bg: "bg-amber-50/40" };
  return { icon: CheckCircle2, gradient: "from-emerald-500 to-green-500", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", indicatorBg: "bg-emerald-400", bg: "bg-emerald-50/30" };
}

function ActivityRow({ a, isFirst }: { a: { ts: number; type: string; detail: string; by: string; ok: boolean }; isFirst: boolean }) {
  const rel = useRelativeTime(a.ts);
  const meta = getActMeta(a.type, a.detail, a.ok);
  const Icon = meta.icon;
  const timeStr = new Date(a.ts).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <li className={cn(
      "group relative flex items-start gap-4 rounded-2xl p-4 transition-all duration-200",
      "border border-white/60 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md hover:-translate-y-0.5",
      meta.bg,
    )}>
      {/* Cạnh màu chỉ thị trạng thái */}
      <div className={cn("absolute left-0.5 top-0.5 bottom-0.5 w-1 rounded-l-xl", meta.indicatorBg)} />

      <div className={cn(
        "relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md",
        meta.gradient,
      )}>
        <Icon className="h-5 w-5" />
        {isFirst && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-2">
          <span className="text-sm font-semibold text-slate-800 leading-snug">{a.detail}</span>
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide", meta.badge)}>
            {a.type}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-medium">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="tabular-nums">{rel}</span>
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {a.by}
          </span>
          <span className="ml-auto font-mono text-[10px] text-slate-400 tabular-nums">{timeStr}</span>
        </div>
      </div>

      <div className={cn(
        "shrink-0 self-center rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm",
        a.ok
          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-200"
          : "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-rose-200",
      )}>
        {a.ok ? "✓ Thành công" : "✗ Thất bại"}
      </div>
    </li>
  );
}

export function ActivityTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("nhatkyhoatdong")
          .select("*")
          .order("thoigian", { ascending: false })
          .limit(50);
        if (data) setLogs(data);
      } catch (e) {
        console.error("Lỗi khi tải nhật ký hoạt động:", e);
      }
      setLoading(false);
    }
    fetchLogs();

    const channel = supabase
      .channel("activity-tab-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "nhatkyhoatdong" },
        (payload) => {
          setLogs((prev) => [payload.new, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const mappedLogs = useMemo(() => {
    return logs.map((l) => {
      const hasWarning = l.hanhdong.includes("vượt ngưỡng") || l.hanhdong.includes("Lỗi") || l.hanhdong.includes("Mất kết nối");
      return {
        ts: Date.parse(l.thoigian),
        type: hasWarning ? "Cảnh báo" : l.hanhdong.includes("Cấu hình") || l.hanhdong.includes("Ngưỡng") ? "Cấu hình" : "Điều khiển",
        detail: l.hanhdong,
        by: l.idnguoidung ? "Admin" : "Hệ thống",
        ok: !hasWarning,
        isoTime: l.thoigian,
      };
    });
  }, [logs]);

  const filtered = useMemo(() => {
    return !search.trim()
      ? mappedLogs
      : mappedLogs.filter((m) =>
        m.detail.toLowerCase().includes(search.toLowerCase()) ||
        m.type.toLowerCase().includes(search.toLowerCase()) ||
        m.by.toLowerCase().includes(search.toLowerCase())
      );
  }, [mappedLogs, search]);

  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const stats = useMemo(() => ({
    total: mappedLogs.length,
    ok: mappedLogs.filter((m) => m.ok).length,
    warn: mappedLogs.filter((m) => !m.ok).length,
    config: mappedLogs.filter((m) => m.type === "Cấu hình").length,
  }), [mappedLogs]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Tổng sự kiện", value: stats.total, color: "from-indigo-500 to-sky-500", icon: Clock },
          { label: "Thành công", value: stats.ok, color: "from-emerald-500 to-teal-500", icon: CheckCircle2 },
          { label: "Cảnh báo", value: stats.warn, color: "from-rose-500 to-pink-500", icon: AlertTriangle },
          { label: "Cấu hình", value: stats.config, color: "from-violet-500 to-indigo-500", icon: SettingsIcon },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/60 p-4 backdrop-blur-md shadow-sm">
              <div className={cn("absolute -right-3 -top-3 h-14 w-14 rounded-full bg-gradient-to-br opacity-10", s.color)} />
              <div className={cn("mb-2 inline-grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br text-white shadow", s.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Tìm kiếm sự kiện, thiết bị, loại..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white/70 backdrop-blur-sm border-white/60 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-300 text-slate-800"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      <GlassCard>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Nhật ký hoạt động</h3>
            <p className="text-xs text-slate-500">
              Trang {page}/{totalPages} · {filtered.length} sự kiện
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
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-slate-100" />
                  <div className="h-2.5 w-1/2 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
            <History className="h-10 w-10 opacity-30" />
            <p className="text-sm">{search ? "Không tìm thấy kết quả phù hợp" : "Chưa có nhật ký hoạt động"}</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[36px] top-5 bottom-5 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" />
            <ul className="space-y-3">
              {paginated.map((a, i) => (
                <ActivityRow key={i} a={a} isFirst={page === 1 && i === 0} />
              ))}
            </ul>

            {filtered.length > 0 && (
              <div className="mt-5 flex items-center justify-between gap-2">
                <p className="text-xs text-slate-500 tabular-nums">
                  Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length} sự kiện
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
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
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
