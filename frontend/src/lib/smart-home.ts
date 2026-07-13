import { useEffect, useRef, useState } from "react";

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
export function getTimeOfDayVN(): number {
  const getFallbackVNTime = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 7)); // UTC+7
  };

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "numeric",
      hour12: false,
    });
    const hourStr = formatter.format(new Date());
    const h = parseInt(hourStr, 10);
    // Intl trả về 0–23; giờ 24 (midnight) normalize về 0
    return isNaN(h) ? getFallbackVNTime().getHours() : h % 24;
  } catch {
    // Fallback nếu Intl không hỗ trợ timezone cụ thể
    return getFallbackVNTime().getHours();
  }
}

export function useTimeOfDay(): { period: TimeOfDay; gradient: string; darkGradient: string; label: string } {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const now = useNow(60_000);
  // Lấy giờ VN chuẩn (UTC+7); dùng now để trigger re-render khi phút thay đổi
  void now; // consumed to trigger update
  const h = mounted ? getTimeOfDayVN() : 10; // deterministic default for SSR

  const dark =
    "radial-gradient(1200px 600px at -10% -10%,#1e293b 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#312e81 0%,transparent 55%),linear-gradient(180deg,#0b1020 0%,#1a1836 100%)";

  // 05:00–09:59 → Sáng sớm
  if (h >= 5 && h < 10)
    return {
      period: "dawn",
      label: "Sáng sớm",
      darkGradient: dark,
      gradient:
        "radial-gradient(1200px 600px at -10% -10%,#ffe4c4 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#ffd6e0 0%,transparent 55%),linear-gradient(180deg,#fff5eb 0%,#ffe9d6 100%)",
    };
  // 10:00–12:59 → Buổi trưa
  if (h >= 10 && h < 13)
    return {
      period: "noon",
      label: "Buổi trưa",
      darkGradient: dark,
      gradient:
        "radial-gradient(1200px 600px at -10% -10%,#dbe7ff 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#e0f7ff 0%,transparent 55%),linear-gradient(180deg,#f6f9ff 0%,#eaf2fb 100%)",
    };
  // 13:00–18:59 → Buổi chiều
  if (h >= 13 && h < 19)
    return {
      period: "afternoon",
      label: "Buổi chiều",
      darkGradient: dark,
      gradient:
        "radial-gradient(1200px 600px at -10% -10%,#fff2c4 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#ffe4b0 0%,transparent 55%),linear-gradient(180deg,#fffaf0 0%,#fff3e0 100%)",
    };
  // 19:00–21:59 → Buổi tối
  if (h >= 19 && h < 22)
    return {
      period: "evening",
      label: "Buổi tối",
      darkGradient: dark,
      gradient:
        "radial-gradient(1200px 600px at -10% -10%,#ffb8a8 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#c7a8ff 0%,transparent 55%),linear-gradient(180deg,#fde4d8 0%,#e8d8ff 100%)",
    };
  // 22:00–04:59 → Đêm khuya
  return {
    period: "night",
    label: "Đêm khuya",
    darkGradient: dark,
    gradient:
      "radial-gradient(1200px 600px at -10% -10%,#334166 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#3d2a5c 0%,transparent 55%),linear-gradient(180deg,#1e2440 0%,#2a2148 100%)",
  };
}

export function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("sh-theme") : null;
    const init = stored === "dark";
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

export function useAnimatedNumber(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const rafRef = useRef(0);
  useEffect(() => {
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
