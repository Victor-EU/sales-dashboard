import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type FormatType = "currency" | "number" | "percent";

interface TrendIndicatorProps {
  value: number;
  format?: FormatType;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}

function formatValue(value: number, format: FormatType): string {
  const absValue = Math.abs(value);
  const sign = value > 0 ? "+" : "";
  switch (format) {
    case "currency":
      return `${sign}${formatCurrency(absValue)}`;
    case "percent":
      return formatPercent(value);
    default:
      return `${sign}${formatNumber(absValue)}`;
  }
}

export function TrendIndicator({
  value,
  format = "number",
  showIcon = true,
  size = "sm",
  className,
}: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        size === "sm" ? "text-xs" : "text-sm",
        isPositive && "text-emerald-600 dark:text-emerald-500",
        value < 0 && "text-red-600 dark:text-red-500",
        isNeutral && "text-muted-foreground",
        className
      )}
    >
      {showIcon &&
        (isPositive ? (
          <TrendingUp className={iconSize} />
        ) : value < 0 ? (
          <TrendingDown className={iconSize} />
        ) : (
          <Minus className={iconSize} />
        ))}
      {formatValue(value, format)}
    </span>
  );
}
