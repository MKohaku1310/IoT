import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { DeviceData } from "@/components/dashboard/shared/types";
import { toast } from "sonner";

interface AllDevicesContextValue {
  devices: DeviceData[];
  loading: boolean;
  refreshDevices: () => Promise<void>;
  updateDeviceName: (
    deviceId: number,
    newName: string,
    oldName: string,
    currentUserId: number | null,
    currentNodeId: string | null
  ) => Promise<boolean>;
}

const AllDevicesContext = createContext<AllDevicesContextValue>({
  devices: [],
  loading: true,
  refreshDevices: async () => {},
  updateDeviceName: async () => false,
});

export function useAllDevices() {
  const context = useContext(AllDevicesContext);
  if (!context) {
    throw new Error("useAllDevices must be used within an AllDevicesProvider");
  }
  return context;
}

export function AllDevicesProvider({
  children,
  currentUser,
}: {
  children: ReactNode;
  currentUser: any;
}) {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshDevices = useCallback(async () => {
    if (!currentUser) {
      setDevices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Admin: lấy tất cả thiết bị
      if (currentUser.vaitro === "admin") {
        const { data, error } = await supabase
          .from("thietbi")
          .select("*")
          .order("id_thietbi");
        if (!error && data) setDevices(data as DeviceData[]);
        return;
      }

      if (!currentUser.idnguoidung) {
        setDevices([]);
        return;
      }

      const userId = Number(currentUser.idnguoidung);

      // Kiểm tra xem user có thuộc household nào không
      const { data: membershipData } = await supabase
        .from("thanhvien_hogiadinh")
        .select("id_hogiadinh")
        .eq("idnguoidung", userId)
        .maybeSingle();

      let nodeIds: string[] = [];

      if (membershipData?.id_hogiadinh) {
        // Lấy tất cả node của household (member thấy toàn bộ node)
        const { data: nodes } = await supabase
          .from("esp32_nodes")
          .select("idnode")
          .eq("id_hogiadinh", membershipData.id_hogiadinh)
          .eq("trang_thai_duyet", "approved")
          .neq("idnode", "SYSTEM_CONFIG");

        if (nodes) nodeIds = nodes.map((n) => n.idnode);
      } else {
        // Không có household: chỉ lấy node của chính mình
        const { data: nodes } = await supabase
          .from("esp32_nodes")
          .select("idnode")
          .eq("idnguoidung", userId)
          .eq("trang_thai_duyet", "approved");

        if (nodes) nodeIds = nodes.map((n) => n.idnode);
      }

      if (nodeIds.length === 0) {
        setDevices([]);
        return;
      }

      const { data, error } = await supabase
        .from("thietbi")
        .select("*")
        .in("idnode", nodeIds)
        .order("id_thietbi");

      if (!error && data) {
        setDevices(data as DeviceData[]);
      }
    } catch (e) {
      console.error("Lỗi khi tải danh sách thiết bị:", e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Realtime subscription for thietbi changes
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel("global-thietbi-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "thietbi" },
        (payload) => {
          const record = payload.new as DeviceData | undefined;
          const oldRecord = payload.old as Partial<DeviceData> | undefined;

          if (payload.eventType === "DELETE") {
            setDevices((prev) => prev.filter((d) => d.id_thietbi !== (oldRecord as any)?.id_thietbi));
          } else if (record) {
            setDevices((prev) => {
              const idx = prev.findIndex((d) => d.id_thietbi === record.id_thietbi);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = record;
                return next;
              }
              return [...prev, record].sort((a, b) => a.id_thietbi - b.id_thietbi);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const updateDeviceName = async (
    deviceId: number,
    newName: string,
    oldName: string,
    currentUserId: number | null,
    currentNodeId: string | null
  ) => {
    try {
      const cleanName = newName.trim();
      if (!cleanName) {
        toast.error("Tên thiết bị không được để trống!");
        return false;
      }
      if (cleanName.length > 50) {
        toast.error("Tên thiết bị không được quá 50 ký tự!");
        return false;
      }

      // 1. Update the display name in DB
      const { error } = await supabase
        .from("thietbi")
        .update({ ten_hienthi: cleanName })
        .eq("id_thietbi", deviceId);

      if (error) throw error;

      // 2. Ghi 1 dòng vào Activity History (nhatkyhoatdong)
      const device = devices.find(d => d.id_thietbi === deviceId);
      const logNodeId = currentNodeId || device?.idnode || null;
      await supabase.from("nhatkyhoatdong").insert([{
        id_thietbi: deviceId,
        idnguoidung: currentUserId,
        idnode: logNodeId,
        loai_thongbao: 'user_action',
        hanhdong: JSON.stringify({
          loai_nhatky: "user_action",
          loai_thao_tac: "config_change",
          description: `Đổi tên thiết bị "${oldName}" thành "${cleanName}"`,
          device_id: deviceId,
          device_name: cleanName,
          node_id: logNodeId || "",
          timestamp: new Date().toISOString(),
          meta_detail: { old_value: oldName, new_value: cleanName },
        }),
      }]);

      toast.success("Đổi tên thiết bị thành công!");
      return true;
    } catch (e: any) {
      console.error("Lỗi khi đổi tên thiết bị:", e);
      toast.error("Lỗi đổi tên thiết bị: " + e.message);
      return false;
    }
  };

  return (
    <AllDevicesContext.Provider
      value={{
        devices,
        loading,
        refreshDevices,
        updateDeviceName,
      }}
    >
      {children}
    </AllDevicesContext.Provider>
  );
}
