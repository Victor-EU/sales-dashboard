"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { HealthStatus } from "@/lib/constants";
import { HEALTH_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface DealHealthBadgeProps {
  status: HealthStatus;
  reasons?: string[];
  showLabel?: boolean;
}

export function DealHealthBadge({
  status,
  reasons = [],
  showLabel = true,
}: DealHealthBadgeProps) {
  const config = HEALTH_CONFIG[status];

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      <span className="text-[10px]">{config.icon}</span>
      {showLabel && config.label}
    </span>
  );

  if (reasons.length === 0) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-medium">{config.label}</p>
          <ul className="text-xs text-muted-foreground">
            {reasons.map((reason, i) => (
              <li key={i}>• {reason}</li>
            ))}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
