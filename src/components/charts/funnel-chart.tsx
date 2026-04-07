"use client";

import type { StageMetrics } from "@/types";
import { formatCurrency, formatNumber } from "@/lib/format";
import { TrendIndicator } from "@/components/dashboard/trend-indicator";
import { STAGE_CONFIG } from "@/lib/constants";
import type { StageCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Pipeline stages to display (active deals only, no WON/LOST) */
const PIPELINE_STAGES: StageCategory[] = ["SAL", "SQL", "QUOTE_SENT", "NEGOTIATION"];

interface FunnelChartProps {
  stages: StageMetrics[];
}

export function FunnelChart({ stages }: FunnelChartProps) {
  const stageMap = new Map(stages.map((s) => [s.stage, s]));
  const maxValue = Math.max(...stages.filter(s => PIPELINE_STAGES.includes(s.stage as StageCategory)).map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      {PIPELINE_STAGES.map((stageName) => {
        const stage = stageMap.get(stageName);
        if (!stage) return null;

        const widthPercent = Math.max((stage.value / maxValue) * 100, 2);
        const config = STAGE_CONFIG[stageName];

        return (
          <div key={stageName} className="group">
            {/* Stage header with metrics */}
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-3 w-3 rounded-sm",
                    stageName === "SAL" && "bg-violet-500",
                    stageName === "SQL" && "bg-blue-500",
                    stageName === "QUOTE_SENT" && "bg-cyan-500",
                    stageName === "NEGOTIATION" && "bg-amber-500"
                  )}
                />
                <span className="font-medium text-sm">{config.label}</span>
              </div>
              {stage.valueChange !== undefined && stage.valueChange !== 0 && (
                <TrendIndicator
                  value={stage.valueChange}
                  format="currency"
                  size="sm"
                />
              )}
            </div>

            {/* Progress bar */}
            <div className="relative h-8 overflow-hidden rounded-md bg-muted mb-2">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-md transition-all duration-500",
                  stageName === "SAL" && "bg-violet-500",
                  stageName === "SQL" && "bg-blue-500",
                  stageName === "QUOTE_SENT" && "bg-cyan-500",
                  stageName === "NEGOTIATION" && "bg-amber-500"
                )}
                style={{ width: `${widthPercent}%` }}
              />
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-2 text-sm pb-2 border-b border-border/50 last:border-0">
              <div>
                <p className="text-muted-foreground text-xs">Total</p>
                <p className="font-semibold tabular-nums">{formatCurrency(stage.value)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Deals</p>
                <p className="font-semibold tabular-nums">{formatNumber(stage.logos)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">ARPA</p>
                <p className="font-semibold tabular-nums">{formatCurrency(stage.arpa, false)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
