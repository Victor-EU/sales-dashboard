"use client";

import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendIndicator } from "./trend-indicator";
import { Sparkline } from "./sparkline";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type FormatType = "currency" | "number" | "percent";

interface MetricCardProps {
  label: string;
  value: number;
  previousValue?: number | null;
  format?: FormatType;
  sparklineData?: number[];
  tooltip?: string;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

const metricSizeClasses = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

function formatValue(value: number, format: FormatType): string {
  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return formatPercent(value, false);
    default:
      return formatNumber(value);
  }
}

export function MetricCard({
  label,
  value,
  previousValue,
  format = "number",
  sparklineData,
  tooltip,
  size = "md",
  loading = false,
  className,
}: MetricCardProps) {
  const hasPreviousValue = previousValue != null;
  const change = hasPreviousValue ? value - previousValue : undefined;
  const changePercent =
    hasPreviousValue && previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : undefined;

  if (loading) {
    return (
      <Card className={cn(sizeClasses[size], className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="mt-3">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="mt-2">
          <Skeleton className="h-4 w-20" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(sizeClasses[size], className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <Info className="h-4 w-4" />
                <span className="sr-only">Info</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <span
          className={cn(
            "font-bold tracking-tight tabular-nums",
            metricSizeClasses[size]
          )}
        >
          {formatValue(value, format)}
        </span>

        {sparklineData && sparklineData.length > 0 && (
          <Sparkline
            data={sparklineData}
            className="h-8 w-20"
            trend={change !== undefined ? (change >= 0 ? "up" : "down") : "neutral"}
          />
        )}
      </div>

      {change !== undefined && (
        <div className="mt-2 flex items-center gap-2">
          <TrendIndicator value={change} format={format} />
          {changePercent !== undefined && (
            <span className="text-xs text-muted-foreground">
              ({changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(1)}%) vs last week
            </span>
          )}
        </div>
      )}
    </Card>
  );
}
