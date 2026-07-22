import { useEffect, useRef, useState } from "react";
import { useCustomTime } from "./use-custom-time.tsx";

/* ---------- time hooks ---------- */

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useRelativeTime(timestamp: number) {
  const now = useNow(15_000);
  const diff = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (diff < 10) return "vừa xong";
  if (diff < 60) return `${diff} giây trước`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}

export type TimeOfDay = "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";

/**
 * Lấy giờ hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh / UTC+7).
 * Dùng Intl.DateTimeFormat để ép về đúng giờ VN bất kể timezone của trình duyệt/server.
 */
export function getTimeOfDayVN(date?: Date): number {
  const targetDate = date || new Date();
  const getFallbackVNTime = () => {
    const utc = targetDate.getTime() + (targetDate.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 7)); // UTC+7
  };

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "numeric",
      hour12: false,
    });
    const hourStr = formatter.format(targetDate);
    const h = parseInt(hourStr, 10);
    // Intl trả về 0–23; giờ 24 (midnight) normalize về 0
    return isNaN(h) ? getFallbackVNTime().getHours() : h % 24;
  } catch {
    // Fallback nếu Intl không hỗ trợ timezone cụ thể
    return getFallbackVNTime().getHours();
  }
}

export function useTimeOfDay(customDate?: Date): { period: TimeOfDay; gradient: string; darkGradient: string; label: string; hour: number } {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { currentTime } = useCustomTime();
  
  const effectiveDate = customDate || currentTime;
  const h = mounted ? getTimeOfDayVN(effectiveDate) : 10; // deterministic default for SSR

  // Rich, distinct dark mode gradients for each time of day
  const darkDawn =
    "radial-gradient(1200px 600px at -10% -10%,#451a03 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#31103f 0%,transparent 55%),linear-gradient(180deg,#0f172a 0%,#1e1b4b 100%)";
  
  const darkNoon =
    "radial-gradient(1200px 600px at -10% -10%,#1e3a8a 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#0f766e 0%,transparent 55%),linear-gradient(180deg,#0f172a 0%,#172554 100%)";

  const darkAfternoon =
    "radial-gradient(1200px 600px at -10% -10%,#78350f 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#581c87 0%,transparent 55%),linear-gradient(180deg,#1c1917 0%,#2e1065 100%)";

  const darkEvening =
    "radial-gradient(1200px 600px at -10% -10%,#701a75 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#312e81 0%,transparent 55%),linear-gradient(180deg,#1e1b4b 0%,#3b0764 100%)";

  const darkNight =
    "radial-gradient(1200px 600px at -10% -10%,#1e293b 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#312e81 0%,transparent 55%),linear-gradient(180deg,#0b1020 0%,#1a1836 100%)";

  // 05:00–09:59 → Sáng sớm
  if (h >= 5 && h < 10)
    return {
      period: "dawn",
      label: "Sáng sớm",
      hour: h,
      darkGradient: darkDawn,
      gradient:
        "radial-gradient(1200px 600px at -10% -10%,#ffe4c4 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#ffd6e0 0%,transparent 55%),linear-gradient(180deg,#fff5eb 0%,#ffe9d6 100%)",
    };
  // 10:00–12:59 → Buổi trưa
  if (h >= 10 && h < 13)
    return {
      period: "noon",
      label: "Buổi trưa",
      hour: h,
      darkGradient: darkNoon,
      gradient:
        "radial-gradient(1200px 600px at -10% -10%,#dbe7ff 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#e0f7ff 0%,transparent 55%),linear-gradient(180deg,#f6f9ff 0%,#eaf2fb 100%)",
    };
  // 13:00–18:59 → Buổi chiều
  if (h >= 13 && h < 19)
    return {
      period: "afternoon",
      label: "Buổi chiều",
      hour: h,
      darkGradient: darkAfternoon,
      gradient:
        "radial-gradient(1200px 600px at -10% -10%,#fff2c4 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#ffe4b0 0%,transparent 55%),linear-gradient(180deg,#fffaf0 0%,#fff3e0 100%)",
    };
  // 19:00–21:59 → Buổi tối
  if (h >= 19 && h < 22)
    return {
      period: "evening",
      label: "Buổi tối",
      hour: h,
      darkGradient: darkEvening,
      gradient:
        "radial-gradient(1200px 600px at -10% -10%,#581c87 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#831843 0%,transparent 55%),linear-gradient(180deg,#2e1065 0%,#3b0764 100%)",
    };
  // 22:00–04:59 → Đêm khuya
  return {
    period: "night",
    label: "Đêm khuya",
    hour: h,
    darkGradient:
      "radial-gradient(1200px 600px at -10% -10%,#020617 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#1e1b4b 0%,transparent 55%),linear-gradient(180deg,#020617 0%,#0f172a 100%)",
    gradient:
      "radial-gradient(1200px 600px at -10% -10%,#1e1b4b 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#1e293b 0%,transparent 55%),linear-gradient(180deg,#0b1020 0%,#1a1836 100%)",
  };
}

export function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("sh-theme") : null;
    let init = false;
    if (stored) {
      init = stored === "dark";
    } else {
      const h = getTimeOfDayVN();
      init = h >= 19 || h < 5;
    }
    setDark(init);
    document.documentElement.classList.toggle("dark", init);
  }, []);
  const toggle = () => {
    setDark((d) => {
      const nd = !d;
      document.documentElement.classList.toggle("dark", nd);
      try { window.localStorage.setItem("sh-theme", nd ? "dark" : "light"); } catch {}
      return nd;
    });
  };
  return { dark, toggle };
}

/* ---------- animated number ---------- */

export function useAnimatedNumber(target: number | null, duration = 700) {
  const [value, setValue] = useState(target ?? 0);
  const rafRef = useRef(0);
  useEffect(() => {
    if (target == null) { setValue(0); return; }
    const from = value;
    const to = target;
    if (from === to) return;
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (to - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
}
