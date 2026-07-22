import { cn } from "@/lib/utils";
import React from "react";

export function GlassCard({
  className,
  children,
  style,
  ...props
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  [key: string]: any;
}) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-2xl border border-slate-200 bg-white/95 text-slate-900 shadow-md backdrop-blur-xl transition-all duration-200 dark:border-white/15 dark:bg-slate-900/90 dark:text-slate-100 dark:shadow-2xl",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
