import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  Shield,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type UserProfile = {
  idnguoidung: number;
  auth_uid: string;
  hoten: string;
  email: string;
  sodienthoai: string | null;
  vaitro: "admin" | "buyer";
  thoigian: string;
};

export function UserManagementTab({ currentUser }: { currentUser: any }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "buyer">("all");

  // Deletion state
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Role toggle state
  const [userToModifyRole, setUserToModifyRole] = useState<UserProfile | null>(null);
  const [confirmRoleEmail, setConfirmRoleEmail] = useState("");
  const [modifyingRole, setModifyingRole] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Users
      const { data: userData, error: userError } = await supabase
        .from("nguoidung")
        .select("*")
        .order("thoigian", { ascending: false });
      if (userError) throw userError;
      setUsers(userData || []);
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu người dùng:", err);
      toast.error("Không thể tải thông tin người dùng: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleChangeConfirm = async () => {
    if (!userToModifyRole) return;
    if (confirmRoleEmail.trim().toLowerCase() !== userToModifyRole.email.toLowerCase()) {
      toast.error("Email xác nhận không khớp!");
      return;
    }

    setModifyingRole(true);
    const newRole = userToModifyRole.vaitro === "admin" ? "buyer" : "admin";
    try {
      const { error } = await supabase
        .from("nguoidung")
        .update({ vaitro: newRole })
        .eq("idnguoidung", userToModifyRole.idnguoidung);

      if (error) throw error;
      toast.success(`Đã cập nhật vai trò của ${userToModifyRole.hoten} thành ${newRole === "admin" ? "Quản trị viên" : "Gia chủ (Buyer)"}`);
      
      // Log audit
      await supabase.from("audit_log").insert([{
        idnguoidung: currentUser?.idnguoidung,
        hoten: currentUser?.hoten,
        hanhdong: "Đổi vai trò",
        chi_tiet: `Đã cập nhật vai trò của user ${userToModifyRole.email} từ ${userToModifyRole.vaitro} sang ${newRole}`
      }]);

      setUserToModifyRole(null);
      setConfirmRoleEmail("");
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi đổi vai trò: " + err.message);
    } finally {
      setModifyingRole(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    if (confirmEmail.trim().toLowerCase() !== userToDelete.email.toLowerCase()) {
      toast.error("Email xác nhận không khớp!");
      return;
    }

    setDeleting(true);
    try {
      // Delete related data first (nodes ownership, household membership)
      // ON DELETE SET NULL/CASCADE on FK handles most cases, but explicitly
      // nullify node ownership to be safe
      await supabase
        .from("esp32_nodes")
        .update({ idnguoidung: null })
        .eq("idnguoidung", userToDelete.idnguoidung);

      // Delete from public.nguoidung (cascades to tickets, consents, household membership, etc.)
      const { error: dbError } = await supabase
        .from("nguoidung")
        .delete()
        .eq("idnguoidung", userToDelete.idnguoidung);
      if (dbError) throw dbError;

      toast.success(`Đã xóa tài khoản của ${userToDelete.hoten} khỏi hệ thống`);
      toast.info("Lưu ý: Tài khoản Supabase Auth cần được xóa thủ công qua Dashboard vì thiếu service_role key.", { duration: 6000 });
      
      // Log audit
      await supabase.from("audit_log").insert([{
        idnguoidung: currentUser?.idnguoidung,
        hoten: currentUser?.hoten,
        hanhdong: "Xóa tài khoản",
        chi_tiet: `Đã xóa tài khoản user: ${userToDelete.email} (auth_uid: ${userToDelete.auth_uid})`
      }]);

      setUserToDelete(null);
      setConfirmEmail("");
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi khi xóa người dùng: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.hoten.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.sodienthoai && u.sodienthoai.includes(search));
      const matchRole = roleFilter === "all" || u.vaitro === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredUsers, page]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            Quản lý tài khoản người dùng
          </h2>
          <p className="text-xs text-slate-500">
            Xem danh sách thành viên, phân quyền vai trò quản trị (Admin/Buyer) hoặc xóa tài khoản.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer text-slate-700 dark:text-slate-300"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {/* Filter and Search */}
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/85 dark:bg-slate-900/50 text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">Vai trò:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 rounded-lg text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="buyer">Gia chủ (Buyer)</option>
          </select>
        </div>
      </GlassCard>

      {/* Users Table Card */}
      <GlassCard className="p-6 overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-600 dark:text-slate-300 font-semibold animate-pulse">
            Đang tải danh sách tài khoản người dùng...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-600 dark:text-slate-400 font-medium">
            Không tìm thấy người dùng nào khớp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-4 text-left">Họ và tên</th>
                  <th className="pb-3 px-4 text-left">Email</th>
                  <th className="pb-3 px-4 text-left">Số điện thoại</th>
                  <th className="pb-3 px-4 text-left">Vai trò</th>
                  <th className="pb-3 pl-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedUsers.map((u) => {
                  const isSelf = u.idnguoidung === currentUser?.idnguoidung;

                  return (
                    <tr
                      key={u.idnguoidung}
                      className="text-slate-700 dark:text-slate-300 hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition-colors"
                    >
                      <td className="py-3.5 pr-4 font-bold text-slate-900 dark:text-slate-200">
                        {u.hoten} {isSelf && <span className="text-[10px] text-indigo-500 font-normal">(Tôi)</span>}
                      </td>
                      <td className="py-3.5 px-4 font-medium">{u.email}</td>
                      <td className="py-3.5 px-4 text-xs font-mono">{u.sodienthoai || "Chưa thiết lập"}</td>
                      <td className="py-3.5 px-4">
                        <Badge
                          className={`rounded-full border-transparent font-bold ${
                            u.vaitro === "admin"
                              ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {u.vaitro === "admin" ? "Admin" : "Buyer"}
                        </Badge>
                      </td>
                      <td className="py-3.5 pl-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSelf}
                            onClick={() => setUserToModifyRole(u)}
                            className="text-xs h-8 cursor-pointer border-slate-200 dark:border-slate-800 dark:text-white"
                            title="Thay đổi vai trò thành viên"
                          >
                            Đổi Quyền
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSelf}
                            onClick={() => setUserToDelete(u)}
                            className="text-xs h-8 cursor-pointer text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900 hover:text-rose-700 border-slate-200 dark:border-slate-800"
                            title="Xóa tài khoản vĩnh viễn"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 text-xs text-slate-500">
                <div>
                  Hiển thị {(page - 1) * PAGE_SIZE + 1} –{" "}
                  {Math.min(page * PAGE_SIZE, filteredUsers.length)} trong tổng số{" "}
                  {filteredUsers.length} tài khoản
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 w-16 cursor-pointer border-slate-200 dark:border-slate-800"
                  >
                    Trước
                  </Button>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Trang {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 w-16 cursor-pointer border-slate-200 dark:border-slate-800"
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Two-step Deletion Confirmation Dialog */}
      <Dialog open={userToDelete !== null} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              Yêu cầu xác nhận xóa người dùng
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Thao tác này sẽ xóa vĩnh viễn tài khoản người dùng ra khỏi cơ sở dữ liệu. Hành động này **không thể hoàn tác**.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs space-y-1">
              <p className="font-semibold">Họ tên: <b>{userToDelete?.hoten}</b></p>
              <p className="font-semibold">Email: <b>{userToDelete?.email}</b></p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nhập lại chính xác địa chỉ Email người dùng để xác nhận:
              </label>
              <Input
                placeholder="Nhập email người dùng..."
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="bg-white/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)} disabled={deleting} className="cursor-pointer dark:text-white">
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting || confirmEmail !== userToDelete?.email}
              className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              {deleting ? "Đang xóa..." : "Xác nhận Xóa vĩnh viễn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Two-step Role Change Confirmation Dialog */}
      <Dialog open={userToModifyRole !== null} onOpenChange={(open) => !open && setUserToModifyRole(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-indigo-600 flex items-center gap-1.5 font-bold">
              <Shield className="h-5 w-5" />
              Yêu cầu xác nhận đổi vai trò
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Bạn đang thay đổi vai trò tài khoản từ <b>{userToModifyRole?.vaitro === "admin" ? "Admin" : "Buyer"}</b> thành{" "}
              <b>{userToModifyRole?.vaitro === "admin" ? "Buyer" : "Admin"}</b>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Để xác nhận, vui lòng nhập lại chính xác email: <b>{userToModifyRole?.email}</b>
              </label>
              <Input
                placeholder="Nhập email xác nhận..."
                value={confirmRoleEmail}
                onChange={(e) => setConfirmRoleEmail(e.target.value)}
                className="bg-white/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToModifyRole(null)} disabled={modifyingRole} className="cursor-pointer dark:text-white">
              Hủy
            </Button>
            <Button
              onClick={handleRoleChangeConfirm}
              disabled={modifyingRole || confirmRoleEmail !== userToModifyRole?.email}
              className="bg-indigo-600 hover:bg-indigo-750 text-white cursor-pointer font-semibold"
            >
              {modifyingRole ? "Đang xử lý..." : "Xác nhận Thay đổi vai trò"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
