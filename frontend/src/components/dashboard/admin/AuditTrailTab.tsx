import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileSpreadsheet,
  Search,
  Calendar,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type AuditLog = {
  idaudit: number;
  idnguoidung: number | null;
  hoten: string | null;
  hanhdong: string;
  chi_tiet: string | null;
  ip_address: string;
  thoigian: string;
};

const PAGE_SIZE = 10;

export function AuditTrailTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [adminRole, setAdminRole] = useState<"admin" | "super_admin">("admin");
  const [scopeFilter, setScopeFilter] = useState<"mine" | "all">("mine");
  const [currentUserProfile, setCurrentUserProfile] = useState<{ idnguoidung: number; hoten: string } | null>(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data } = await supabase
            .from("nguoidung")
            .select("idnguoidung, hoten, vaitro")
            .eq("auth_uid", session.user.id)
            .single();
          if (data) {
            setCurrentUserProfile({ idnguoidung: data.idnguoidung, hoten: data.hoten });
            // If they are super admin, they can view all, otherwise standard admins are locked
            if (data.vaitro === "super_admin" || data.vaitro === "admin") {
              setAdminRole(data.vaitro);
              setScopeFilter("all");
            }
          }
        }
      } catch (e) {
        console.error("Lỗi lấy thông tin session admin:", e);
      }
    };
    loadCurrentUser();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("thoigian", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      console.error("Lỗi khi tải audit log:", err);
      toast.error("Không thể tải nhật ký hệ thống: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime audit logs
    const channel = supabase
      .channel("audit-trail-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log" },
        (payload) => {
          setLogs((prev) => [payload.new as AuditLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (scopeFilter === "mine" && currentUserProfile) {
      result = result.filter(l => l.idnguoidung === currentUserProfile.idnguoidung);
    }

    if (!search.trim()) return result;
    const s = search.toLowerCase();
    return result.filter(
      (l) =>
        (l.hoten && l.hoten.toLowerCase().includes(s)) ||
        l.hanhdong.toLowerCase().includes(s) ||
        (l.chi_tiet && l.chi_tiet.toLowerCase().includes(s)) ||
        l.ip_address.includes(s)
    );
  }, [logs, search, scopeFilter, currentUserProfile]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const paginatedLogs = useMemo(() => {
    return filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredLogs, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Nhật ký hệ thống (Audit Trail)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            Hồ sơ ghi nhận các hoạt động của Quản trị viên. Logs này là bất biến (Read-only) để phục vụ bảo mật.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={loading}
          className="border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-900 cursor-pointer text-slate-800 dark:text-slate-200 font-semibold"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {/* Filter Bar */}
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-indigo-500" />
          <Input
            placeholder="Tìm kiếm theo hành động, tên admin, địa chỉ IP hoặc chi tiết..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">Phạm vi nhật ký:</span>
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value as any)}
            className="text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 rounded-lg text-slate-900 dark:text-slate-100 font-bold"
          >
            <option value="mine">Chỉ xem nhật ký của tôi</option>
            {adminRole === "super_admin" ? (
              <option value="all">Xem nhật ký toàn hệ thống</option>
            ) : (
              <option value="all" disabled>
                🔒 Xem toàn hệ thống (Yêu cầu Super Admin)
              </option>
            )}
          </select>
        </div>
      </GlassCard>

      {/* Audit Log Table */}
      <GlassCard className="p-6 overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-600 dark:text-slate-300 font-semibold animate-pulse">
            Đang tải dữ liệu nhật ký hệ thống...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-600 dark:text-slate-400 font-medium">
            Không tìm thấy bản ghi nhật ký hoạt động nào khớp với từ khóa tìm kiếm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-4 text-left">Thời gian</th>
                  <th className="pb-3 px-4 text-left">Quản trị viên</th>
                  <th className="pb-3 px-4 text-left">Hành động</th>
                  <th className="pb-3 px-4 text-left">Chi tiết</th>
                  <th className="pb-3 pl-4 text-right">Địa chỉ IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedLogs.map((l) => (
                  <tr
                    key={l.idaudit}
                    className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition-colors"
                  >
                    <td className="py-3.5 pr-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(l.thoigian).toLocaleString("vi-VN")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-200">
                      {l.hoten || `Admin ID: ${l.idnguoidung}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge className="rounded-full bg-slate-100 text-slate-700 border-transparent dark:bg-slate-800 dark:text-slate-300 font-medium">
                        {l.hanhdong}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-xs" title={l.chi_tiet || ""}>
                      {l.chi_tiet || "Không có chi tiết"}
                    </td>
                    <td className="py-3.5 pl-4 text-right font-mono text-xs text-slate-500">
                      {l.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-500 dark:text-slate-400">
                <div>
                  Hiển thị {(page - 1) * PAGE_SIZE + 1} –{" "}
                  {Math.min(page * PAGE_SIZE, filteredLogs.length)} trong tổng số{" "}
                  {filteredLogs.length} bản ghi
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 w-16 cursor-pointer border-slate-200 dark:border-slate-800 dark:text-slate-200"
                  >
                    Trước
                  </Button>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">
                    Trang {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 w-16 cursor-pointer border-slate-200 dark:border-slate-800 dark:text-slate-200"
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
