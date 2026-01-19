"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function Sparkline({ data, trend = "neutral", className }: SparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  const colors = {
    up: {
      stroke: "hsl(160, 84%, 39%)",
      fill: "hsl(160, 84%, 39%)",
    },
    down: {
      stroke: "hsl(0, 84%, 60%)",
      fill: "hsl(0, 84%, 60%)",
    },
    neutral: {
      stroke: "hsl(220, 9%, 46%)",
      fill: "hsl(220, 9%, 46%)",
    },
  };

  const color = colors[trend];

  return (
    <div className={cn("h-8 w-20", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${trend}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color.fill} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color.fill} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color.stroke}
            strokeWidth={1.5}
            fill={`url(#gradient-${trend})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
