"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { StageTrendPoint } from "@/types";
import { formatCurrency } from "@/lib/format";

interface TrendChartProps {
  data: StageTrendPoint[];
}

const STAGE_COLORS = {
  SAL: { fill: "hsl(262, 83%, 58%)", stroke: "hsl(262, 83%, 48%)" },         // Violet
  SQL: { fill: "hsl(217, 91%, 60%)", stroke: "hsl(217, 91%, 50%)" },         // Blue
  QUOTE_SENT: { fill: "hsl(189, 94%, 43%)", stroke: "hsl(189, 94%, 33%)" }, // Cyan
  NEGOTIATION: { fill: "hsl(38, 92%, 50%)", stroke: "hsl(38, 92%, 40%)" },  // Amber
};

const STAGE_LABELS: Record<string, string> = {
  SAL: "SAL",
  SQL: "SQL",
  QUOTE_SENT: "Quote Sent",
  NEGOTIATION: "Negotiation",
};

export function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            {Object.entries(STAGE_COLORS).map(([stage, colors]) => (
              <linearGradient key={stage} id={`color${stage}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors.fill} stopOpacity={0.8} />
                <stop offset="95%" stopColor={colors.fill} stopOpacity={0.2} />
              </linearGradient>
            ))}
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
                const data = payload[0].payload as StageTrendPoint;
                return (
                  <div className="rounded-lg border bg-background p-3 shadow-lg">
                    <p className="mb-2 text-sm font-medium">{label}</p>
                    <div className="space-y-1 text-sm">
                      {["NEGOTIATION", "QUOTE_SENT", "SQL", "SAL"].map((stage) => {
                        const value = data[stage as keyof StageTrendPoint] as number;
                        const colors = STAGE_COLORS[stage as keyof typeof STAGE_COLORS];
                        return (
                          <div key={stage} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-sm"
                                style={{ backgroundColor: colors.fill }}
                              />
                              <span className="text-muted-foreground">
                                {STAGE_LABELS[stage]}
                              </span>
                            </div>
                            <span className="font-medium tabular-nums">
                              {formatCurrency(value, false)}
                            </span>
                          </div>
                        );
                      })}
                      <div className="mt-2 flex items-center justify-between gap-4 border-t pt-2">
                        <span className="font-medium">Total</span>
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(data.total, false)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(value: string) => STAGE_LABELS[value] || value}
          />
          <Area
            type="monotone"
            dataKey="SAL"
            stackId="1"
            stroke={STAGE_COLORS.SAL.stroke}
            fill={`url(#colorSAL)`}
          />
          <Area
            type="monotone"
            dataKey="SQL"
            stackId="1"
            stroke={STAGE_COLORS.SQL.stroke}
            fill={`url(#colorSQL)`}
          />
          <Area
            type="monotone"
            dataKey="QUOTE_SENT"
            stackId="1"
            stroke={STAGE_COLORS.QUOTE_SENT.stroke}
            fill={`url(#colorQUOTE_SENT)`}
          />
          <Area
            type="monotone"
            dataKey="NEGOTIATION"
            stackId="1"
            stroke={STAGE_COLORS.NEGOTIATION.stroke}
            fill={`url(#colorNEGOTIATION)`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
