import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { getRoomTypeConfig } from "@/components/dashboard/shared/constants";

// ============================================================
// Node Context — Global state cho "Node đang chọn" toàn app
//
// PHÂN LOẠI TRANG THEO SCOPE:
//
// ▸ NODE-SCOPED (tự động re-render theo node đang chọn):
//   - dashboard     : Bảng điều khiển (hiển thị sensor + device của node)
//   - sensors       : Dữ liệu cảm biến (lọc theo node)
//   - activity      : Lịch sử hoạt động (lọc theo thiết bị của node)
//   - schedule      : Lịch hẹn giờ (lọc theo thiết bị của node)
//   - settings      : Cài đặt ngưỡng cảnh báo (phần threshold per node)
//
// ▸ GLOBAL (không bị ảnh hưởng bởi node đang chọn):
//   - notifications : Thông báo — hiển thị tất cả alert toàn hệ thống
//   - support       : Yêu cầu hỗ trợ — không phân biệt node
//   - health        : Trạng thái hệ thống — tổng quan toàn bộ
//   - fleet         : Quản lý Fleet (admin) — danh sách tất cả node
//   - alerts        : Cảnh báo hệ thống (admin) — tất cả cảnh báo
//   - users         : Quản lý người dùng (admin) — toàn bộ user
//   - audit         : Lịch sử hệ thống (admin) — audit trail toàn cục
//   - business      : Hoạt động kinh doanh (admin) — tổng quan
//   - FloatingAI    : AI Chat — chat tổng, không giới hạn theo node
// ============================================================

const LOCAL_STORAGE_KEY = "sh-current-node-id";

export interface NodeInfo {
  id: string;       // idnode trong DB (ví dụ: ESP32-S3-Node-01)
  name: string;     // ten_phong
  chip: string;     // idnode (dùng cho MQTT mapping)
  icon: any;        // Lucide icon component
  loai_phong?: string;
  trang_thai_duyet?: string;
  chuc_nang?: string[];
}

interface NodeContextValue {
  /** Node đang được chọn hiện tại */
  currentNode: NodeInfo;
  /** ID của node đang chọn */
  currentNodeId: string;
  /** Chuyển sang node khác (tự persist vào localStorage) */
  setCurrentNodeId: (id: string) => void;
  /** Danh sách tất cả node của household hiện tại */
  nodesList: NodeInfo[];
  /** Đang loading danh sách node */
  nodesLoading: boolean;
  /** Refresh danh sách node từ DB */
  refreshNodes: (userId: number, role: string) => Promise<void>;
}

const fallbackNode: NodeInfo = {
  id: "",
  name: "Không có Node",
  chip: "",
  icon: null,
};

const NodeContext = createContext<NodeContextValue>({
  currentNode: fallbackNode,
  currentNodeId: "",
  setCurrentNodeId: () => {},
  nodesList: [],
  nodesLoading: true,
  refreshNodes: async () => {},
});

/**
 * Hook để truy cập Node context từ bất kỳ component nào.
 * Không cần prop drilling — chỉ cần gọi useNode().
 *
 * @example
 * ```tsx
 * const { currentNode, currentNodeId, setCurrentNodeId, nodesList } = useNode();
 * ```
 */
export function useNode() {
  const ctx = useContext(NodeContext);
  if (!ctx) {
    throw new Error("useNode() must be used within a <NodeProvider>");
  }
  return ctx;
}

/**
 * Provider bọc toàn app — cung cấp current node cho mọi component con.
 * Persist `currentNodeId` vào localStorage để refresh không mất lựa chọn.
 */
export function NodeProvider({ children }: { children: ReactNode }) {
  // Đọc nodeId đã lưu từ localStorage (nếu có)
  const [currentNodeId, setCurrentNodeIdRaw] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return window.localStorage.getItem(LOCAL_STORAGE_KEY) || "";
      } catch {
        return "";
      }
    }
    return "";
  });

  const [nodesList, setNodesList] = useState<NodeInfo[]>([]);
  const [nodesLoading, setNodesLoading] = useState(true);

  // Persist vào localStorage mỗi khi thay đổi
  const setCurrentNodeId = useCallback((id: string) => {
    setCurrentNodeIdRaw(id);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, id);
      } catch {}
    }
  }, []);

  // Fetch danh sách node từ DB
  const refreshNodes = useCallback(async (userId: number, role: string) => {
    console.log("[use-node-context] refreshNodes called:", { userId, role });
    setNodesLoading(true);
    try {
      let query = supabase.from("esp32_nodes").select("*").order("idnode", { ascending: true });
      if (role !== "admin") {
        const { data: userHouseholds } = await supabase
          .from("thanhvien_hogiadinh")
          .select("id_hogiadinh")
          .eq("idnguoidung", userId);

        const hIds = userHouseholds?.map((h) => h.id_hogiadinh).filter(Boolean) || [];

        if (hIds.length > 0) {
          query = query.or(`idnguoidung.eq.${userId},id_hogiadinh.in.(${hIds.join(",")})`);
        } else {
          query = query.eq("idnguoidung", userId);
        }
        query = query.eq("trang_thai_duyet", "approved").neq("idnode", "SYSTEM_CONFIG");
      } else {
        query = query.neq("idnode", "SYSTEM_CONFIG");
      }
      const { data, error } = await query;

      console.log("[use-node-context] Query result:", { data, error });

      if (!error && data) {
        const mapped: NodeInfo[] = data.map((n) => {
          const roomConfig = getRoomTypeConfig(n.loai_phong || "phong_khac");
          return {
            id: n.idnode,
            name: n.ten_phong,
            chip: n.idnode,
            icon: roomConfig.icon,
            loai_phong: n.loai_phong,
            trang_thai_duyet: n.trang_thai_duyet,
            chuc_nang: n.chuc_nang,
          };
        });
        console.log("[use-node-context] Mapped nodes:", mapped);
        setNodesList(mapped);

        // Nếu nodeId đã lưu không còn hợp lệ → chọn node đầu tiên
        if (mapped.length > 0) {
          const prev = currentNodeId;
          console.log("[use-node-context] Setting nodeId, prev:", prev, "mapped:", mapped.map(m => ({ id: m.id, name: m.name })));
          if (mapped.some((m) => m.id === prev)) {
            setCurrentNodeId(prev);
          } else {
            const firstId = mapped[0].id;
            setCurrentNodeId(firstId);
          }
        } else {
          setCurrentNodeId("");
        }
      }
    } catch (e) {
      console.error("Lỗi khi tải danh sách Node:", e);
    }
    setNodesLoading(false);
  }, [setCurrentNodeId, currentNodeId]);

  // Tự động khởi tạo danh sách Node từ Supabase session khi Provider mount
  useEffect(() => {
    let active = true;
    async function initNodes() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const authUser = session.user;
          let { data: profile } = await supabase
            .from("nguoidung")
            .select("idnguoidung, vaitro, auth_uid")
            .eq("auth_uid", authUser.id)
            .maybeSingle();

          if (!profile && authUser.email) {
            const { data: byEmail } = await supabase
              .from("nguoidung")
              .select("idnguoidung, vaitro, auth_uid")
              .eq("email", authUser.email)
              .maybeSingle();

            if (byEmail) {
              profile = byEmail;
              if (!byEmail.auth_uid || byEmail.auth_uid !== authUser.id) {
                await supabase
                  .from("nguoidung")
                  .update({ auth_uid: authUser.id })
                  .eq("idnguoidung", byEmail.idnguoidung);
              }
            }
          }

          if (profile && active) {
            await refreshNodes(Number(profile.idnguoidung), profile.vaitro || "buyer");
            return;
          }
        }
        if (active) {
          await refreshNodes(0, "buyer");
        }
      } catch (err) {
        console.error("Lỗi tự động khởi tạo danh sách node:", err);
      }
    }
    initNodes();
    return () => {
      active = false;
    };
  }, [refreshNodes]);

  // Tìm node object hiện tại từ danh sách
  const currentNode = useMemo<NodeInfo>(() => {
    return nodesList.find((n) => n.id === currentNodeId) || nodesList[0] || fallbackNode;
  }, [currentNodeId, nodesList]);

  const value = useMemo<NodeContextValue>(() => ({
    currentNode,
    currentNodeId,
    setCurrentNodeId,
    nodesList,
    nodesLoading,
    refreshNodes,
  }), [currentNode, currentNodeId, setCurrentNodeId, nodesList, nodesLoading, refreshNodes]);

  return (
    <NodeContext.Provider value={value}>
      {children}
    </NodeContext.Provider>
  );
}
