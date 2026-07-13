import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import {
  Menu,
  Home,
  Search,
  Sun,
  Moon,
  Bell,
  User,
  UserCircle,
  Settings as SettingsIcon,
  LogOut,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Alert } from "@/components/dashboard/types";
import { useRelativeTime } from "@/lib/smart-home";

function AlertItem({
  alert,
  isRead,
  onMark,
}: {
  alert: Alert;
  isRead: boolean;
  onMark: () => void;
}) {
  const rel = useRelativeTime(alert.ts);
  return (
    <DropdownMenuItem
      className={cn(
        "flex flex-col items-start gap-0.5 cursor-pointer transition-colors duration-200",
        isRead ? "opacity-60" : "bg-indigo-50/20 font-semibold"
      )}
      onClick={() => {
        onMark();
      }}
    >
      <div className="flex w-full items-center justify-between">
        <span className={cn("text-sm font-medium", isRead ? "text-slate-500" : alert.level === "error" ? "text-rose-600 font-semibold" : "text-amber-600 font-semibold")}>
          {alert.title}
        </span>
        {!isRead && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 ml-2" />}
      </div>
      <span className="text-xs text-slate-500 leading-normal">
        {rel} · {alert.detail}
      </span>
    </DropdownMenuItem>
  );
}

export function Header({
  title,
  nodeName,
  alerts,
  readAlertIds,
  onMarkAsRead,
  onMarkAllAsRead,
  bellPing,
  onOpen,
  dark,
  toggleDark,
  openPalette,
  currentUser,
  onMenuClick,
  lastSensorTime,
}: {
  title: string;
  nodeName: string;
  alerts: Alert[];
  readAlertIds: number[];
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: (ids: number[]) => void;
  bellPing: boolean;
  onOpen: () => void;
  dark: boolean;
  toggleDark: () => void;
  openPalette: () => void;
  currentUser: { hoten: string; email: string } | null;
  onMenuClick?: () => void;
  lastSensorTime?: Date | null;
}) {
  const unreadAlerts = alerts.filter((a) => !readAlertIds.includes(a.id));
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center gap-3 border-b px-6 py-4 backdrop-blur-xl lg:px-8",
        dark ? "border-white/10 bg-slate-950/40" : "border-white/60 bg-white/60",
      )}
    >
      <button
        onClick={onMenuClick}
        aria-label="Mở menu"
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl border shadow-sm transition lg:hidden cursor-pointer",
          dark
            ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            : "border-white/70 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900",
        )}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className={cn("truncate text-lg font-semibold sm:text-xl", dark ? "text-white" : "text-slate-900")}>{title}</h1>
          <Badge className="hidden md:inline-flex rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
            <Home className="mr-1 h-3 w-3" /> {nodeName}
          </Badge>
        </div>
        <p className={cn("hidden text-xs sm:block", dark ? "text-slate-400" : "text-slate-500")}>
          Đồng hồ: {time.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>

      {/* Search palette trigger */}
      <button
        onClick={openPalette}
        className={cn(
          "hidden md:inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm transition cursor-pointer",
          dark
            ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            : "border-white/70 bg-white/80 text-slate-500 hover:bg-white",
        )}
      >
        <Search className="h-3.5 w-3.5" />
        <span>Tìm nhanh…</span>
        <kbd className={cn("ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-medium", dark ? "bg-white/10" : "bg-slate-100 text-slate-500")}>
          Ctrl K
        </kbd>
      </button>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        aria-label="Chuyển giao diện"
        className={cn(
          "grid h-10 w-10 place-items-center rounded-xl border shadow-sm transition cursor-pointer",
          dark
            ? "border-white/10 bg-white/5 text-amber-300 hover:bg-white/10"
            : "border-white/70 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900",
        )}
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <DropdownMenu onOpenChange={(o) => o && onOpen()}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "relative grid h-10 w-10 place-items-center rounded-xl border border-white/70 bg-white/80 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 cursor-pointer",
              bellPing && "animate-[bell-shake_0.6s_ease-in-out]",
            )}
          >
            <Bell className="h-4 w-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {unreadAlerts.length}
                {bellPing && <span className="absolute inset-0 animate-ping rounded-full bg-rose-500 opacity-70" />}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Cảnh báo gần đây</span>
            {unreadAlerts.length > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMarkAllAsRead(unreadAlerts.map((a) => a.id));
                }}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-semibold cursor-pointer border-0 bg-transparent p-0 outline-none"
              >
                Đọc tất cả
              </button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {alerts.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-slate-500">Chưa có cảnh báo</div>
          )}
          {alerts.slice(0, 6).map((a) => (
            <AlertItem
              key={a.id}
              alert={a}
              isRead={readAlertIds.includes(a.id)}
              onMark={() => onMarkAsRead(a.id)}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {currentUser ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-xl border border-white/70 bg-white/80 py-1.5 pl-1.5 pr-3 shadow-sm transition hover:bg-white cursor-pointer">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-400 text-white">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden text-left sm:block">
                <div className="text-sm font-medium leading-tight text-slate-900">
                  {currentUser.hoten}
                </div>
                <div className="text-[11px] leading-tight text-slate-500">
                  {currentUser.email}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer">
                <UserCircle className="mr-2 h-4 w-4" /> Hồ sơ
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <SettingsIcon className="mr-2 h-4 w-4" /> Cài đặt tài khoản
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Đã đăng xuất thành công!");
              }}
              className="text-rose-600 focus:text-rose-600 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          asChild
          className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20 hover:opacity-90 cursor-pointer"
        >
          <Link to="/login">
            <User className="mr-2 h-4 w-4" /> Đăng nhập
          </Link>
        </Button>
      )}

      <style>{`
        @keyframes bell-shake {
          0%,100% { transform: rotate(0); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(12deg); }
          60% { transform: rotate(-8deg); }
          80% { transform: rotate(6deg); }
        }
        @keyframes breathing {
          0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.0), 0 10px 40px -20px rgba(30,41,59,0.25); }
          50% { box-shadow: 0 0 22px 4px var(--glow, rgba(99,102,241,0.35)), 0 10px 40px -20px rgba(30,41,59,0.25); }
        }
        @keyframes wind-sway {
          0%,100% { transform: translateX(0) rotate(-8deg); }
          25% { transform: translateX(3px) rotate(0deg); }
          50% { transform: translateX(0) rotate(8deg); }
          75% { transform: translateX(-3px) rotate(0deg); }
        }
      `}</style>
    </header>
  );
}
