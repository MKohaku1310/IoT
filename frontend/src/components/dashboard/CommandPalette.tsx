import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Moon, Download, Cpu } from "lucide-react";
import { toast } from "sonner";
import { TABS, NODES } from "./constants";
import { TabKey } from "./types";

export function CommandPalette({
  open,
  onClose,
  setTab,
  setNodeId,
  toggleDark,
}: {
  open: boolean;
  onClose: () => void;
  setTab: (t: TabKey) => void;
  setNodeId: (id: string) => void;
  toggleDark: () => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo(
    () => [
      ...TABS.map((t) => ({ label: `Chuyển tab: ${t.label}`, group: "Điều hướng", icon: t.icon, run: () => setTab(t.key) })),
      ...NODES.map((n) => ({ label: `Chuyển Node: ${n.name} (${n.chip})`, group: "Node/Phòng", icon: n.icon, run: () => setNodeId(n.id) })),
      { label: "Bật/Tắt Dark Mode", group: "Giao diện", icon: Moon, run: () => toggleDark() },
      { label: "Xuất báo cáo cảm biến CSV", group: "Hành động", icon: Download, run: () => toast.success("Đã yêu cầu xuất CSV") },
      { label: "Reboot ESP32-S3", group: "Hành động", icon: Cpu, run: () => toast("Đang gửi lệnh reboot…", { description: "MQTT topic: node01/cmd/reboot" }) },
    ],
    [setTab, setNodeId, toggleDark],
  );
  
  const filtered = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 pt-24 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-2xl animate-scale-in dark:bg-slate-900 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm thiết bị, cảm biến, log…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 text-slate-800 dark:text-white"
          />
          <kbd className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-slate-400">Không có kết quả cho "{q}"</li>
          )}
          {filtered.map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={i}>
                <button
                  onClick={() => {
                    it.run();
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 dark:text-slate-350 transition hover:bg-slate-100 dark:hover:bg-slate-800 w-full cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-slate-500" />
                  <span className="flex-1">{it.label}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{it.group}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
