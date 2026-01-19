"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/types";
import { formatCurrency } from "@/lib/format";

interface TrendChartProps {
  data: TrendPoint[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCurrency(value)}
            width={80}
            className="text-muted-foreground"
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as TrendPoint;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    <p className="mb-1 text-sm font-medium">{label}</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        Value:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(data.value, false)}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Logos:{" "}
                        <span className="font-medium text-foreground">{data.logos}</span>
                      </p>
                      <p className="text-muted-foreground">
                        ARPA:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(data.arpa, false)}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(217, 91%, 60%)"
            strokeWidth={2}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
