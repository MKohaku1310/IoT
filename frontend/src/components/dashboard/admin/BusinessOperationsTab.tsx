import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Briefcase,
  ShieldCheck,
  BarChart3,
  TrendingUp,
  Award,
  Clock,
  Plus,
  RefreshCw,
  Users,
  DollarSign,
  AlertTriangle,
  Trash2,
  Pencil,
  HelpCircle,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  Tag,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Area,
  PieChart,
  Pie,
  Cell,
  AreaChart,
} from "recharts";

type Transaction = {
  id_giao_dich: string | number;
  loai_giao_dich: "subscription" | "hardware";
  so_tien: number;
  idnguoidung: number | null;
  ref_id: string | null;
  thoigian: string;
  user_email?: string;
  plan_name?: string;
};

type Cost = {
  id_chi_phi: number;
  loai_chi_phi: "server" | "marketing" | "maintenance" | "production";
  so_tien: number;
  mo_ta: string;
  thoigian: string;
};

type NodeWarranty = {
  idnode: string;
  ten_phong: string;
  ngay_kich_hoat: string;
  gia_ban: number;
  thoi_han_bao_hanh_thang: number;
  trang_thai: string;
  id_hogiadinh: number | null;
  owner_name?: string;
  owner_email?: string;
  last_heartbeat?: string;
};

type Subscription = {
  id_thue_bao: number;
  idnguoidung: number;
  id_goi?: number;
  ngay_bat_dau: string;
  ngay_het_han: string;
  trang_thai: "active" | "cancelled" | "expired";
};

export function BusinessOperationsTab() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [nodes, setNodes] = useState<NodeWarranty[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [totalHouseholdsCount, setTotalHouseholdsCount] = useState(0);

  // Fallback state indicators
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [showDbGuide, setShowDbGuide] = useState(false);

  // Dialog & management state
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    type: "server",
    amount: "",
    desc: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [savingExpense, setSavingExpense] = useState(false);

  // Edit Expense State
  const [editingCost, setEditingCost] = useState<Cost | null>(null);

  // Edit Device Warranty State
  const [editingDevice, setEditingDevice] = useState<NodeWarranty | null>(null);

  const [showAddMockTx, setShowAddMockTx] = useState(false);
  const [mockTxForm, setMockTxForm] = useState({
    type: "subscription",
    amount: "99000",
    date: new Date().toISOString().split("T")[0],
  });

  // Table search queries & pagination states
  const [deviceSearch, setDeviceSearch] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [costPage, setCostPage] = useState(1);
  const [txPage, setTxPage] = useState(1);
  const [devicePage, setDevicePage] = useState(1);

  // Create dynamic relative mock data
  const getMockDatabase = () => {
    const now = new Date();
    const mockTxs: Transaction[] = [];
    const mockCostsData: Cost[] = [];
    const mockNodesData: NodeWarranty[] = [
      {
        idnode: "ESP32-S3-Node-01",
        ten_phong: "Phòng khách chính",
        gia_ban: 450000,
        thoi_han_bao_hanh_thang: 12,
        ngay_kich_hoat: new Date(now.getTime() - 120 * 24 * 3600 * 1000).toISOString(),
        trang_thai: "online",
        id_hogiadinh: 1,
        owner_name: "Bùi Văn Sang",
        owner_email: "sang.bui@gmail.com",
        last_heartbeat: new Date().toISOString(),
      },
      {
        idnode: "ESP32-S3-Node-02",
        ten_phong: "Phòng ngủ Master",
        gia_ban: 450000,
        thoi_han_bao_hanh_thang: 12,
        ngay_kich_hoat: new Date(now.getTime() - 65 * 24 * 3600 * 1000).toISOString(),
        trang_thai: "online",
        id_hogiadinh: 1,
        owner_name: "Bùi Văn Sang",
        owner_email: "sang.bui@gmail.com",
        last_heartbeat: new Date().toISOString(),
      },
      {
        idnode: "ESP32-C3-Kitchen",
        ten_phong: "Nhà bếp",
        gia_ban: 450000,
        thoi_han_bao_hanh_thang: 12,
        ngay_kich_hoat: new Date(now.getTime() - 15 * 24 * 3600 * 1000).toISOString(),
        trang_thai: "online",
        id_hogiadinh: 2,
        owner_name: "Nguyễn Thị Hoa",
        owner_email: "hoa.nguyen@gmail.com",
        last_heartbeat: new Date().toISOString(),
      },
      {
        idnode: "ESP32-Node-Legacy-04",
        ten_phong: "Ban công ngoài",
        gia_ban: 450000,
        thoi_han_bao_hanh_thang: 6,
        ngay_kich_hoat: new Date(now.getTime() - 250 * 24 * 3600 * 1000).toISOString(),
        trang_thai: "offline",
        id_hogiadinh: 3,
        owner_name: "Trần Anh Tuấn",
        owner_email: "tuan.tran@yahoo.com",
        last_heartbeat: new Date(now.getTime() - 10 * 24 * 3600 * 1000).toISOString(),
      },
    ];

    // Generate last 6 months data dynamic
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = `Tháng ${d.getMonth() + 1}`;

      // Costs
      mockCostsData.push({
        id_chi_phi: i * 4 + 1,
        loai_chi_phi: "server",
        so_tien: 1200000 + Math.floor(Math.random() * 200000),
        mo_ta: `Phí hạ tầng cloud server AWS - ${monthName}`,
        thoigian: new Date(d.getFullYear(), d.getMonth(), 10).toISOString(),
      });
      mockCostsData.push({
        id_chi_phi: i * 4 + 2,
        loai_chi_phi: "production",
        so_tien: 1800000 + Math.floor(Math.random() * 3000000),
        mo_ta: `Linh kiện sản xuất mạch ESP32 - ${monthName}`,
        thoigian: new Date(d.getFullYear(), d.getMonth(), 5).toISOString(),
      });
      if (i % 2 === 0) {
        mockCostsData.push({
          id_chi_phi: i * 4 + 3,
          loai_chi_phi: "marketing",
          so_tien: 700000 + Math.floor(Math.random() * 800000),
          mo_ta: `Chạy quảng cáo tìm khách hàng - ${monthName}`,
          thoigian: new Date(d.getFullYear(), d.getMonth(), 18).toISOString(),
        });
      }

      // Subscription Tx
      const subTxCount = 15 + i * 8 + Math.floor(Math.random() * 12);
      for (let s = 0; s < subTxCount; s++) {
        const isStandard = Math.random() > 0.6;
        mockTxs.push({
          id_giao_dich: `mock-sub-${i}-${s}`,
          loai_giao_dich: "subscription",
          so_tien: isStandard ? 49000 : 99000,
          idnguoidung: Math.floor(Math.random() * 4) + 1,
          ref_id: `sub-ref-${idxToString(i, s)}`,
          thoigian: new Date(d.getFullYear(), d.getMonth(), Math.floor(Math.random() * 28) + 1).toISOString(),
          user_email: getRandomEmail(s),
          plan_name: isStandard ? "AI Smart Standard" : "Premium AI Smart Pro",
        });
      }

      // Hardware Tx
      const hwTxCount = 2 + Math.floor(Math.random() * 5);
      for (let h = 0; h < hwTxCount; h++) {
        mockTxs.push({
          id_giao_dich: `mock-hw-${i}-${h}`,
          loai_giao_dich: "hardware",
          so_tien: 450000,
          idnguoidung: Math.floor(Math.random() * 4) + 1,
          ref_id: `node-ref-${idxToString(i, h)}`,
          thoigian: new Date(d.getFullYear(), d.getMonth(), Math.floor(Math.random() * 28) + 1).toISOString(),
          user_email: getRandomEmail(h + 10),
          plan_name: "Thiết bị ESP32 Node",
        });
      }
    }

    // Subscriptions count mock
    const mockSubs: Subscription[] = Array.from({ length: 48 }).map((_, index) => {
      const isCancelled = index < 4;
      const isExpired = index >= 44;
      return {
        id_thue_bao: index + 1,
        idnguoidung: index + 1,
        trang_thai: isCancelled ? "cancelled" : isExpired ? "expired" : "active",
        ngay_bat_dau: new Date(now.getTime() - 40 * 24 * 3600 * 1000).toISOString(),
        ngay_het_han: isExpired
          ? new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString()
          : new Date(now.getTime() + 120 * 24 * 3600 * 1000).toISOString(),
      };
    });

    return { mockTxs, mockCostsData, mockNodesData, mockSubs };
  };

  const idxToString = (i: number, s: number) => `${i}_${s}`;
  const getRandomEmail = (index: number) => {
    const emails = [
      "le.hoang@gmail.com",
      "pham.tuan@outlook.com",
      "vu.nam@hotmail.com",
      "dang.phuong@gmail.com",
      "tran.hung@yahoo.com",
      "bui.ha@gmail.com",
      "nguyen.minh@gmail.com",
      "hoang.linh@live.com",
      "phung.an@gmail.com",
      "ngo.duong@gmail.com",
    ];
    return emails[index % emails.length];
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Try to read from real DB tables
      const { data: dbTxs, error: txErr } = await supabase
        .from("giao_dich_kinh_doanh")
        .select("*, nguoidung(email)")
        .order("thoigian", { ascending: false });

      if (txErr) throw txErr;

      const { data: dbCosts, error: costErr } = await supabase
        .from("chi_phi_van_hanh")
        .select("*")
        .order("thoigian", { ascending: false });

      if (costErr) throw costErr;

      const { data: dbNodes, error: nodeErr } = await supabase
        .from("esp32_nodes")
        .select("*, nguoidung(hoten, email)")
        .order("ngay_kich_hoat", { ascending: false });

      if (nodeErr) throw nodeErr;

      const { data: dbSubs, error: subErr } = await supabase
        .from("dang_ky_thue_bao")
        .select("*");

      if (subErr) throw subErr;

      const { count: usersCount } = await supabase
        .from("nguoidung")
        .select("*", { count: "exact", head: true });

      const { count: hhCount } = await supabase
        .from("hogiadinh")
        .select("*", { count: "exact", head: true });

      // Transform real data
      const mappedTxs: Transaction[] = (dbTxs || []).map((t: any) => ({
        id_giao_dich: t.id_giao_dich,
        loai_giao_dich: t.loai_giao_dich,
        so_tien: Number(t.so_tien),
        idnguoidung: t.idnguoidung,
        ref_id: t.ref_id,
        thoigian: t.thoigian,
        user_email: t.nguoidung?.email || "Khách hàng ẩn danh",
        plan_name: t.loai_giao_dich === "subscription" ? "AI Smart Pro Package" : "Thiết bị ESP32 Node",
      }));

      const mappedNodes: NodeWarranty[] = (dbNodes || []).map((n: any) => ({
        idnode: n.idnode,
        ten_phong: n.ten_phong || "Chưa đặt tên",
        ngay_kich_hoat: n.ngay_kich_hoat,
        gia_ban: Number(n.gia_ban || 450000),
        thoi_han_bao_hanh_thang: n.thoi_han_bao_hanh_thang || 12,
        trang_thai: n.trang_thai,
        id_hogiadinh: n.id_hogiadinh,
        owner_name: n.nguoidung?.hoten || "Không rõ",
        owner_email: n.nguoidung?.email || "Không có email",
        last_heartbeat: n.last_heartbeat,
      }));

      setTransactions(mappedTxs);
      setCosts(dbCosts || []);
      setNodes(mappedNodes);
      setSubscriptions(dbSubs || []);
      setTotalUsersCount(usersCount || 0);
      setTotalHouseholdsCount(hhCount || 0);
      setIsUsingMockData(false);
    } catch (err: any) {
      console.warn("Chưa khởi tạo DB thật. Chuyển sang chế độ dữ liệu giả lập (Mock).", err.message);
      
      // Load from LocalStorage if exists
      const localTxs = localStorage.getItem("iot_mock_txs");
      const localCosts = localStorage.getItem("iot_mock_costs");
      const localNodes = localStorage.getItem("iot_mock_nodes");
      
      const { mockTxs, mockCostsData, mockNodesData, mockSubs } = getMockDatabase();
      
      if (localTxs) {
        try { setTransactions(JSON.parse(localTxs)); } catch { setTransactions(mockTxs); }
      } else {
        setTransactions(mockTxs);
        localStorage.setItem("iot_mock_txs", JSON.stringify(mockTxs));
      }

      if (localCosts) {
        try { setCosts(JSON.parse(localCosts)); } catch { setCosts(mockCostsData); }
      } else {
        setCosts(mockCostsData);
        localStorage.setItem("iot_mock_costs", JSON.stringify(mockCostsData));
      }

      if (localNodes) {
        try { setNodes(JSON.parse(localNodes)); } catch { setNodes(mockNodesData); }
      } else {
        setNodes(mockNodesData);
        localStorage.setItem("iot_mock_nodes", JSON.stringify(mockNodesData));
      }

      setSubscriptions(mockSubs);
      setTotalUsersCount(142);
      setTotalHouseholdsCount(76);
      setIsUsingMockData(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset Mock Data to Default
  const resetMockData = () => {
    localStorage.removeItem("iot_mock_txs");
    localStorage.removeItem("iot_mock_costs");
    localStorage.removeItem("iot_mock_nodes");
    toast.success("Đã cài đặt lại dữ liệu giả lập ban đầu.");
    loadData();
  };

  // Aggregated KPIs
  const kpi = useMemo(() => {
    const revenue = transactions.reduce((sum, t) => sum + t.so_tien, 0);
    const activeSubscribers = subscriptions.filter(s => s.trang_thai === "active").length;
    const cancelledSubs = subscriptions.filter(s => s.trang_thai === "cancelled").length;
    
    // Churn rate
    const totalSubs = subscriptions.length;
    const churn = totalSubs > 0 ? (cancelledSubs / totalSubs) * 100 : 0;

    // Node & Warranty calculations
    const now = new Date();
    let totalDevices = nodes.length;
    let validWarranty = 0;
    let expiringSoonWarranty = 0;

    nodes.forEach(n => {
      if (n.ngay_kich_hoat) {
        const initDate = new Date(n.ngay_kich_hoat);
        const wMonths = n.thoi_han_bao_hanh_thang || 12;
        const expDate = new Date(initDate.getFullYear(), initDate.getMonth() + wMonths, initDate.getDate());
        const diffMs = expDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          validWarranty++;
          if (diffDays <= 30) expiringSoonWarranty++;
        }
      }
    });

    const totalCost = costs.reduce((sum, c) => sum + c.so_tien, 0);
    const profit = revenue - totalCost;

    // Active Households in 24h
    let activeHhCount = 0;
    const hhWithOnlineNodes = new Set();
    nodes.forEach(n => {
      if (n.id_hogiadinh && n.last_heartbeat) {
        const hb = new Date(n.last_heartbeat);
        const isOnline24h = (now.getTime() - hb.getTime()) < 24 * 60 * 60 * 1000;
        if (isOnline24h) {
          hhWithOnlineNodes.add(n.id_hogiadinh);
        }
      }
    });
    activeHhCount = hhWithOnlineNodes.size;

    return {
      revenue,
      activeSubscribers,
      churnRate: churn,
      totalDevices,
      warrantyPct: totalDevices > 0 ? (validWarranty / totalDevices) * 100 : 0,
      expiringSoonWarranty,
      totalCost,
      profit,
      activeHouseholds: activeHhCount === 0 && isUsingMockData ? 28 : activeHhCount, // Fallback for mock view
    };
  }, [transactions, subscriptions, nodes, costs, isUsingMockData]);

  // Aggregate monthly data for composed chart
  const monthlyData = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }).map((_, idx) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      return {
        monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        name: `Tháng ${d.getMonth() + 1}`,
        subscription: 0,
        hardware: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
    });

    transactions.forEach(t => {
      const date = new Date(t.thoigian);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.find(b => b.monthKey === key);
      if (bucket) {
        if (t.loai_giao_dich === "subscription") {
          bucket.subscription += t.so_tien;
        } else {
          bucket.hardware += t.so_tien;
        }
        bucket.revenue += t.so_tien;
      }
    });

    costs.forEach(c => {
      const date = new Date(c.thoigian);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.find(b => b.monthKey === key);
      if (bucket) {
        bucket.cost += c.so_tien;
      }
    });

    buckets.forEach(b => {
      b.profit = b.revenue - b.cost;
    });

    return buckets;
  }, [transactions, costs]);

  // Pie chart share
  const revenueShare = useMemo(() => {
    let sub = 0;
    let hw = 0;
    transactions.forEach(t => {
      if (t.loai_giao_dich === "subscription") sub += t.so_tien;
      else hw += t.so_tien;
    });
    return [
      { name: "Premium Subscription", value: sub, color: "#6366f1" },
      { name: "Bán thiết bị ESP32", value: hw, color: "#0ea5e9" },
    ];
  }, [transactions]);

  // Form expense submission
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || isNaN(Number(expenseForm.amount))) {
      toast.error("Số tiền không hợp lệ!");
      return;
    }
    if (!expenseForm.desc.trim()) {
      toast.error("Vui lòng nhập mô tả chi phí!");
      return;
    }

    setSavingExpense(true);
    const costValue = {
      loai_chi_phi: expenseForm.type,
      so_tien: Number(expenseForm.amount),
      mo_ta: expenseForm.desc,
      thoigian: new Date(expenseForm.date).toISOString(),
    };

    try {
      if (isUsingMockData) {
        // Save to LocalStorage mock DB
        const newExpense: Cost = {
          id_chi_phi: Date.now(),
          loai_chi_phi: expenseForm.type as any,
          so_tien: Number(expenseForm.amount),
          mo_ta: expenseForm.desc,
          thoigian: new Date(expenseForm.date).toISOString(),
        };
        const updatedCosts = [newExpense, ...costs];
        setCosts(updatedCosts);
        localStorage.setItem("iot_mock_costs", JSON.stringify(updatedCosts));
        toast.success("Đã ghi nhận chi phí mới (giả lập)");
      } else {
        const { error } = await supabase
          .from("chi_phi_van_hanh")
          .insert([costValue]);
        if (error) throw error;
        
        // Log audit trail
        await supabase.from("audit_log").insert([{
          hanhdong: "Thêm chi phí vận hành",
          chi_tiet: `Thêm khoản chi phí ${expenseForm.type}: ${Number(expenseForm.amount).toLocaleString("vi-VN")} đ`
        }]);

        toast.success("Thêm chi phí vận hành thành công!");
        loadData();
      }
      setShowAddExpense(false);
      setExpenseForm({
        type: "server",
        amount: "",
        desc: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch (err: any) {
      toast.error("Lỗi khi thêm chi phí: " + err.message);
    } finally {
      setSavingExpense(false);
    }
  };

  // Delete cost row
  const handleDeleteCost = async (id: number, amount: number) => {
    try {
      const updatedCosts = costs.filter(c => c.id_chi_phi !== id);
      setCosts(updatedCosts);

      if (isUsingMockData) {
        localStorage.setItem("iot_mock_costs", JSON.stringify(updatedCosts));
        toast.success("Đã xóa khoản chi phí (giả lập)");
      } else {
        const { error } = await supabase
          .from("chi_phi_van_hanh")
          .delete()
          .eq("id_chi_phi", id);
        if (error) throw error;
        
        try {
          await supabase.from("audit_log").insert([{
            hanhdong: "Xóa chi phí vận hành",
            chi_tiet: `Xóa khoản chi phí trị giá ${amount.toLocaleString("vi-VN")} đ`
          }]);
        } catch {
          // ignore audit failure if table missing
        }

        toast.success("Đã xóa khoản chi phí thành công!");
      }
    } catch (err: any) {
      toast.error("Không thể xóa chi phí: " + err.message);
      loadData();
    }
  };

  // Add transactions (DB or LocalStorage fallback)
  const handleSaveMockTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockTxForm.amount || isNaN(Number(mockTxForm.amount))) {
      toast.error("Số tiền không hợp lệ!");
      return;
    }

    const txValue = {
      loai_giao_dich: mockTxForm.type,
      so_tien: Number(mockTxForm.amount),
      thoigian: new Date(mockTxForm.date).toISOString(),
    };

    try {
      if (isUsingMockData) {
        const newTx: Transaction = {
          id_giao_dich: `mock-manual-${Date.now()}`,
          loai_giao_dich: mockTxForm.type as any,
          so_tien: Number(mockTxForm.amount),
          idnguoidung: null,
          ref_id: "demo-tx",
          thoigian: new Date(mockTxForm.date).toISOString(),
          user_email: mockTxForm.type === "subscription" ? "client.pro@example.com" : "customer.hardware@example.com",
          plan_name: mockTxForm.type === "subscription" ? "Premium AI Smart Pro" : "Mạch ESP32 Node rời",
        };
        const updatedTxs = [newTx, ...transactions];
        setTransactions(updatedTxs);
        localStorage.setItem("iot_mock_txs", JSON.stringify(updatedTxs));
        toast.success("Đã thêm giao dịch (giả lập)");
      } else {
        const { error } = await supabase
          .from("giao_dich_kinh_doanh")
          .insert([txValue]);
        if (error) throw error;
        toast.success("Thêm giao dịch mới thành công!");
        loadData();
      }
      setShowAddMockTx(false);
    } catch (err: any) {
      toast.error("Lỗi khi thêm giao dịch: " + err.message);
    }
  };

  // Delete transaction
  const handleDeleteTx = async (id: string | number) => {
    try {
      const updatedTxs = transactions.filter(t => t.id_giao_dich !== id);
      setTransactions(updatedTxs);

      if (isUsingMockData) {
        localStorage.setItem("iot_mock_txs", JSON.stringify(updatedTxs));
        toast.success("Đã xóa giao dịch");
      } else {
        const { error } = await supabase
          .from("giao_dich_kinh_doanh")
          .delete()
          .eq("id_giao_dich", id);
        if (error) throw error;
        toast.success("Đã xóa giao dịch thành công!");
      }
    } catch (err: any) {
      toast.error("Không thể xóa giao dịch: " + err.message);
      loadData();
    }
  };

  // Save Edit Cost
  const handleSaveEditCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCost) return;
    try {
      const updatedCosts = costs.map(c => c.id_chi_phi === editingCost.id_chi_phi ? editingCost : c);
      setCosts(updatedCosts);

      if (isUsingMockData) {
        localStorage.setItem("iot_mock_costs", JSON.stringify(updatedCosts));
        toast.success("Đã cập nhật khoản chi phí");
      } else {
        const { error } = await supabase
          .from("chi_phi_van_hanh")
          .update({
            loai_chi_phi: editingCost.loai_chi_phi,
            so_tien: editingCost.so_tien,
            mo_ta: editingCost.mo_ta,
            thoigian: editingCost.thoigian
          })
          .eq("id_chi_phi", editingCost.id_chi_phi);
        if (error) throw error;
        toast.success("Đã cập nhật khoản chi phí thành công!");
      }
      setEditingCost(null);
    } catch (err: any) {
      toast.error("Không thể cập nhật chi phí: " + err.message);
      loadData();
    }
  };

  // Save Edit Device Warranty & Price
  const handleSaveEditDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    try {
      const updatedNodes = nodes.map(n => n.idnode === editingDevice.idnode ? editingDevice : n);
      setNodes(updatedNodes);

      if (isUsingMockData) {
        localStorage.setItem("iot_mock_nodes", JSON.stringify(updatedNodes));
        toast.success("Đã cập nhật thông tin bảo hành (giả lập)");
      } else {
        const { error } = await supabase
          .from("esp32_nodes")
          .update({
            gia_ban: editingDevice.gia_ban,
            thoi_han_bao_hanh_thang: editingDevice.thoi_han_bao_hanh_thang
          })
          .eq("idnode", editingDevice.idnode);
        if (error) throw error;
        toast.success("Đã cập nhật giá bán & thời hạn bảo hành thành công!");
      }
      setEditingDevice(null);
    } catch (err: any) {
      toast.error("Không thể cập nhật bảo hành: " + err.message);
      loadData();
    }
  };

  // Filters search queries
  const filteredDevices = useMemo(() => {
    return nodes.filter(n =>
      n.idnode.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      n.ten_phong.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      (n.owner_email && n.owner_email.toLowerCase().includes(deviceSearch.toLowerCase())) ||
      (n.owner_name && n.owner_name.toLowerCase().includes(deviceSearch.toLowerCase()))
    );
  }, [nodes, deviceSearch]);

  const filteredTxs = useMemo(() => {
    return transactions.filter(t =>
      t.id_giao_dich.toString().toLowerCase().includes(txSearch.toLowerCase()) ||
      (t.user_email && t.user_email.toLowerCase().includes(txSearch.toLowerCase())) ||
      t.loai_giao_dich.toLowerCase().includes(txSearch.toLowerCase())
    );
  }, [transactions, txSearch]);

  const formatVND = (val: number) => {
    return val.toLocaleString("vi-VN") + " đ";
  };

  return (
    <div className="space-y-6">
      {/* Database Warning Alert */}
      {isUsingMockData && (
        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">
                Chế độ dữ liệu giả lập (Offline Demo)
              </h4>
              <p className="text-xs text-amber-700/80 dark:text-amber-500/80">
                Các bảng dữ liệu kinh doanh chưa được tạo trên Supabase. Số liệu hiện tại được giả lập theo lịch sử 6 tháng qua.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDbGuide(true)}
              className="text-xs h-8 text-amber-700 hover:bg-amber-100/50 border-amber-300 dark:text-amber-400 dark:hover:bg-amber-900/30"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1" />
              Xem Code SQL Setup
            </Button>
            <Button
              size="sm"
              onClick={resetMockData}
              className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white border-transparent"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reset Mock
            </Button>
          </div>
        </div>
      )}

      {/* Header operations controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-500" />
            Hoạt động kinh doanh
          </h2>
          <p className="text-xs text-slate-500">
            Giám sát các chỉ số doanh số bán hàng, thuê bao AI Premium, và tối ưu hóa chi phí vận hành Smart Home.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddMockTx(true)}
            className="border-slate-200 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer text-slate-700 dark:text-slate-300 text-xs"
          >
            <Plus className="h-4 w-4 mr-1" />
            Tạo Giao dịch
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddExpense(true)}
            className="border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer text-indigo-600 dark:text-slate-300 text-xs font-semibold"
          >
            <Plus className="h-4 w-4 mr-1" />
            Ghi nhận Chi phí
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 cursor-pointer text-slate-700 dark:text-slate-300 text-xs"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* KPI stats section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Stat card 1 - Revenue */}
        <GlassCard className="relative overflow-hidden p-5">
          <div className="absolute top-4 right-4 text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 p-1.5 rounded-lg">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="text-xs text-slate-400 font-medium">Tổng doanh thu lũy kế</div>
          <div className="text-2xl font-black mt-2 text-slate-800 dark:text-white tabular-nums">
            {formatVND(kpi.revenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="text-emerald-500 font-bold flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" /> +14.2%
            </span>
            so với tháng trước
          </div>
        </GlassCard>

        {/* Stat card 2 - Premium Active */}
        <GlassCard className="relative overflow-hidden p-5">
          <div className="absolute top-4 right-4 text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 p-1.5 rounded-lg">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="text-xs text-slate-400 font-medium">Thuê bao Premium AI active</div>
          <div className="text-2xl font-black mt-2 text-slate-800 dark:text-white tabular-nums flex items-baseline gap-2">
            {kpi.activeSubscribers}
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-500 font-normal">
              / {subscriptions.length} users
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Tỷ lệ chuyển đổi: <b>{((kpi.activeSubscribers / (totalUsersCount || 1)) * 100).toFixed(1)}%</b></span>
            <span className="text-rose-500 font-bold">Churn: {kpi.churnRate.toFixed(1)}%</span>
          </div>
        </GlassCard>

        {/* Stat card 3 - Hardware sold */}
        <GlassCard className="relative overflow-hidden p-5">
          <div className="absolute top-4 right-4 text-sky-500 bg-sky-50 dark:bg-sky-950/30 p-1.5 rounded-lg">
            <Award className="h-5 w-5" />
          </div>
          <div className="text-xs text-slate-400 font-medium">Thiết bị Node bán ra (Fleet)</div>
          <div className="text-2xl font-black mt-2 text-slate-800 dark:text-white tabular-nums">
            {kpi.totalDevices} Node
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span className="flex items-center gap-0.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Còn bảo hành: <b>{kpi.warrantyPct.toFixed(0)}%</b>
            </span>
            {kpi.expiringSoonWarranty > 0 && (
              <span className="text-amber-500 font-medium">{kpi.expiringSoonWarranty} node sắp hết hạn</span>
            )}
          </div>
        </GlassCard>

        {/* Stat card 4 - Net profit */}
        <GlassCard className="relative overflow-hidden p-5">
          <div className="absolute top-4 right-4 text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded-lg">
            <Users className="h-5 w-5" />
          </div>
          <div className="text-xs text-slate-400 font-medium">Lợi nhuận ròng & Hộ gia đình</div>
          <div className="text-2xl font-black mt-2 text-slate-900 dark:text-white tabular-nums">
            {formatVND(kpi.profit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex justify-between items-center">
            <span>Chi vận hành: <b>{formatVND(kpi.totalCost)}</b></span>
            <span>Hộ active 24h: <b className="text-emerald-500">{kpi.activeHouseholds}/{totalHouseholdsCount}</b></span>
          </div>
        </GlassCard>
      </div>

      {/* Recharts chart performance row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main monthly profit composed chart */}
        <GlassCard className="p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hiệu suất Tài chính 6 Tháng Qua</h3>
              <p className="text-[11px] text-slate-500">So sánh doanh số bán hàng, thuê bao dịch vụ, chi phí và lợi nhuận ròng</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Thuê bao</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" /> Phần cứng</span>
              <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-rose-500" /> Lợi nhuận</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value: number) => [formatVND(value), ""]}
                  contentStyle={{
                    borderRadius: 12,
                    background: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid rgba(226, 232, 240, 0.8)",
                    fontSize: 11,
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
                  }}
                />
                {/* Stacked Revenue Bars */}
                <Bar dataKey="subscription" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} maxBarSize={30} />
                <Bar dataKey="hardware" stackId="a" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={30} />
                {/* Cost Line */}
                <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                {/* Profit Area */}
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#profitGrad)" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Revenue share and user retention area */}
        <GlassCard className="p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cơ Cấu Nguồn Doanh Thu</h3>
            <p className="text-[11px] text-slate-500">Tỷ trọng đóng góp lũy kế</p>
          </div>
          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueShare}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {revenueShare.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatVND(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {revenueShare.map((item, idx) => {
              const total = revenueShare.reduce((a, b) => a + b.value, 0);
              const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {pct}% ({formatVND(item.value)})
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Row detail lists */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Operational Expenses Manager */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Tag className="h-4.5 w-4.5 text-rose-500" />
                Nhật Ký Chi Phí Vận Hành
              </h3>
              <p className="text-[11px] text-slate-500">Các khoản đầu tư phần cứng, duy trì máy chủ Cloud và marketing</p>
            </div>
            <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 font-bold border-transparent px-2.5 py-0.5">
              Tổng chi: {formatVND(kpi.totalCost)}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider pb-2">
                  <th className="pb-2 pr-3">Phân loại</th>
                  <th className="pb-2 px-3">Mô tả chi tiết</th>
                  <th className="pb-2 px-3">Ngày chi</th>
                  <th className="pb-2 px-3 text-right">Số tiền</th>
                  <th className="pb-2 pl-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {costs.slice((costPage - 1) * 5, costPage * 5).map((c) => {
                  const badgeConfig =
                    c.loai_chi_phi === "server"
                      ? { bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/30", label: "Server" }
                      : c.loai_chi_phi === "marketing"
                      ? { bg: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/30", label: "Marketing" }
                      : c.loai_chi_phi === "maintenance"
                      ? { bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/30", label: "Bảo hành" }
                      : { bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30", label: "Sản xuất" };

                  return (
                    <tr key={c.id_chi_phi} className="text-slate-600 dark:text-slate-400 hover:bg-slate-50/20">
                      <td className="py-2.5 pr-3">
                        <Badge className={`${badgeConfig.bg} rounded-md font-bold px-1.5 py-0.5 border-transparent text-[10px]`}>
                          {badgeConfig.label}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 max-w-[150px] truncate font-medium" title={c.mo_ta}>
                        {c.mo_ta}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        {new Date(c.thoigian).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-500 tabular-nums">
                        -{formatVND(c.so_tien)}
                      </td>
                      <td className="py-2.5 pl-3 text-right flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCost(c)}
                          className="h-6 w-6 p-0 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border-slate-200 dark:border-slate-800 cursor-pointer"
                          title="Sửa chi phí"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCost(c.id_chi_phi, c.so_tien)}
                          className="h-6 w-6 p-0 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-slate-200 dark:border-slate-800 cursor-pointer"
                          title="Xóa chi phí"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {costs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                      Chưa ghi nhận khoản chi phí nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Costs Pagination */}
          {costs.length > 5 && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>
                {Math.min((costPage - 1) * 5 + 1, costs.length)}-{Math.min(costPage * 5, costs.length)} / {costs.length} bản ghi
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={costPage === 1}
                  onClick={() => setCostPage((p) => p - 1)}
                  className="h-6 px-2 text-[10px] cursor-pointer"
                >
                  Trước
                </Button>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {costPage} / {Math.ceil(costs.length / 5)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={costPage >= Math.ceil(costs.length / 5)}
                  onClick={() => setCostPage((p) => p + 1)}
                  className="h-6 px-2 text-[10px] cursor-pointer"
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Transactions log */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="h-4.5 w-4.5 text-indigo-500" />
                Lịch Sử Giao Dịch Gần Đây
              </h3>
              <p className="text-[11px] text-slate-500">Doanh thu thời gian thực từ phần cứng và thuê bao</p>
            </div>
            <div className="relative w-36">
              <Input
                placeholder="Tìm email/mã..."
                value={txSearch}
                onChange={(e) => {
                  setTxSearch(e.target.value);
                  setTxPage(1);
                }}
                className="h-7 text-[10px] pl-2 pr-2 bg-white/70 dark:bg-slate-900 border-slate-200"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider pb-2">
                  <th className="pb-2 pr-3">Mã Giao dịch</th>
                  <th className="pb-2 px-3">Khách hàng</th>
                  <th className="pb-2 px-3">Phân loại</th>
                  <th className="pb-2 px-3 text-right">Số tiền</th>
                  <th className="pb-2 px-3 text-right">Thời gian</th>
                  <th className="pb-2 pl-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTxs.slice((txPage - 1) * 5, txPage * 5).map((t) => {
                  const isSub = t.loai_giao_dich === "subscription";
                  return (
                    <tr key={t.id_giao_dich} className="text-slate-600 dark:text-slate-400 hover:bg-slate-50/20">
                      <td className="py-2.5 pr-3 font-mono text-[10px] text-slate-400 max-w-[80px] truncate" title={String(t.id_giao_dich)}>
                        {t.id_giao_dich}
                      </td>
                      <td className="py-2.5 px-3 max-w-[120px] truncate font-semibold" title={t.user_email}>
                        {t.user_email || "Khách mua lẻ"}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          className={`rounded-md font-bold px-1.5 py-0.5 border-transparent text-[10px] ${
                            isSub
                              ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30"
                              : "bg-sky-50 text-sky-700 dark:bg-sky-950/30"
                          }`}
                        >
                          {isSub ? "Subscription" : "Hardware"}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-500 tabular-nums">
                        +{formatVND(t.so_tien)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-400 font-mono">
                        {new Date(t.thoigian).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTx(t.id_giao_dich)}
                          className="h-6 w-6 p-0 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-slate-200 dark:border-slate-800 cursor-pointer"
                          title="Xóa giao dịch"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredTxs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                      Không tìm thấy giao dịch nào khớp với bộ lọc.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Transactions Pagination */}
          {filteredTxs.length > 5 && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>
                {Math.min((txPage - 1) * 5 + 1, filteredTxs.length)}-{Math.min(txPage * 5, filteredTxs.length)} / {filteredTxs.length} giao dịch
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={txPage === 1}
                  onClick={() => setTxPage((p) => p - 1)}
                  className="h-6 px-2 text-[10px] cursor-pointer"
                >
                  Trước
                </Button>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {txPage} / {Math.ceil(filteredTxs.length / 5)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={txPage >= Math.ceil(filteredTxs.length / 5)}
                  onClick={() => setTxPage((p) => p + 1)}
                  className="h-6 px-2 text-[10px] cursor-pointer"
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Fleet warranty tracking detail list */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 text-sky-500" />
              Theo Dõi Thiết Bị & Thời Hạn Bảo Hành
            </h3>
            <p className="text-[11px] text-slate-500">Thông tin phần cứng, MAC ID và hạn bảo hành bảo trì</p>
          </div>
          <div className="relative w-56">
            <Input
              placeholder="Tìm theo Node ID, Phòng hoặc Email..."
              value={deviceSearch}
              onChange={(e) => {
                setDeviceSearch(e.target.value);
                setDevicePage(1);
              }}
              className="h-8 text-xs bg-white/70 dark:bg-slate-900 border-slate-200"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider pb-3">
                <th className="pb-3 pr-4">Mã Node (Hardware ID)</th>
                <th className="pb-3 px-4">Khu vực lắp</th>
                <th className="pb-3 px-4">Khách sở hữu</th>
                <th className="pb-3 px-4">Ngày kích hoạt</th>
                <th className="pb-3 px-4">Thời gian bảo hành</th>
                <th className="pb-3 px-4">Hạn bảo hành</th>
                <th className="pb-3 px-4 text-right">Trạng thái bảo hành</th>
                <th className="pb-3 pl-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDevices.slice((devicePage - 1) * 5, devicePage * 5).map((n) => {
                const now = new Date();
                const initDate = n.ngay_kich_hoat ? new Date(n.ngay_kich_hoat) : now;
                const warrantyMonths = n.thoi_han_bao_hanh_thang || 12;
                const expDate = new Date(initDate.getFullYear(), initDate.getMonth() + warrantyMonths, initDate.getDate());
                const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                let statusBadge = { bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20", label: "Còn bảo hành" };
                if (diffDays <= 0) {
                  statusBadge = { bg: "bg-rose-50 text-rose-700 dark:bg-rose-950/20", label: "Hết bảo hành" };
                } else if (diffDays <= 30) {
                  statusBadge = { bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/20", label: "Sắp hết hạn" };
                }

                return (
                  <tr key={n.idnode} className="text-slate-600 dark:text-slate-400 hover:bg-slate-50/20">
                    <td className="py-3 pr-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {n.idnode}
                    </td>
                    <td className="py-3 px-4">{n.ten_phong}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{n.owner_name}</span>
                        <span className="text-[10px] text-slate-400">{n.owner_email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {n.ngay_kich_hoat ? new Date(n.ngay_kich_hoat).toLocaleDateString("vi-VN") : "Chưa kích hoạt"}
                    </td>
                    <td className="py-3 px-4 font-medium">{warrantyMonths} tháng</td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {n.ngay_kich_hoat ? expDate.toLocaleDateString("vi-VN") : "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge className={`${statusBadge.bg} border-transparent font-bold rounded-full px-2.5 py-0.5 text-[10px]`}>
                        {statusBadge.label}
                      </Badge>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingDevice(n)}
                        className="h-6 w-6 p-0 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border-slate-200 dark:border-slate-800 cursor-pointer"
                        title="Chỉnh sửa giá & bảo hành"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredDevices.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 dark:text-slate-400 italic">
                    Không tìm thấy thiết bị nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Devices Pagination */}
        {filteredDevices.length > 5 && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span>
              Hiển thị {Math.min((devicePage - 1) * 5 + 1, filteredDevices.length)}-{Math.min(devicePage * 5, filteredDevices.length)} trong tổng số {filteredDevices.length} node
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={devicePage === 1}
                onClick={() => setDevicePage((p) => p - 1)}
                className="h-7 px-3 text-xs cursor-pointer border-slate-200 dark:border-slate-800"
              >
                Trước
              </Button>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Trang {devicePage} / {Math.ceil(filteredDevices.length / 5)}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={devicePage >= Math.ceil(filteredDevices.length / 5)}
                onClick={() => setDevicePage((p) => p + 1)}
                className="h-7 px-3 text-xs cursor-pointer border-slate-200 dark:border-slate-800"
              >
                Sau
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* SQL Setup Modal Guide */}
      <Dialog open={showDbGuide} onOpenChange={setShowDbGuide}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white font-black text-base flex items-center gap-1.5">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Hướng dẫn thiết lập bảng Cơ sở dữ liệu Kinh doanh
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Sao chép đoạn mã SQL dưới đây và chạy trong mục **SQL Editor** trên Supabase Dashboard để thiết lập cấu trúc thực tế cho phần này.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-xs">
            <div className="relative">
              <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[10px] overflow-x-auto max-h-[350px]">
{`-- 1. BẢNG GÓI DỊCH VỤ PREMIUM AI
CREATE TABLE IF NOT EXISTS public.goi_dich_vu (
    id_goi        BIGSERIAL PRIMARY KEY,
    ten_goi       VARCHAR(100) NOT NULL UNIQUE,
    gia_tien      NUMERIC(12, 2) NOT NULL,
    chu_ky_thang  INT NOT NULL DEFAULT 1,
    mo_ta         TEXT,
    thoigian_tao  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG ĐĂNG KÝ THUÊ BAO
CREATE TABLE IF NOT EXISTS public.dang_ky_thue_bao (
    id_thue_bao   BIGSERIAL PRIMARY KEY,
    idnguoidung   BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE CASCADE,
    id_goi        BIGINT REFERENCES public.goi_dich_vu(id_goi) ON DELETE SET NULL,
    ngay_bat_dau  TIMESTAMPTZ DEFAULT NOW(),
    ngay_het_han  TIMESTAMPTZ NOT NULL,
    trang_thai    VARCHAR(20) DEFAULT 'active', -- 'active' | 'cancelled' | 'expired'
    thoigian_tao  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG LỊCH SỬ GIAO DỊCH KINH DOANH
CREATE TABLE IF NOT EXISTS public.giao_dich_kinh_doanh (
    id_giao_dich   BIGSERIAL PRIMARY KEY,
    loai_giao_dich VARCHAR(20) NOT NULL, -- 'subscription' | 'hardware'
    so_tien        NUMERIC(12, 2) NOT NULL,
    idnguoidung    BIGINT REFERENCES public.nguoidung(idnguoidung) ON DELETE SET NULL,
    ref_id         VARCHAR(50),
    thoigian       TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG CHI PHÍ VẬN HÀNH
CREATE TABLE IF NOT EXISTS public.chi_phi_van_hanh (
    id_chi_phi   BIGSERIAL PRIMARY KEY,
    loai_chi_phi VARCHAR(50) NOT NULL, -- 'server' | 'marketing' | 'maintenance' | 'production'
    so_tien      NUMERIC(12, 2) NOT NULL,
    mo_ta        TEXT,
    thoigian     TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CẬP NHẬT THÊM CỘT BẢO HÀNH CHO NODE
ALTER TABLE public.esp32_nodes 
ADD COLUMN IF NOT EXISTS gia_ban NUMERIC(12, 2) DEFAULT 450000.00,
ADD COLUMN IF NOT EXISTS thoi_han_bao_hanh_thang INT DEFAULT 12;`}
              </pre>
            </div>
            <p className="text-xs text-slate-500 italic">
              * Gợi ý: File script đầy đủ kèm lệnh chèn dữ liệu mẫu (Seed data) đã được tự động lưu trong thư mục dự án của bạn tại đường dẫn: <code className="font-mono text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 px-1 rounded">database/business_ops_migration.sql</code>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowDbGuide(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer">
              Đồng ý
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog record new cost expense */}
      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5">
              <Briefcase className="h-5 w-5 text-indigo-500" />
              Ghi nhận khoản chi phí vận hành mới
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Điền các thông tin tài chính chi thực tế để cập nhật biểu đồ phân tích lợi nhuận ròng.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveExpense} className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phân loại chi phí:
              </label>
              <select
                value={expenseForm.type}
                onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })}
                className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950 p-2 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="server">Chi phí Cloud Server / Hosting</option>
                <option value="production">Sản xuất (Nhập mạch, linh kiện ESP32/cảm biến)</option>
                <option value="marketing">Chi phí Marketing / Ads</option>
                <option value="maintenance">Bảo trì / Thay mới thiết bị lỗi cho khách</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Số tiền chi (VND):
              </label>
              <Input
                type="number"
                placeholder="Nhập số tiền thực chi... (Ví dụ: 1500000)"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                className="bg-white/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mô tả chi tiết:
              </label>
              <Input
                placeholder="Nhập ghi chú chi tiết... (Ví dụ: Mua 10 cảm biến Gas MQ-2)"
                value={expenseForm.desc}
                onChange={(e) => setExpenseForm({ ...expenseForm, desc: e.target.value })}
                className="bg-white/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ngày ghi nhận:
              </label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                className="bg-white/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddExpense(false)} className="cursor-pointer dark:text-white">
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={savingExpense}
                className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold cursor-pointer"
              >
                {savingExpense ? "Đang lưu..." : "Xác nhận Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog add mock transaction (Only visible in mock mode) */}
      <Dialog open={showAddMockTx} onOpenChange={setShowAddMockTx}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5">
              <Plus className="h-5 w-5 text-indigo-500" />
              Tạo giao dịch giả lập (Demo Testing)
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Thêm nhanh giao dịch bán thiết bị hoặc thuê bao vào mock database để kiểm thử hiển thị biểu đồ.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveMockTx} className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phân loại giao dịch:
              </label>
              <select
                value={mockTxForm.type}
                onChange={(e) => {
                  const val = e.target.value;
                  setMockTxForm({
                    ...mockTxForm,
                    type: val,
                    amount: val === "subscription" ? "99000" : "450000",
                  });
                }}
                className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950 p-2 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <option value="subscription">Đăng ký Thuê bao (Subscription)</option>
                <option value="hardware">Mua thiết bị phần cứng Node ESP32</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Số tiền (VND):
              </label>
              <Input
                type="number"
                value={mockTxForm.amount}
                onChange={(e) => setMockTxForm({ ...mockTxForm, amount: e.target.value })}
                className="bg-white/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Thời gian giao dịch:
              </label>
              <Input
                type="date"
                value={mockTxForm.date}
                onChange={(e) => setMockTxForm({ ...mockTxForm, date: e.target.value })}
                className="bg-white/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddMockTx(false)} className="cursor-pointer dark:text-white">
                Hủy
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold cursor-pointer">
                Tạo giao dịch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Cost Expense */}
      <Dialog open={!!editingCost} onOpenChange={(open) => !open && setEditingCost(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5">
              <Pencil className="h-5 w-5 text-indigo-500" />
              Chỉnh sửa khoản chi phí vận hành
            </DialogTitle>
          </DialogHeader>
          {editingCost && (
            <form onSubmit={handleSaveEditCost} className="space-y-4 py-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Phân loại chi phí:
                </label>
                <select
                  value={editingCost.loai_chi_phi}
                  onChange={(e) => setEditingCost({ ...editingCost, loai_chi_phi: e.target.value as any })}
                  className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950 p-2 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <option value="server">Chi phí Cloud Server / Hosting</option>
                  <option value="production">Sản xuất (Nhập mạch, linh kiện ESP32/cảm biến)</option>
                  <option value="marketing">Chi phí Marketing / Ads</option>
                  <option value="maintenance">Bảo trì / Thay mới thiết bị lỗi cho khách</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Số tiền chi (VND):
                </label>
                <Input
                  type="number"
                  value={editingCost.so_tien}
                  onChange={(e) => setEditingCost({ ...editingCost, so_tien: Number(e.target.value) })}
                  className="bg-white/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mô tả chi tiết:
                </label>
                <Input
                  value={editingCost.mo_ta}
                  onChange={(e) => setEditingCost({ ...editingCost, mo_ta: e.target.value })}
                  className="bg-white/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingCost(null)} className="cursor-pointer dark:text-white">
                  Hủy
                </Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-750 text-white font-bold cursor-pointer">
                  Cập nhật
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Device Warranty */}
      <Dialog open={!!editingDevice} onOpenChange={(open) => !open && setEditingDevice(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white font-bold flex items-center gap-1.5">
              <ShieldCheck className="h-5 w-5 text-sky-500" />
              Cập nhật thời hạn bảo hành Node
            </DialogTitle>
          </DialogHeader>
          {editingDevice && (
            <form onSubmit={handleSaveEditDevice} className="space-y-4 py-3">
              <div className="text-xs text-slate-500">
                Node ID: <b className="font-mono text-slate-800 dark:text-slate-200">{editingDevice.idnode}</b> ({editingDevice.ten_phong})
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Thời hạn bảo hành (tháng):
                </label>
                <Input
                  type="number"
                  value={editingDevice.thoi_han_bao_hanh_thang || 12}
                  onChange={(e) => setEditingDevice({ ...editingDevice, thoi_han_bao_hanh_thang: Number(e.target.value) })}
                  className="bg-white/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Giá bán phần cứng (VND):
                </label>
                <Input
                  type="number"
                  value={editingDevice.gia_ban || 450000}
                  onChange={(e) => setEditingDevice({ ...editingDevice, gia_ban: Number(e.target.value) })}
                  className="bg-white/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingDevice(null)} className="cursor-pointer dark:text-white">
                  Hủy
                </Button>
                <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold cursor-pointer">
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
