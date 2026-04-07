"use client";

import type { StageMetrics } from "@/types";
import { TrendIndicator } from "./trend-indicator";
import { formatCurrency, formatNumber } from "@/lib/format";
import { STAGE_CONFIG, FUNNEL_STAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface WeeklyComparisonTableProps {
  stages: StageMetrics[];
}

export function WeeklyComparisonTable({ stages }: WeeklyComparisonTableProps) {
  const stageMap = new Map(stages.map((s) => [s.stage, s]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-3 font-medium text-muted-foreground">Stage</th>
            <th className="pb-3 text-right font-medium text-muted-foreground">
              This Week
            </th>
            <th className="pb-3 text-right font-medium text-muted-foreground">
              Last Week
            </th>
            <th className="pb-3 text-right font-medium text-muted-foreground">
              Change
            </th>
            <th className="pb-3 text-right font-medium text-muted-foreground">In</th>
            <th className="pb-3 text-right font-medium text-muted-foreground">Out</th>
          </tr>
        </thead>
        <tbody>
          {FUNNEL_STAGES.map((stageName) => {
            const stage = stageMap.get(stageName);
            if (!stage) return null;

            const config = STAGE_CONFIG[stageName];

            return (
              <tr key={stageName} className="border-b last:border-0">
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        stageName === "SAL" && "bg-violet-500",
                        stageName === "SQL" && "bg-blue-500",
                        stageName === "QUOTE_SENT" && "bg-cyan-500",
                        stageName === "NEGOTIATION" && "bg-amber-500",
                        stageName === "WON" && "bg-emerald-500",
                        stageName === "LOST" && "bg-gray-500"
                      )}
                    />
                    <span className="font-medium">{config.label}</span>
                  </div>
                </td>
                <td className="py-3 text-right tabular-nums">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold">{formatCurrency(stage.value)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatNumber(stage.logos)} • {formatCurrency(stage.arpa, false)}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-right tabular-nums text-muted-foreground">
                  <div className="flex flex-col items-end">
                    <span>{formatCurrency(stage.prevValue || 0)}</span>
                    <span className="text-xs">
                      {formatNumber(stage.prevLogos || 0)} •{" "}
                      {formatCurrency(stage.prevArpa || 0, false)}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-right">
                  {stage.valueChange !== undefined && (
                    <TrendIndicator value={stage.valueChange} format="currency" />
                  )}
                </td>
                <td className="py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-500">
                  {stage.dealsEntered ? `+${stage.dealsEntered}` : "-"}
                </td>
                <td className="py-3 text-right tabular-nums text-red-600 dark:text-red-500">
                  {stage.dealsExited ? `-${stage.dealsExited}` : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
