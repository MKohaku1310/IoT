import { cn } from "@/lib/utils";
import React from "react";

export function GlassCard({
  className,
  children,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_10px_40px_-20px_rgba(30,41,59,0.25)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
