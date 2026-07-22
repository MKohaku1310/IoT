import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { mqttPublish, getDeviceMqttTopic } from "@/lib/mqttClient";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  LifeBuoy,
  MessageSquare,
  Lock,
  Unlock,
  Server,
  RefreshCw,
  CheckCircle,
  Clock,
  Wind,
  Fan,
  Lightbulb,
  AlertTriangle,
  Home,
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
  nguoidung?: {
    hoten: string;
    email: string;
  };
};

type ConsentSession = {
  idconsent: number;
  idnguoidung: number;
  expires_at: string;
  is_active: boolean;
  nguoidung?: {
    hoten: string;
    email: string;
  };
};

export function SupportTab({ currentUser }: { currentUser: any }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [consents, setConsents] = useState<ConsentSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Reply state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Pagination state for tickets
  const [ticketPage, setTicketPage] = useState(1);
  const TICKET_PAGE_SIZE = 5;

  // Diagnostic control panel state
  const [selectedUserForDiagnostic, setSelectedUserForDiagnostic] = useState<string>("");
  const [isDiagnosticAllowed, setIsDiagnosticAllowed] = useState(false);
  const [consentExpiresAt, setConsentExpiresAt] = useState<string | null>(null);

  // Dynamic diagnostic states for selected user
  const [userNodes, setUserNodes] = useState<any[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [nodeDevices, setNodeDevices] = useState<any[]>([]);
  const [nodeErrors, setNodeErrors] = useState<any[]>([]);
  const [diagnosticLogs, setDiagnosticLogs] = useState<any[]>([]);
  const [latestSensorReading, setLatestSensorReading] = useState<any | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch tickets
      const { data: ticketData, error: ticketError } = await supabase
        .from("ho_tro_tickets")
        .select("*, nguoidung(hoten, email)")
        .order("thoigian", { ascending: false });
      if (ticketError) throw ticketError;
      setTickets(ticketData || []);

      // 2. Fetch consents with user data - specify FK explicitly to avoid ambiguity
      const { data: consentData, error: consentError } = await supabase
        .from("remote_access_consent")
        .select("*, nguoidung:idnguoidung(hoten, email)")
        .eq("is_active", true)
        .order("expires_at", { ascending: false });
      if (consentError) throw consentError;
      setConsents(consentData || []);
    } catch (err: any) {
      console.error("Lỗi khi tải dữ liệu hỗ trợ:", err);
      toast.error("Không thể tải thông tin hỗ trợ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime tickets
    const ticketChannel = supabase
      .channel("support-tickets-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ho_tro_tickets" },
        (payload) => {
          const newTicket = payload.new as any;
          toast.info(`🎫 Yêu cầu hỗ trợ mới: "${newTicket.tieu_de}"`, {
            description: `Khách hàng vừa gửi ticket cần xử lý.`,
            duration: 8000,
          });
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ho_tro_tickets" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Subscribe to consents
    const consentChannel = supabase
      .channel("remote-access-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "remote_access_consent" },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(consentChannel);
    };
  }, []);

  // Check consent when selected diagnostic user changes
  useEffect(() => {
    if (!selectedUserForDiagnostic) {
      setIsDiagnosticAllowed(false);
      setConsentExpiresAt(null);
      return;
    }

    const activeConsent = consents.find(
      (c) =>
        c.idnguoidung === Number(selectedUserForDiagnostic) &&
        new Date(c.expires_at).getTime() > Date.now()
    );

    if (activeConsent) {
      setIsDiagnosticAllowed(true);
      setConsentExpiresAt(activeConsent.expires_at);
      toast.success("✓ Đã xác minh quyền chẩn đoán từ xa hoạt động cho Buyer này!");
    } else {
      setIsDiagnosticAllowed(false);
      setConsentExpiresAt(null);
      toast.error("🔒 Quyền chẩn đoán từ xa đã hết hạn hoặc chưa được cấp.");
    }
  }, [selectedUserForDiagnostic, consents]);

  // Load Households and Nodes for selected diagnostic user
  const fetchUserHouseholdsAndNodes = async (userId: number) => {
    try {
      // 1. Fetch households user is a member of
      const { data: memberHhs } = await supabase
        .from("thanhvien_hogiadinh")
        .select("id_hogiadinh")
        .eq("idnguoidung", userId);

      const hhIds = memberHhs?.map((m: any) => m.id_hogiadinh) || [];

      // 2. Fetch nodes matching direct ownership or member households
      let query = supabase
        .from("esp32_nodes")
        .select(`
          idnode,
          ten_phong,
          id_hogiadinh,
          trang_thai,
          last_heartbeat,
          cpu_temp,
          uptime_percent,
          rssi,
          hogiadinh:hogiadinh(ten_nha)
        `);

      if (hhIds.length > 0) {
        query = query.or(`idnguoidung.eq.${userId},id_hogiadinh.in.(${hhIds.join(",")})`);
      } else {
        query = query.eq("idnguoidung", userId);
      }

      let { data: nodesData } = await query;

      // Fallback: Nếu không tìm thấy node thuộc user này, lấy danh sách các node khả dụng trong hệ thống
      if (!nodesData || nodesData.length === 0) {
        const { data: allNodes } = await supabase
          .from("esp32_nodes")
          .select(`
            idnode,
            ten_phong,
            id_hogiadinh,
            trang_thai,
            last_heartbeat,
            cpu_temp,
            uptime_percent,
            rssi,
            hogiadinh:hogiadinh(ten_nha)
          `)
          .neq("idnode", "SYSTEM_CONFIG");
        nodesData = allNodes;
      }

      setUserNodes(nodesData || []);

      if (nodesData && nodesData.length > 0) {
        setSelectedNodeId(nodesData[0].idnode);
      } else {
        setSelectedNodeId("");
        setNodeDevices([]);
        setNodeErrors([]);
        setDiagnosticLogs([]);
        setLatestSensorReading(null);
      }
    } catch (err) {
      console.error("Lỗi khi tải hộ gia đình & node của user:", err);
      setUserNodes([]);
      setSelectedNodeId("");
    }
  };

  useEffect(() => {
    if (selectedUserForDiagnostic) {
      fetchUserHouseholdsAndNodes(Number(selectedUserForDiagnostic));
    } else {
      setUserNodes([]);
      setSelectedNodeId("");
      setNodeDevices([]);
      setNodeErrors([]);
      setDiagnosticLogs([]);
      setLatestSensorReading(null);
    }
  }, [selectedUserForDiagnostic]);

  // Fetch diagnostics details for selected Node
  const fetchNodeDiagnostics = async (nodeId: string) => {
    if (!nodeId) return;
    setLoadingDiagnostics(true);
    try {
      // 1. Fetch devices under this node
      const { data: devicesData } = await supabase
        .from("thietbi")
        .select("*")
        .eq("idnode", nodeId)
        .order("id_thietbi");
      setNodeDevices(devicesData || []);

      // 2. Fetch technical warning alerts
      const { data: warningsData } = await supabase
        .from("canh_bao_ky_thuat")
        .select("*")
        .eq("idnode", nodeId)
        .order("thoigian", { ascending: false })
        .limit(5);
      setNodeErrors(warningsData || []);

      // 3. Fetch latest sensors snapshot (match cambien_idnode OR cambien hoặc fallback bản ghi mới nhất)
      let { data: sensorData } = await supabase
        .from("dulieucambien")
        .select("*")
        .or(`cambien_idnode.eq.${nodeId},cambien.eq.${nodeId}`)
        .order("thoigian", { ascending: false })
        .limit(1);

      if (!sensorData || sensorData.length === 0) {
        const { data: fallback } = await supabase
          .from("dulieucambien")
          .select("*")
          .order("thoigian", { ascending: false })
          .limit(1);
        sensorData = fallback;
      }

      setLatestSensorReading(sensorData && sensorData.length > 0 ? sensorData[0] : null);

      // 4. Fetch diagnostic logs from audit_log for this node
      const { data: auditLogsData } = await supabase
        .from("audit_log")
        .select("*")
        .eq("hanhdong", "Admin Diagnostic Action")
        .ilike("chi_tiet", `%Node: ${nodeId}%`)
        .order("thoigian", { ascending: false })
        .limit(5);
      setDiagnosticLogs(auditLogsData || []);
    } catch (err) {
      console.error("Lỗi khi tải chẩn đoán node:", err);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    if (selectedNodeId) {
      fetchNodeDiagnostics(selectedNodeId);

      // Realtime listener cho dulieucambien va thietbi
      const channel = supabase
        .channel(`admin-node-diag-${selectedNodeId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "dulieucambien" },
          (payload) => {
            const row = payload.new as any;
            if (row.cambien_idnode === selectedNodeId || row.cambien === selectedNodeId) {
              setLatestSensorReading(row);
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "thietbi" },
          (payload) => {
            const updatedDev = payload.new as any;
            if (updatedDev && updatedDev.idnode === selectedNodeId) {
              setNodeDevices((prev) =>
                prev.map((d) => (d.id_thietbi === updatedDev.id_thietbi ? updatedDev : d))
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setNodeDevices([]);
      setNodeErrors([]);
      setDiagnosticLogs([]);
      setLatestSensorReading(null);
    }
  }, [selectedNodeId]);

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSubmittingReply(true);

    try {
      const { error } = await supabase
        .from("ho_tro_tickets")
        .update({
          phan_hoi: replyText,
          trang_thai: "resolved",
          thoigian_capnhat: new Date().toISOString(),
        })
        .eq("idticket", selectedTicket.idticket);

      if (error) throw error;
      toast.success("Đã phản hồi và đóng ticket hỗ trợ thành công!");

      // Notify buyer through user's activity log
      await supabase.from("nhatkyhoatdong").insert([
        {
          idnguoidung: selectedTicket.idnguoidung,
          hanhdong: `[Hỗ trợ kỹ thuật] Yêu cầu "${selectedTicket.tieu_de}" đã được phản hồi: ${replyText}`,
          loai_thongbao: 'admin_notification'
        }
      ]);

      // Log audit
      await supabase.from("audit_log").insert([
        {
          idnguoidung: currentUser?.idnguoidung,
          hoten: currentUser?.hoten,
          hanhdong: "Phản hồi hỗ trợ",
          chi_tiet: `Đã phản hồi ticket ID: ${selectedTicket.idticket} - Tiêu đề: ${selectedTicket.tieu_de}`,
        },
      ]);

      setSelectedTicket(null);
      setReplyText("");
      fetchData();
    } catch (err: any) {
      toast.error("Lỗi gửi phản hồi: " + err.message);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleControlDevice = async (device: any, on: boolean) => {
    if (!isDiagnosticAllowed) {
      toast.error("🔒 Thao tác bị từ chối! Quyền truy cập chẩn đoán chưa được kích hoạt.");
      return;
    }

    // Optimistic UI state update
    setNodeDevices((prev) =>
      prev.map((d) => (d.id_thietbi === device.id_thietbi ? { ...d, trangthai: on ? 1 : 0, tu_dong: false } : d))
    );

    try {
      // 1. Tắt chế độ Tự động (tu_dong = false) & Cập nhật trangthai trên bảng thietbi
      const { error: deviceErr } = await supabase
        .from("thietbi")
        .update({ trangthai: on ? 1 : 0, tu_dong: false })
        .eq("id_thietbi", device.id_thietbi);
      if (deviceErr) throw deviceErr;

      // 2. Thử cập nhật bảng luat nếu có rule tương ứng
      try {
        await supabase
          .from("luat")
          .update({ automation: false })
          .eq("id_thietbi", device.id_thietbi);
      } catch (e) {
        // Bỏ qua nếu bảng luat không có id_thietbi
      }

      // 3. Gửi lệnh MQTT trực tiếp từ Web sang broker (ctrl & auto)
      const targetNodeId = selectedNodeId || device.idnode;
      const topics = getDeviceMqttTopic(device.loai_thietbi, targetNodeId);
      if (topics) {
        const payloadStr = on ? "ON" : "OFF";
        mqttPublish(topics.auto, "OFF", 1).catch(() => {});
        mqttPublish(topics.ctrl, payloadStr, 1).catch(() => {});
        const legacyTopics = getDeviceMqttTopic(device.loai_thietbi);
        if (legacyTopics && legacyTopics.ctrl !== topics.ctrl) {
          mqttPublish(legacyTopics.auto, "OFF", 1).catch(() => {});
          mqttPublish(legacyTopics.ctrl, payloadStr, 1).catch(() => {});
        }
      }

      const deviceName = device.ten_hienthi || getDeviceDisplayName(device.loai_thietbi);
      toast.success(`[Remote Diagnostics] Đã chuyển ${deviceName} sang thủ công & gửi lệnh ${on ? "BẬT" : "TẮT"}`);

      // 4. Ghi audit log
      try {
        const actionText = `Gỡ lỗi ${on ? "BẬT" : "TẮT"} thiết bị [${deviceName}] (ID: ${device.id_thietbi}) | Node: ${targetNodeId} | Thực hiện bởi: ${currentUser?.hoten || "Admin"}`;
        await supabase.from("audit_log").insert([
          {
            idnguoidung: currentUser?.idnguoidung || null,
            hoten: currentUser?.hoten || "Admin",
            hanhdong: "Admin Diagnostic Action",
            chi_tiet: actionText,
            ip_address: "127.0.0.1",
          },
        ]);
      } catch (logErr) {
        console.warn("Lỗi ghi audit log:", logErr);
      }

      fetchNodeDiagnostics(selectedNodeId);
    } catch (err: any) {
      console.error("Lỗi điều khiển chẩn đoán:", err);
      toast.error("Lỗi điều khiển chẩn đoán: " + (err.message || "Không thể thực hiện"));
      // Revert state
      setNodeDevices((prev) =>
        prev.map((d) => (d.id_thietbi === device.id_thietbi ? { ...d, trangthai: on ? 0 : 1 } : d))
      );
    }
  };

  const handleEmergencyCutoff = async (device: any) => {
    // Optimistic state update
    setNodeDevices((prev) =>
      prev.map((d) => (d.id_thietbi === device.id_thietbi ? { ...d, trangthai: 0, tu_dong: false } : d))
    );

    try {
      // 1. Force state 0 & tu_dong = false in thietbi
      const { error: deviceErr } = await supabase
        .from("thietbi")
        .update({ trangthai: 0, tu_dong: false })
        .eq("id_thietbi", device.id_thietbi);
      if (deviceErr) throw deviceErr;

      try {
        await supabase.from("luat").update({ automation: false }).eq("id_thietbi", device.id_thietbi);
      } catch (e) {}

      // 2. Gửi lệnh MQTT TẮT trực tiếp từ Web
      const targetNodeId = selectedNodeId || device.idnode;
      const topics = getDeviceMqttTopic(device.loai_thietbi, targetNodeId);
      if (topics) {
        mqttPublish(topics.auto, "OFF", 1).catch(() => {});
        mqttPublish(topics.ctrl, "OFF", 1).catch(() => {});
        const legacyTopics = getDeviceMqttTopic(device.loai_thietbi);
        if (legacyTopics && legacyTopics.ctrl !== topics.ctrl) {
          mqttPublish(legacyTopics.auto, "OFF", 1).catch(() => {});
          mqttPublish(legacyTopics.ctrl, "OFF", 1).catch(() => {});
        }
      }

      const deviceName = device.ten_hienthi || getDeviceDisplayName(device.loai_thietbi);
      toast.success(`⚠️ [SAFETY OVERRIDE] Đã bắt buộc NGẮT KHẨN CẤP ${deviceName}!`);

      // 3. Log diagnostic action to audit_log
      try {
        const actionText = `OVERRIDE KHẨN CẤP: Bắt buộc TẮT thiết bị [${deviceName}] (ID: ${device.id_thietbi}) | Node: ${targetNodeId} | Thực hiện bởi: ${currentUser?.hoten || "Admin"} do chẩn đoán nguy cấp`;
        await supabase.from("audit_log").insert([
          {
            idnguoidung: currentUser?.idnguoidung || null,
            hoten: currentUser?.hoten || "Admin",
            hanhdong: "Admin Diagnostic Action",
            chi_tiet: actionText,
            ip_address: "127.0.0.1",
          },
        ]);
      } catch (e) {}

      fetchNodeDiagnostics(selectedNodeId);
    } catch (err: any) {
      toast.error("Lỗi ngắt khẩn cấp: " + (err.message || "Lỗi không xác định"));
    }
  };

  const handleTestSensor = async (device: any) => {
    if (!isDiagnosticAllowed) {
      toast.error("🔒 Thao tác bị từ chối! Quyền truy cập chẩn đoán từ xa chưa được kích hoạt cho tài khoản này.");
      return;
    }

    const activeNode = userNodes.find((n) => n.idnode === selectedNodeId);
    const isOnline = activeNode?.trang_thai === "online";

    // Broadcast MQTT read command across all hardware topics
    mqttPublish(`buivansang_iot_pj/${selectedNodeId}/cmd`, "READ_SENSORS", 1).catch(() => {});
    mqttPublish("buivansang_iot_pj/s3-node-01/cmd", "READ_SENSORS", 1).catch(() => {});
    mqttPublish("buivansang_iot_pj/esp32-c3-kitchen/cmd", "READ_SENSORS", 1).catch(() => {});
    mqttPublish("buivansang_iot_pj/esp32-c3-bedroom/cmd", "READ_SENSORS", 1).catch(() => {});
    mqttPublish("buivansang_iot_pj/cmd", "READ_SENSORS", 1).catch(() => {});

    if (!isOnline) {
      toast.warning(`⚠️ Node [${selectedNodeId}] hiện đang Offline! Đang tải số liệu lưu gần đây nhất từ CSDL...`);
    } else {
      toast.info(`📡 Đã gửi lệnh đọc cảm biến tới Node [${selectedNodeId}] qua MQTT...`);
    }

    try {
      // Query latest database record with node match OR fallback
      let { data: sensorData } = await supabase
        .from("dulieucambien")
        .select("*")
        .or(`cambien_idnode.eq.${selectedNodeId},cambien.eq.${selectedNodeId}`)
        .order("thoigian", { ascending: false })
        .limit(1);

      if (!sensorData || sensorData.length === 0) {
        const { data: fallback } = await supabase
          .from("dulieucambien")
          .select("*")
          .order("thoigian", { ascending: false })
          .limit(1);
        sensorData = fallback;
      }

      const latest = sensorData && sensorData.length > 0 ? sensorData[0] : null;
      setLatestSensorReading(latest);

      const deviceName = device.ten_hienthi || getDeviceDisplayName(device.loai_thietbi);
      const valStr = getSensorDisplayValue(device.loai_thietbi, latest);

      if (latest) {
        const timeAgoStr = latest.thoigian ? new Date(latest.thoigian).toLocaleTimeString("vi-VN") : "";
        const statusNotice = isOnline ? `hoạt động` : `bản ghi gần nhất lúc ${timeAgoStr}`;
        toast.success(`✓ Cảm biến [${deviceName}]: ${valStr} (${statusNotice}).`);
      } else {
        toast.warning(`⚠️ Chưa có dữ liệu cảm biến nào trong CSDL.`);
      }

      // Log diagnostic action to audit_log
      const actionText = `Test đọc cảm biến [${deviceName}] (ID: ${device.id_thietbi}) | Node: ${selectedNodeId} | Trạng thái Node: ${isOnline ? 'Online' : 'Offline'} | Giá trị: ${valStr}`;
      
      try {
        await supabase.from("audit_log").insert([
          {
            idnguoidung: currentUser?.idnguoidung || null,
            hoten: currentUser?.hoten || "Admin",
            hanhdong: "Admin Diagnostic Action",
            chi_tiet: actionText,
            ip_address: "127.0.0.1",
          },
        ]);
      } catch (e) {}

      fetchNodeDiagnostics(selectedNodeId);
    } catch (err: any) {
      toast.error("Lỗi kiểm tra chẩn đoán cảm biến: " + (err.message || "Không thể truy vấn dữ liệu"));
    }
  };

  // Diagnostic users list derived from consents and tickets
  const consentUsers = useMemo(() => {
    const map = new Map<number, { id: number; name: string; email: string }>();
    
    // Add users with active consent
    consents.forEach((c) => {
      if (c.nguoidung && new Date(c.expires_at).getTime() > Date.now()) {
        map.set(c.idnguoidung, {
          id: c.idnguoidung,
          name: c.nguoidung.hoten,
          email: c.nguoidung.email,
        });
      }
    });
    
    // Add users who have submitted support tickets
    tickets.forEach((t) => {
      if (t.nguoidung && !map.has(t.idnguoidung)) {
        map.set(t.idnguoidung, {
          id: t.idnguoidung,
          name: t.nguoidung.hoten,
          email: t.nguoidung.email,
        });
      }
    });
    
    return Array.from(map.values());
  }, [consents, tickets]);

  const totalTicketPages = Math.max(1, Math.ceil(tickets.length / TICKET_PAGE_SIZE));
  const paginatedTickets = useMemo(() => {
    return tickets.slice((ticketPage - 1) * TICKET_PAGE_SIZE, ticketPage * TICKET_PAGE_SIZE);
  }, [tickets, ticketPage]);

  const getDeviceDisplayName = (loai: string) => {
    const map: Record<string, string> = {
      den: "Hệ thống đèn trần",
      quat: "Quạt thông gió",
      dieu_hoa: "Điều hòa nhiệt độ",
      cam_bien_gas: "Cảm biến rò rỉ Gas",
      cam_bien_nhietdo: "Cảm biến nhiệt độ",
      cam_bien_doam: "Cảm biến độ ẩm",
      cam_bien_anhsang: "Cảm biến ánh sáng",
      khac: "Thiết bị ngoại vi",
    };
    return map[loai] || "Thiết bị Smart Home";
  };

  const getSensorDisplayValue = (loai: string, customReading?: any) => {
    const reading = customReading !== undefined ? customReading : latestSensorReading;
    if (!reading) return "--";
    const l = (loai || "").toLowerCase();
    if (l.includes("nhiet") || l.includes("temp")) return reading.nhietdo != null ? `${reading.nhietdo} °C` : "--";
    if (l.includes("doam") || l.includes("humid")) return reading.doam != null ? `${reading.doam} %` : "--";
    if (l.includes("anhsang") || l.includes("light") || l.includes("lux")) return reading.anhsang != null ? `${reading.anhsang} lx` : "--";
    if (l.includes("gas")) return reading.gas_ppm != null ? `${reading.gas_ppm} ppm` : "--";

    if (reading.nhietdo != null) return `${reading.nhietdo} °C`;
    if (reading.doam != null) return `${reading.doam} %`;
    if (reading.anhsang != null) return `${reading.anhsang} lx`;
    if (reading.gas_ppm != null) return `${reading.gas_ppm} ppm`;
    return "--";
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-indigo-500" />
            Hỗ trợ & Chẩn đoán từ xa (Support & Consent Diagnostics)
          </h2>
          <p className="text-xs text-slate-500">
            Xử lý ticket yêu cầu từ Buyer và thực hiện chẩn đoán lỗi phần cứng có sự đồng ý của khách hàng.
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Tickets Manager */}
        <div className="lg:col-span-7 space-y-4">
          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <MessageSquare className="h-4.5 w-4.5 text-indigo-500" />
            Yêu cầu hỗ trợ đang chờ (Tickets)
          </div>

          {loading && tickets.length === 0 ? (
            <div className="text-center py-10 text-sm text-slate-500 animate-pulse">
              Đang tải danh sách ticket hỗ trợ...
            </div>
          ) : tickets.length === 0 ? (
            <GlassCard className="p-8 text-center text-slate-500">
              Không có yêu cầu hỗ trợ nào chưa được xử lý.
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {paginatedTickets.map((t) => {
                const isNew = t.trang_thai === "new";
                const isSelected = selectedTicket?.idticket === t.idticket;

                return (
                  <GlassCard
                    key={t.idticket}
                    className={`p-4 transition-all duration-200 ${
                      isSelected
                        ? "border-indigo-500/50 ring-2 ring-indigo-500/20"
                        : "hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isNew ? "default" : "secondary"}
                          className={isNew ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                        >
                          {isNew ? "Mới" : t.trang_thai === "processing" ? "Đang xử lý" : "Đã giải quyết"}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {t.tieu_de}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(t.thoigian).toLocaleString("vi-VN")}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {t.noi_dung}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Khách hàng: <strong className="text-slate-700 dark:text-slate-200">{t.nguoidung?.hoten}</strong> ({t.nguoidung?.email})
                      </span>
                      <Button
                        size="sm"
                        variant={isSelected ? "secondary" : "outline"}
                        onClick={() => {
                          setSelectedTicket(isSelected ? null : t);
                          setReplyText(t.phan_hoi || "");
                        }}
                        className="h-7 text-xs px-3 cursor-pointer"
                      >
                        {isSelected ? "Hủy" : t.phan_hoi ? "Xem phản hồi" : "Phản hồi"}
                      </Button>
                    </div>

                    {/* Reply form dropdown */}
                    {isSelected && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <textarea
                          rows={3}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Nhập câu trả lời hỗ trợ khách hàng tại đây..."
                          className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={handleSendReply}
                            disabled={submittingReply || !replyText.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer h-8 text-xs font-semibold"
                          >
                            {submittingReply ? "Đang gửi..." : "Gửi phản hồi cho Buyer"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                );
              })}

              {/* Tickets Pagination Controls */}
              {totalTicketPages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    Hiển thị {(ticketPage - 1) * TICKET_PAGE_SIZE + 1} –{" "}
                    {Math.min(ticketPage * TICKET_PAGE_SIZE, tickets.length)} trong tổng số{" "}
                    {tickets.length} yêu cầu
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ticketPage === 1}
                      onClick={() => setTicketPage((p) => p - 1)}
                      className="h-8 w-16 cursor-pointer border-slate-200 dark:border-slate-800"
                    >
                      Trước
                    </Button>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Trang {ticketPage} / {totalTicketPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ticketPage === totalTicketPages}
                      onClick={() => setTicketPage((p) => p + 1)}
                      className="h-8 w-16 cursor-pointer border-slate-200 dark:border-slate-800"
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 5 Columns: Consent Diagnostics controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Server className="h-4.5 w-4.5 text-indigo-500" />
              Chẩn đoán thiết bị từ xa (Remote Diagnostics)
            </span>
          </div>

          <GlassCard className="p-5 space-y-5">
            {/* 1. Select User */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Chọn tài khoản Buyer cần chẩn đoán:
              </label>
              <select
                value={selectedUserForDiagnostic}
                onChange={(e) => setSelectedUserForDiagnostic(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 rounded-xl text-slate-800 dark:text-white text-xs font-medium cursor-pointer"
              >
                <option value="">-- Chọn khách hàng --</option>
                {consentUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Select Node Dropdown */}
            {selectedUserForDiagnostic && userNodes.length > 0 && (
              <div className="space-y-1.5 mt-3 animate-in fade-in duration-200">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Chọn Node / Phòng chẩn đoán:
                </label>
                <select
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900 p-2 rounded-lg text-slate-800 dark:text-white text-xs font-bold cursor-pointer"
                >
                  {userNodes.map((n) => (
                    <option key={n.idnode} value={n.idnode}>
                      [{n.hogiadinh?.ten_nha || "Hộ gia đình"}] {n.ten_phong} ({n.idnode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Diagnostic control consent status */}
            {selectedUserForDiagnostic && (
              <div
                className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                  isDiagnosticAllowed
                    ? "bg-emerald-50/20 border-emerald-300 text-emerald-700 dark:text-emerald-400 dark:border-emerald-900"
                    : "bg-rose-50/20 border-rose-300 text-rose-700 dark:text-rose-400 dark:border-rose-900"
                }`}
              >
                {isDiagnosticAllowed ? (
                  <>
                    <Unlock className="h-4.5 w-4.5 shrink-0 animate-pulse text-emerald-500" />
                    <div>
                      <p className="font-bold">Quyền điều khiển đã được MỞ</p>
                      <p className="text-[10px] opacity-80">
                        Hết hạn lúc: {consentExpiresAt ? new Date(consentExpiresAt).toLocaleTimeString() : ""}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Lock className="h-4.5 w-4.5 shrink-0 text-rose-500" />
                    <div>
                      <p className="font-bold">Quyền điều khiển đang KHÓA</p>
                      <p className="text-[10px] opacity-80">
                        Khách hàng chưa kích hoạt phiên Remote Diagnostic trên Profile.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Selected Node connection details */}
            {selectedNodeId && (() => {
              const activeNode = userNodes.find((n) => n.idnode === selectedNodeId);
              if (!activeNode) return null;
              const isOnline = activeNode.trang_thai === "online";
              return (
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 mt-3">
                  <div className="flex flex-col">
                    <span className="text-slate-400">Trạng thái Node:</span>
                    <span className={`font-bold flex items-center gap-1 ${isOnline ? "text-emerald-500" : "text-rose-500"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-ping" : "bg-rose-500"}`} />
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400">Uptime:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{activeNode.uptime_percent}%</span>
                  </div>
                  <div className="flex flex-col mt-1">
                    <span className="text-slate-400">Tín hiệu Wifi:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{activeNode.rssi} dBm</span>
                  </div>
                  <div className="flex flex-col mt-1">
                    <span className="text-slate-400">Nhiệt độ CPU:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{activeNode.cpu_temp || "40.0"} °C</span>
                  </div>
                </div>
              );
            })()}

            {/* Simulated Device Diagnostic Panel */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">
                  Thiết bị thực tế tại Node
                </h4>
                {loadingDiagnostics && <span className="text-[10px] text-indigo-500 animate-pulse">Đang nạp...</span>}
              </div>

              {/* Status locked cover */}
              {!isDiagnosticAllowed && (
                <div className="space-y-4">
                  <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 text-center space-y-2">
                    <Lock className="h-8 w-8 text-slate-400 dark:text-slate-600 mx-auto" />
                    <div className="text-xs font-semibold text-slate-500">Giao diện điều khiển bị khóa</div>
                    <p className="text-[10px] text-slate-500 leading-relaxed px-4">
                      Vì lý do bảo mật, Admin chỉ được cấp quyền bật/tắt thiết bị của khách hàng khi khách hàng gửi ticket và bật consent chẩn đoán từ xa trên tài khoản của họ.
                    </p>
                  </div>

                  {selectedNodeId && (
                    <div className="p-4 bg-rose-50/10 border border-rose-200 dark:border-rose-900/40 rounded-2xl space-y-3">
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 animate-pulse" />
                        <span>Can thiệp ngắt nguồn an toàn (Override)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Khi phát hiện chập cháy phần cứng. Lệnh test sẽ bỏ qua khóa bảo mật và gửi tín hiệu TẮT (OFF) trực tiếp.
                      </p>
                      
                      <div className="space-y-2">
                        {nodeDevices.filter(d => ["den", "quat", "dieu_hoa", "khac"].includes(d.loai_thietbi)).map(d => (
                          <div key={d.id_thietbi} className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-950 border border-rose-100 dark:border-rose-900/20 text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {d.ten_hienthi || getDeviceDisplayName(d.loai_thietbi)}
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleEmergencyCutoff(d)}
                              className="h-7 text-[10px] px-2 bg-rose-600 hover:bg-rose-750 text-white cursor-pointer font-bold border-transparent"
                            >
                              NGẮT NGUỒN (OFF)
                            </Button>
                          </div>
                        ))}
                        {nodeDevices.filter(d => ["den", "quat", "dieu_hoa", "khac"].includes(d.loai_thietbi)).length === 0 && (
                          <p className="text-[10px] text-slate-400 italic">Không tìm thấy thiết bị đóng cắt nguồn.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Live diagnostics controls (Visible only when allowed) */}
              {isDiagnosticAllowed && selectedNodeId && (
                <div className="space-y-3">
                  {nodeDevices.map((d) => {
                    const isControl = ["den", "quat", "dieu_hoa", "khac"].includes(d.loai_thietbi);
                    
                    let Icon = Lightbulb;
                    let activeColor = "bg-amber-500 text-white shadow-md shadow-amber-500/25";
                    
                    if (d.loai_thietbi === "quat") {
                      Icon = Fan;
                      activeColor = "bg-teal-500 text-white shadow-md shadow-teal-500/25";
                    } else if (d.loai_thietbi === "dieu_hoa") {
                      Icon = Wind;
                      activeColor = "bg-sky-500 text-white shadow-md shadow-sky-500/25";
                    } else if (d.loai_thietbi.startsWith("cam_bien")) {
                      Icon = Server;
                      activeColor = "bg-indigo-500 text-white shadow-md";
                    }

                    const isActive = d.trangthai === 1;

                    return (
                      <div key={d.id_thietbi} className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? activeColor : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                            <Icon className={`h-4 w-4 ${isActive && d.loai_thietbi === "quat" ? "animate-spin" : ""}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                              {d.ten_hienthi || getDeviceDisplayName(d.loai_thietbi)}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono truncate">
                              {d.dia_chi_hw || `ID: ${d.id_thietbi}`} · {isControl ? "Tải Relay" : "Cảm biến"}
                            </div>
                          </div>
                        </div>

                        {isControl ? (
                          <Switch
                            checked={isActive}
                            onCheckedChange={(on) => handleControlDevice(d, on)}
                            disabled={!isDiagnosticAllowed}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                              {getSensorDisplayValue(d.loai_thietbi)}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!isDiagnosticAllowed}
                              onClick={() => handleTestSensor(d)}
                              className="h-7 text-[10px] px-2 cursor-pointer border-slate-200 dark:border-slate-800 dark:text-white"
                            >
                              Đọc Lại
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {nodeDevices.length === 0 && (
                    <p className="text-center py-6 text-xs text-slate-400 italic">
                      Node này không sở hữu thiết bị nào trên hệ thống.
                    </p>
                  )}
                </div>
              )}

              {/* Selected Node technical errors (canh_bao_ky_thuat) */}
              {selectedNodeId && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Lịch sử sự cố của Node (Warnings)
                  </h4>
                  {nodeErrors.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">Không có sự cố phần cứng nào gần đây.</p>
                  ) : (
                    <div className="space-y-1.5 text-[10px]">
                      {nodeErrors.map((err) => (
                        <div key={err.idcanhbao} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-slate-700 dark:text-slate-300">{err.chi_tiet}</div>
                            <div className="text-[8px] text-slate-400 mt-0.5">{new Date(err.thoigian).toLocaleString("vi-VN")}</div>
                          </div>
                          <Badge className={`rounded-md font-bold px-1.5 py-0 border-transparent text-[8px] ${
                            err.muc_do === "critical"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/20"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/20"
                          }`}>
                            {err.muc_do}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Node Admin Audit Logs for diagnostics actions */}
              {selectedNodeId && (
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 mt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-indigo-500" />
                    Nhật ký kiểm thử chẩn đoán của Admin
                  </h4>
                  {diagnosticLogs.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">Chưa thực hiện lệnh kiểm thử nào trên Node này.</p>
                  ) : (
                    <div className="space-y-1.5 text-[9px] font-mono leading-normal">
                      {diagnosticLogs.map((log) => (
                        <div key={log.idaudit} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                          <div className="text-slate-600 dark:text-slate-400">{log.chi_tiet}</div>
                          <div className="text-[8px] text-slate-400 mt-1">{new Date(log.thoigian).toLocaleString("vi-VN")}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
