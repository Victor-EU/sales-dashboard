"use client";

import type { StageMetrics } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { TrendIndicator } from "@/components/dashboard/trend-indicator";
import { STAGE_CONFIG, FUNNEL_STAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FunnelChartProps {
  stages: StageMetrics[];
}

export function FunnelChart({ stages }: FunnelChartProps) {
  const stageMap = new Map(stages.map((s) => [s.stage, s]));
  const maxValue = Math.max(...stages.map((s) => s.value));

  return (
    <div className="space-y-3">
      {FUNNEL_STAGES.filter((s) => s !== "LOST").map((stageName, index) => {
        const stage = stageMap.get(stageName);
        if (!stage) return null;

        const widthPercent = (stage.value / maxValue) * 100;
        const config = STAGE_CONFIG[stageName];

        return (
          <div key={stageName} className="group">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{config.label}</span>
              <div className="flex items-center gap-3 tabular-nums">
                <span className="text-muted-foreground">
                  {formatNumber(stage.logos)} deals
                </span>
                <span className="font-semibold">{formatCurrency(stage.value)}</span>
              </div>
            </div>
            <div className="relative h-10 overflow-hidden rounded-lg bg-muted">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-lg transition-all duration-500",
                  stageName === "MQL" && "bg-violet-500",
                  stageName === "SAL" && "bg-blue-500",
                  stageName === "SQL" && "bg-cyan-500",
                  stageName === "WON" && "bg-emerald-500"
                )}
                style={{ width: `${widthPercent}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-3">
                <span className="text-xs font-medium text-white drop-shadow-sm">
                  ARPA: {formatCurrency(stage.arpa, false)}
                </span>
                {stage.valueChange !== undefined && (
                  <TrendIndicator
                    value={stage.valueChange}
                    format="currency"
                    size="sm"
                    className="text-white drop-shadow-sm"
                  />
                )}
              </div>
            </div>
            {index < FUNNEL_STAGES.length - 2 && (
              <div className="ml-4 mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <span>↓</span>
                <span>
                  {stages[index + 1] && stages[index]
                    ? `${((stages[index + 1].logos / stages[index].logos) * 100).toFixed(0)}% conversion`
                    : ""}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
