import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Cpu, ChevronLeft, ChevronRight, Wifi, WifiOff, CircleAlert } from "lucide-react";
import { TabKey } from "@/components/dashboard/shared/types";
import { BUYER_TABS, ADMIN_TABS } from "@/components/dashboard/shared/constants";
import { NodeSwitcher } from "./NodeSwitcher";
import { onMqttStatus } from "@/lib/mqttClient";
import { useNode } from "@/hooks/use-node-context";
import { supabase } from "@/lib/supabase";

export function Sidebar({
  tab,
  setTab,
  dark,
  alertCount,
  className,
  onCloseMobile,
  currentUserRole = "buyer",
  supabaseOnline = true,
  mqttOnline: mqttOnlineProp = true,
  node: _node,
  setNodeId: _setNodeId,
  nodesList: _nodesList,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  todLabel?: string;
  node?: any;
  setNodeId?: (id: string) => void;
  dark: boolean;
  alertCount: number;
  className?: string;
  onCloseMobile?: () => void;
  livingOnline?: boolean;
  bedroomOnline?: boolean;
  kitchenOnline?: boolean;
  supabaseOnline?: boolean;
  mqttOnline?: boolean;
  currentUserRole?: string;
  nodesList?: any[];
}) {
  const { currentNode } = useNode();
  const [collapsed, setCollapsed] = useState(false);
  const [mqttLive, setMqttLive] = useState(mqttOnlineProp);
  const [nodeStatus, setNodeStatus] = useState<{ online: boolean; rssi: number | null }>({
    online: false,
    rssi: null,
  });

  useEffect(() => {
    return onMqttStatus((s) => setMqttLive(s === "online"));
  }, []);

  useEffect(() => {
    setMqttLive(mqttOnlineProp);
  }, [mqttOnlineProp]);

  // Fetch real node status from database with polling
  useEffect(() => {
    if (!currentNode?.id || currentUserRole === "admin") return;

    const fetchNodeStatus = async () => {
      const { data, error } = await supabase
        .from("esp32_nodes")
        .select("trang_thai, rssi, last_heartbeat")
        .eq("idnode", currentNode.id)
        .maybeSingle();

      if (!error && data) {
        const isOnline = data.trang_thai === "online";
        setNodeStatus({
          online: isOnline,
          rssi: data.rssi,
        });
      }
    };

    fetchNodeStatus();
    const interval = setInterval(fetchNodeStatus, 10000);
    return () => clearInterval(interval);
  }, [currentNode?.id, currentUserRole]);

  // Admin Fleet stats polling
  const [adminFleetStats, setAdminFleetStats] = useState<{ total: number; online: number }>({ total: 0, online: 0 });

  useEffect(() => {
    if (currentUserRole !== "admin") return;

    const fetchFleetStats = async () => {
      const { data } = await supabase
        .from("esp32_nodes")
        .select("trang_thai")
        .neq("idnode", "SYSTEM_CONFIG");
      if (data) {
        setAdminFleetStats({
          total: data.length,
          online: data.filter((n: any) => n.trang_thai === "online").length,
        });
      }
    };

    fetchFleetStats();
    const interval = setInterval(fetchFleetStats, 10000);
    return () => clearInterval(interval);
  }, [currentUserRole]);

  const allTabs = currentUserRole === "admin" ? ADMIN_TABS : BUYER_TABS;
  const secondaryKeys = ["settings", "support"];
  const mainTabs = allTabs.filter((t) => !secondaryKeys.includes(t.key));
  const secondaryTabs = allTabs.filter((t) => secondaryKeys.includes(t.key));

  const renderTab = (item: { key: TabKey; label: string; icon: any }, compact = false) => {
    const active = tab === item.key;
    const Icon = item.icon;
    const showBadge = item.key === "notifications" && alertCount > 0;
    return (
      <button
        key={item.key}
        onClick={() => { setTab(item.key); onCloseMobile?.(); }}
        className={cn(
          "group flex items-center rounded-xl text-sm transition-all duration-150 cursor-pointer select-none",
          compact ? "px-3 py-2 font-medium" : "px-3 py-2.5 font-medium",
          collapsed ? "justify-center px-2 py-2.5" : "gap-3",
          active
            ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/25 font-bold"
            : dark
              ? "text-slate-200 font-medium hover:bg-white/15 hover:text-white"
              : "text-slate-700 font-semibold hover:bg-slate-200/70 hover:text-slate-900",
        )}
        title={collapsed ? item.label : undefined}
      >
        <div className="relative flex items-center justify-center">
          <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", active ? "text-white" : dark ? "text-slate-300 group-hover:text-white" : "text-slate-700 group-hover:text-slate-900")} />
          {collapsed && showBadge && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-white dark:border-slate-950" />
          )}
        </div>
        {!collapsed && <span className="truncate flex-1 text-left font-semibold">{item.label}</span>}
        {!collapsed && showBadge && (
          <span className={cn(
            "ml-auto grid min-w-[22px] h-[22px] place-items-center rounded-full px-1.5 text-[11px] font-extrabold tracking-tight",
            active ? "bg-white/25 text-white" : "bg-rose-500 text-white shadow-sm shadow-rose-500/30"
          )}>
            {alertCount > 99 ? "99+" : alertCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col gap-3 p-3.5 border-r backdrop-blur-xl overflow-y-auto transition-all duration-300 ease-in-out select-none",
        collapsed ? "w-16" : "w-64",
        dark ? "border-white/15 bg-slate-950/70 text-slate-100" : "border-slate-200/80 bg-white/85 text-slate-900 shadow-sm",
        className
      )}
    >
      {/* === ZONE TOP: Logo + Node + Main Nav === */}
      <div className="flex flex-col gap-3">
        {/* Header Logo */}
        <div className={cn("flex items-center gap-2.5 px-1 pt-1", collapsed && "justify-center")}>
          <button
            onClick={() => setTab(currentUserRole === "admin" ? "fleet" : "dashboard")}
            className="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all cursor-pointer hover:scale-105 active:scale-95"
            title={currentUserRole === "admin" ? "Về trang Quản lý Fleet" : "Về trang Dashboard"}
          >
            <Cpu className="h-5 w-5" />
          </button>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className={cn("text-[10px] font-bold uppercase tracking-wider", dark ? "text-slate-300" : "text-slate-600")}>
                {currentUserRole === "admin" ? "Hệ thống" : "Cổng IoT"}
              </div>
              <div className={cn("truncate text-xs font-extrabold tracking-tight", dark ? "text-white" : "text-slate-900")}>
                {currentUserRole === "admin" ? "Admin Portal" : "Node ESP32-S3"}
              </div>
            </div>
          )}
          {!onCloseMobile && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "shrink-0 flex items-center justify-center rounded-lg p-1.5 transition-all cursor-pointer hover:bg-slate-200/80 dark:hover:bg-white/15",
                collapsed && "hidden"
              )}
              title="Thu gọn"
            >
              <ChevronLeft className={cn("h-4 w-4", dark ? "text-slate-300" : "text-slate-700")} />
            </button>
          )}
        </div>

        {!onCloseMobile && collapsed && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center rounded-xl p-2 transition-all cursor-pointer hover:bg-slate-200/80 dark:hover:bg-white/15"
            title="Mở rộng"
          >
            <ChevronRight className="h-4 w-4 shrink-0 text-indigo-500 animate-pulse" />
          </button>
        )}

        {/* Node Switcher - Chỉ hiển thị cho Buyer (User) */}
        {currentUserRole !== "admin" && (
          <NodeSwitcher dark={dark} collapsed={collapsed} />
        )}

        {/* Main Nav */}
        <nav className="flex flex-col gap-1.5 mt-1">
          {mainTabs.map((item) => renderTab(item))}
        </nav>
      </div>

      {/* === ZONE BOTTOM: Secondary Nav + Status === */}
      <div className="flex flex-col gap-3 mt-auto pt-2">
        <div className={cn("border-t", dark ? "border-white/15" : "border-slate-300")} />

        <nav className="flex flex-col gap-1.5">
          {secondaryTabs.map((item) => renderTab(item, true))}
        </nav>

        {/* System Status Card */}
        {!collapsed && (
          currentUserRole === "admin" ? (
            <div className={cn(
              "rounded-xl border p-2.5 transition-all shadow-sm",
              dark ? "border-white/15 bg-white/10" : "border-slate-300 bg-slate-100/90",
            )}>
              <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center justify-between", dark ? "text-slate-300" : "text-slate-700")}>
                <span>Hạ tầng hệ thống</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn("flex items-center gap-1.5 font-bold", dark ? "text-slate-200" : "text-slate-800")}>
                    <span className={cn("h-2 w-2 rounded-full shrink-0", mqttLive ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-rose-500 animate-pulse")} />
                    MQTT Broker
                  </span>
                  <span className={cn("text-[11px] font-extrabold", mqttLive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {mqttLive ? "Connected" : "Offline"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className={cn("flex items-center gap-1.5 font-bold", dark ? "text-slate-200" : "text-slate-800")}>
                    <span className={cn("h-2 w-2 rounded-full shrink-0", supabaseOnline ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-rose-500 animate-pulse")} />
                    Database
                  </span>
                  <span className={cn("text-[11px] font-extrabold", supabaseOnline ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                    {supabaseOnline ? "Ready" : "Error"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-300 dark:border-white/15 mt-0.5">
                  <span className={cn("font-bold", dark ? "text-slate-200" : "text-slate-800")}>
                    Fleet Nodes
                  </span>
                  <span className={cn("text-[11px] font-extrabold px-1.5 py-0.5 rounded-md", dark ? "bg-slate-800 text-sky-300" : "bg-sky-100 text-sky-800")}>
                    {adminFleetStats.online}/{adminFleetStats.total} Online
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className={cn(
              "rounded-xl border p-2.5 transition-all shadow-sm",
              dark ? "border-white/15 bg-white/10" : "border-slate-300 bg-slate-100/90",
            )}>
              <div className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", dark ? "text-slate-300" : "text-slate-700")}>
                Trạng thái hệ thống
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", nodeStatus.online ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-rose-500 animate-pulse")} />
                  <span className={cn("text-xs font-bold truncate", dark ? "text-slate-200" : "text-slate-800")}>
                    {nodeStatus.online ? "Node hoạt động" : "Node mất kết nối"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {nodeStatus.online ? (
                    <Wifi className={cn("h-3.5 w-3.5 shrink-0", dark ? "text-emerald-400" : "text-emerald-600")} />
                  ) : (
                    <WifiOff className={cn("h-3.5 w-3.5 shrink-0", dark ? "text-rose-400" : "text-rose-600")} />
                  )}
                  <span className={cn("text-xs font-bold", dark ? "text-slate-200" : "text-slate-800")}>
                    WiFi {nodeStatus.online ? (nodeStatus.rssi && nodeStatus.rssi < -70 ? "yếu" : "ổn định") : "mất kết nối"}
                  </span>
                </div>
                {alertCount > 0 && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <CircleAlert className={cn("h-3.5 w-3.5 shrink-0", dark ? "text-amber-400" : "text-amber-600")} />
                    <span className={cn("text-xs font-bold", dark ? "text-amber-300" : "text-amber-700")}>
                      {alertCount} cảnh báo chưa đọc
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </aside>
  );
}
