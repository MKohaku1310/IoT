import { cn } from "@/lib/utils";
import { Cpu, Moon } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { TabKey } from "@/components/dashboard/types";
import { TABS, NODES } from "@/components/dashboard/constants";

function StatusRow({ label, online }: { label: string; online: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className={cn("relative h-2 w-2 rounded-full", online ? "bg-emerald-500" : "bg-rose-500")}>
          {online && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" />}
        </span>
        <span className={cn("text-xs font-medium", online ? "text-emerald-600" : "text-rose-600")}>
          {online ? "Online" : "Offline"}
        </span>
      </span>
    </div>
  );
}

export function Sidebar({
  tab,
  setTab,
  todLabel,
  node,
  setNodeId,
  dark,
  alertCount,
  className,
  onCloseMobile,
  livingOnline,
  bedroomOnline,
  kitchenOnline,
  supabaseOnline,
  mqttOnline,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  todLabel: string;
  node: (typeof NODES)[number];
  setNodeId: (id: string) => void;
  dark: boolean;
  alertCount: number;
  className?: string;
  onCloseMobile?: () => void;
  livingOnline: boolean;
  bedroomOnline: boolean;
  kitchenOnline: boolean;
  supabaseOnline: boolean;
  mqttOnline: boolean;
}) {
  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col gap-3 p-4 border-r backdrop-blur-xl overflow-y-auto",
        dark ? "border-white/10 bg-slate-950/40" : "border-white/60 bg-white/60",
        className
      )}
    >
      <div className="flex items-center gap-3 px-2 pt-2">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-500/30">
          <Cpu className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className={cn("text-[11px] font-medium uppercase tracking-wider", dark ? "text-slate-400" : "text-slate-500")}>Cổng IoT</div>
          <div className={cn("truncate text-sm font-semibold", dark ? "text-white" : "text-slate-900")}>Node ESP32-S3</div>
        </div>
      </div>

      {/* Node/room selector */}
      <div className={cn("rounded-2xl border p-3", dark ? "border-white/10 bg-white/5" : "border-white/70 bg-white/70")}>
        <div className={cn("mb-2 text-[11px] font-semibold uppercase tracking-wider", dark ? "text-slate-400" : "text-slate-500")}>
          Node / Phòng
        </div>
        <Select value={node.id} onValueChange={setNodeId}>
          <SelectTrigger className={cn("h-10 text-sm", dark ? "bg-white/10 text-white border-white/10" : "bg-white/80 text-slate-700")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NODES.map((n) => {
              const Ic = n.icon;
              return (
                <SelectItem key={n.id} value={n.id}>
                  <span className="inline-flex items-center gap-2">
                    <Ic className="h-3.5 w-3.5 text-indigo-500" />
                    {n.name}
                    <span className="text-[10px] text-slate-400">· {n.chip}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <nav className="flex flex-col gap-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          const showBadge = key === "notifications" && alertCount > 0;
          return (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                onCloseMobile?.();
              }}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all cursor-pointer",
                active
                  ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30"
                  : dark
                    ? "text-slate-300 hover:bg-white/10 hover:text-white"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : dark ? "text-slate-400" : "text-slate-500")} />
              <span className="truncate flex-1 text-left">{label}</span>
              {showBadge && (
                <span className={cn(
                  "ml-auto grid min-w-5 h-5 place-items-center rounded-full px-1 text-[10px] font-bold",
                  active ? "bg-white/25 text-white" : "bg-rose-500 text-white"
                )}>
                  {alertCount > 99 ? "99+" : alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className={cn("rounded-2xl border p-3", dark ? "border-white/10 bg-white/5 text-slate-200" : "border-white/70 bg-gradient-to-br from-indigo-50/70 to-sky-50/70 text-slate-700")}>
        <div className="flex items-center gap-2 font-medium text-xs">
          <Moon className="h-3.5 w-3.5" /> {todLabel}
        </div>
        <div className={cn("mt-0.5 text-[10px]", dark ? "text-slate-400" : "text-slate-500")}>Giao diện theo giờ hệ thống</div>
      </div>

      <div className={cn("rounded-2xl border p-3 shadow-sm backdrop-blur", dark ? "border-white/10 bg-white/5" : "border-white/70 bg-white/70")}>
        <div className={cn("mb-3 text-[11px] font-semibold uppercase tracking-wider", dark ? "text-slate-400" : "text-slate-500")}>
          Trạng thái kết nối
        </div>
        <StatusRow label="Supabase" online={supabaseOnline} />
        <StatusRow label="MQTT Broker" online={mqttOnline} />
        <StatusRow label={node.chip} online={node.id === "living" ? livingOnline : node.id === "bedroom" ? bedroomOnline : kitchenOnline} />
      </div>
    </aside>
  );
}
