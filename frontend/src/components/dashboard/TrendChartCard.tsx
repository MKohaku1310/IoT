import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Thermometer } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  Line,
} from "recharts";

export function TrendChartCard({
  title,
  currentValue,
  unit,
  data,
  dataKey,
  color,
  gradientId,
  glowFilterId,
  icon: Icon,
  colorFrom,
  colorTo,
}: {
  title: string;
  currentValue: number;
  unit: string;
  data: any[];
  dataKey: string;
  color: string;
  gradientId: string;
  glowFilterId: string;
  icon: typeof Thermometer;
  colorFrom: string;
  colorTo: string;
}) {
  const xAxisTicks = useMemo(() => {
    return data
      .map((d) => d.label)
      .filter((label) => {
        if (!label) return false;
        const [hh, mm] = label.split(":");
        return mm === "00" && Number(hh) % 3 === 0;
      });
  }, [data]);

  return (
    <div className="rounded-3xl border border-white/70 bg-white/70 dark:bg-[#1a1f2e] dark:border-slate-800 p-5 shadow-[0_10px_40px_-20px_rgba(30,41,59,0.25)] backdrop-blur-xl transition-all duration-300 flex flex-col justify-between h-[300px]">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", colorFrom)}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</span>
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {currentValue}
          </span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{unit}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-4 flex-1 h-36 w-full relative flex items-center justify-center">
        {data.length === 0 ? (
          <div className="text-slate-400 dark:text-slate-500 text-xs animate-pulse">Đang tải xu hướng...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
                <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <XAxis
                dataKey="label"
                ticks={xAxisTicks}
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#94a3b8", opacity: 0.4 }}
                axisLine={false}
                tickLine={false}
                domain={([dataMin, dataMax]) => {
                  if (dataMin === undefined || dataMin === null || isNaN(dataMin)) return [0, 100];
                  if (dataMin === dataMax) return [Math.max(0, dataMin - 10), dataMax + 10];
                  return [Math.max(0, dataMin - (dataMax - dataMin) * 0.1), dataMax + (dataMax - dataMin) * 0.1];
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                  color: "#1e293b",
                }}
                labelStyle={{ fontWeight: 600, color: "#64748b" }}
                formatter={(v: any) => [`${v !== null ? v : "N/A"} ${unit}`, title]}
                labelFormatter={(l: any) => `Thời gian: ${l}`}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="none"
                fill={`url(#${gradientId})`}
                connectNulls={true}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1, stroke: "#fff", fill: color }}
                filter={`url(#${glowFilterId})`}
                connectNulls={true}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
