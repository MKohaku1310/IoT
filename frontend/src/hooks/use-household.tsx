/**
 * use-household.tsx
 * Context + Hook quản lý Household Membership:
 * - Lấy thông tin household hiện tại của user
 * - Mời thành viên qua email
 * - Tạo / sử dụng mã mời (QR)
 * - Quản lý quyền thành viên
 * - Realtime subscription cho thành viên mới
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { HouseholdData, HouseholdMemberData, InviteCodeData } from "@/components/dashboard/shared/types";
import { toast } from "sonner";

// ============================================================
// Types
// ============================================================
type HouseholdRole = "owner" | "member" | null;
type Permission = "full_control" | "view_only";

interface HouseholdContextValue {
  household: HouseholdData | null;
  members: HouseholdMemberData[];
  householdRole: HouseholdRole;
  householdPermission: Permission;
  householdId: number | null;
  loading: boolean;
  refreshHousehold: () => Promise<void>;
  /** Owner: Mời thành viên bằng email */
  inviteByEmail: (email: string, permission: Permission) => Promise<boolean>;
  /** Owner: Tạo mã mời (UUID string). Trả về mã hoặc null nếu lỗi */
  generateInviteCode: (permission: Permission) => Promise<InviteCodeData | null>;
  /** Member: Join household bằng mã mời */
  joinByCode: (code: string) => Promise<"ok" | "not_found" | "expired" | "already_used" | "already_member" | "error">;
  /** Owner: Xóa thành viên khỏi household */
  removeMember: (idThanhVien: number) => Promise<boolean>;
  /** Owner: Đổi quyền thành viên */
  changeMemberPermission: (idThanhVien: number, permission: Permission) => Promise<boolean>;
  /** Owner: Tạo household mới */
  createHousehold: (tenNha: string, diaChi: string) => Promise<boolean>;
  /** Member: Rời khỏi household */
  leaveHousehold: () => Promise<boolean>;
}

// ============================================================
// Default context
// ============================================================
const HouseholdContext = createContext<HouseholdContextValue>({
  household: null,
  members: [],
  householdRole: null,
  householdPermission: "full_control",
  householdId: null,
  loading: true,
  refreshHousehold: async () => {},
  inviteByEmail: async () => false,
  generateInviteCode: async () => null,
  joinByCode: async () => "error",
  removeMember: async () => false,
  changeMemberPermission: async () => false,
  createHousehold: async () => false,
  leaveHousehold: async () => false,
});

// ============================================================
// Hook
// ============================================================
export function useHousehold() {
  return useContext(HouseholdContext);
}

// ============================================================
// Provider
// ============================================================
export function HouseholdProvider({
  children,
  currentUser,
}: {
  children: ReactNode;
  currentUser: { idnguoidung?: number; hoten?: string; email?: string; vaitro?: string } | null;
}) {
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [members, setMembers] = useState<HouseholdMemberData[]>([]);
  const [householdRole, setHouseholdRole] = useState<HouseholdRole>(null);
  const [householdPermission, setHouseholdPermission] = useState<Permission>("full_control");
  const [householdId, setHouseholdId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = currentUser?.idnguoidung ? Number(currentUser.idnguoidung) : null;

  // ── Refresh household data ──────────────────────────────────
  const refreshHousehold = useCallback(async () => {
    if (!userId) {
      setHousehold(null);
      setMembers([]);
      setHouseholdRole(null);
      setHouseholdId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Tìm membership của user hiện tại
      const { data: membershipData, error: memberErr } = await supabase
        .from("thanhvien_hogiadinh")
        .select("id_hogiadinh, vaitro, quyen_dieu_khien")
        .eq("idnguoidung", userId)
        .maybeSingle();

      if (memberErr || !membershipData) {
        setHousehold(null);
        setMembers([]);
        setHouseholdRole(null);
        setHouseholdId(null);
        setLoading(false);
        return;
      }

      const hid = membershipData.id_hogiadinh;
      setHouseholdId(hid);
      setHouseholdRole(membershipData.vaitro as HouseholdRole);
      setHouseholdPermission(
        membershipData.vaitro === "owner"
          ? "full_control"
          : (membershipData.quyen_dieu_khien as Permission) ?? "full_control"
      );

      // 2. Lấy thông tin household
      const { data: hhData, error: hhErr } = await supabase
        .from("hogiadinh")
        .select("*")
        .eq("id_hogiadinh", hid)
        .single();

      if (!hhErr && hhData) {
        setHousehold(hhData as HouseholdData);
      }

      // 3. Lấy danh sách thành viên (join với nguoidung)
      const { data: membersData, error: membersErr } = await supabase
        .from("thanhvien_hogiadinh")
        .select(`
          id_thanhvien,
          id_hogiadinh,
          idnguoidung,
          vaitro,
          quyen_dieu_khien,
          thoigian_thamgia,
          nguoidung:nguoidung(hoten, email, anhdaidien)
        `)
        .eq("id_hogiadinh", hid)
        .order("thoigian_thamgia");

      if (!membersErr && membersData) {
        setMembers(membersData as unknown as HouseholdMemberData[]);
      }
    } catch (err) {
      console.error("Lỗi khi tải thông tin household:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // ── Initial load ──────────────────────────────────────────
  useEffect(() => {
    refreshHousehold();
  }, [refreshHousehold]);

  // ── Realtime subscription: thành viên mới / thay đổi ─────
  useEffect(() => {
    if (!householdId) return;

    const channel = supabase
      .channel(`household-members-${householdId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "thanhvien_hogiadinh" },
        (payload) => {
          const record = payload.new as any;
          const oldRecord = payload.old as any;

          if (payload.eventType === "DELETE") {
            setMembers((prev) =>
              prev.filter((m) => m.id_thanhvien !== oldRecord?.id_thanhvien)
            );
          } else if (record) {
            if (record.id_hogiadinh !== householdId) return;
            // Refresh để có dữ liệu join nguoidung
            void refreshHousehold();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, refreshHousehold]);

  // ── Mời thành viên bằng email ─────────────────────────────
  const inviteByEmail = useCallback(async (email: string, permission: Permission): Promise<boolean> => {
    if (!householdId) return false;
    try {
      // Tìm user theo email
      const { data: userData, error: userErr } = await supabase
        .from("nguoidung")
        .select("idnguoidung, hoten")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (userErr || !userData) {
        toast.error("Không tìm thấy tài khoản với email này!", {
          description: "Hãy chắc chắn người dùng đã đăng ký tài khoản trên hệ thống.",
        });
        return false;
      }

      // Kiểm tra đã là thành viên chưa
      const { data: existingMember } = await supabase
        .from("thanhvien_hogiadinh")
        .select("id_thanhvien")
        .eq("id_hogiadinh", householdId)
        .eq("idnguoidung", userData.idnguoidung)
        .maybeSingle();

      if (existingMember) {
        toast.error("Người dùng này đã là thành viên của hộ gia đình!");
        return false;
      }

      // Thêm thành viên mới
      const { error: insertErr } = await supabase
        .from("thanhvien_hogiadinh")
        .insert([{
          id_hogiadinh: householdId,
          idnguoidung: userData.idnguoidung,
          vaitro: "member",
          quyen_dieu_khien: permission,
        }]);

      if (insertErr) throw insertErr;

      // Ghi log
      await supabase.from("nhatkyhoatdong").insert([{
        idnguoidung: userId,
        ten_nguoi_thaotac: currentUser?.hoten || null,
        loai_thongbao: 'user_action',
        hanhdong: JSON.stringify({
          loai_nhatky: "user_action",
          loai_thao_tac: "household_invite",
          description: `Mời ${userData.hoten} (${email}) vào hộ gia đình với quyền ${permission === "full_control" ? "điều khiển đầy đủ" : "chỉ xem"}`,
          timestamp: new Date().toISOString(),
        }),
      }]);

      toast.success(`Đã mời ${userData.hoten} vào hộ gia đình!`, {
        description: `Quyền: ${permission === "full_control" ? "Điều khiển đầy đủ" : "Chỉ xem"}`,
      });
      return true;
    } catch (err: any) {
      console.error("Lỗi khi mời thành viên:", err);
      toast.error("Lỗi khi mời thành viên: " + err.message);
      return false;
    }
  }, [householdId, userId, currentUser]);

  // ── Tạo mã mời ───────────────────────────────────────────
  const generateInviteCode = useCallback(async (permission: Permission): Promise<InviteCodeData | null> => {
    if (!householdId) return null;
    try {
      const { data, error } = await supabase
        .from("ma_moi")
        .insert([{
          id_hogiadinh: householdId,
          quyen_dieu_khien: permission,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      toast.success("Đã tạo mã mời!", { description: "Mã có hiệu lực trong 24 giờ." });
      return data as InviteCodeData;
    } catch (err: any) {
      console.error("Lỗi khi tạo mã mời:", err);
      toast.error("Lỗi khi tạo mã mời: " + err.message);
      return null;
    }
  }, [householdId]);

  // ── Join bằng mã mời ──────────────────────────────────────
  const joinByCode = useCallback(async (
    code: string
  ): Promise<"ok" | "not_found" | "expired" | "already_used" | "already_member" | "error"> => {
    if (!userId) return "error";
    try {
      const { data, error } = await supabase.rpc("join_by_invite_code", {
        p_ma_moi: code.trim(),
        p_idnguoidung: userId,
      });

      if (error) throw error;

      const result = data as string;

      if (result === "ok") {
        toast.success("Đã tham gia hộ gia đình thành công!");
        await refreshHousehold();
      } else if (result === "not_found") {
        toast.error("Mã mời không hợp lệ!");
      } else if (result === "expired") {
        toast.error("Mã mời đã hết hạn!", { description: "Yêu cầu owner tạo mã mời mới." });
      } else if (result === "already_used") {
        toast.error("Mã mời đã được sử dụng!");
      } else if (result === "already_member") {
        toast.info("Bạn đã là thành viên của hộ gia đình này!");
        await refreshHousehold();
      }

      return result as any;
    } catch (err: any) {
      console.error("Lỗi khi join bằng mã mời:", err);
      toast.error("Lỗi khi nhập mã mời: " + err.message);
      return "error";
    }
  }, [userId, refreshHousehold]);

  // ── Xóa thành viên ────────────────────────────────────────
  const removeMember = useCallback(async (idThanhVien: number): Promise<boolean> => {
    try {
      const member = members.find((m) => m.id_thanhvien === idThanhVien);
      const { error } = await supabase
        .from("thanhvien_hogiadinh")
        .delete()
        .eq("id_thanhvien", idThanhVien);

      if (error) throw error;

      await supabase.from("nhatkyhoatdong").insert([{
        idnguoidung: userId,
        ten_nguoi_thaotac: currentUser?.hoten || null,
        loai_thongbao: 'user_action',
        hanhdong: JSON.stringify({
          loai_nhatky: "user_action",
          loai_thao_tac: "household_remove_member",
          description: `Xóa thành viên ${member?.nguoidung?.hoten || "unknown"} khỏi hộ gia đình`,
          timestamp: new Date().toISOString(),
        }),
      }]);

      toast.success("Đã xóa thành viên khỏi hộ gia đình!");
      return true;
    } catch (err: any) {
      toast.error("Lỗi khi xóa thành viên: " + err.message);
      return false;
    }
  }, [members, userId, currentUser]);

  // ── Đổi quyền thành viên ─────────────────────────────────
  const changeMemberPermission = useCallback(async (
    idThanhVien: number,
    permission: Permission
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("thanhvien_hogiadinh")
        .update({ quyen_dieu_khien: permission })
        .eq("id_thanhvien", idThanhVien);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) =>
          m.id_thanhvien === idThanhVien
            ? { ...m, quyen_dieu_khien: permission }
            : m
        )
      );

      toast.success(`Đã cập nhật quyền thành viên!`, {
        description: permission === "full_control" ? "Điều khiển đầy đủ" : "Chỉ xem",
      });
      return true;
    } catch (err: any) {
      toast.error("Lỗi khi đổi quyền: " + err.message);
      return false;
    }
  }, []);

  // ── Tạo household mới ─────────────────────────────────────
  const createHousehold = useCallback(async (tenNha: string, diaChi: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const { data, error } = await supabase.rpc("create_household", {
        p_ten_nha: tenNha.trim() || "Nhà của tôi",
        p_dia_chi: diaChi.trim() || null,
        p_idnguoidung: userId,
      });

      if (error) throw error;

      toast.success("Đã tạo hộ gia đình thành công!", {
        description: `"${tenNha}" đã được tạo. Bạn là chủ hộ.`,
      });
      await refreshHousehold();
      return true;
    } catch (err: any) {
      toast.error("Lỗi khi tạo hộ gia đình: " + err.message);
      return false;
    }
  }, [userId, refreshHousehold]);

  // ── Rời khỏi household ────────────────────────────────────
  const leaveHousehold = useCallback(async (): Promise<boolean> => {
    if (!userId || !householdId) return false;
    try {
      const { error } = await supabase
        .from("thanhvien_hogiadinh")
        .delete()
        .eq("id_hogiadinh", householdId)
        .eq("idnguoidung", userId);

      if (error) throw error;

      setHousehold(null);
      setMembers([]);
      setHouseholdRole(null);
      setHouseholdId(null);
      toast.success("Bạn đã rời khỏi hộ gia đình!");
      return true;
    } catch (err: any) {
      toast.error("Lỗi khi rời hộ gia đình: " + err.message);
      return false;
    }
  }, [userId, householdId]);

  return (
    <HouseholdContext.Provider
      value={{
        household,
        members,
        householdRole,
        householdPermission,
        householdId,
        loading,
        refreshHousehold,
        inviteByEmail,
        generateInviteCode,
        joinByCode,
        removeMember,
        changeMemberPermission,
        createHousehold,
        leaveHousehold,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}
