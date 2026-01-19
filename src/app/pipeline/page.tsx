"use client";

import { useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DealHealthBadge } from "@/components/deals/deal-health-badge";
import { useDeals } from "@/hooks/use-api";
import { useWeek } from "@/contexts/week-context";
import { formatCurrency } from "@/lib/format";
import { STAGE_CONFIG } from "@/lib/constants";
import type { StageCategory, HealthStatus } from "@/lib/constants";
import type { Deal } from "@/types";
import { cn } from "@/lib/utils";

const PIPELINE_STAGES: StageCategory[] = ["MQL", "SAL", "SQL"];

interface StageColumnProps {
  stage: StageCategory;
  deals: Deal[];
  isLoading?: boolean;
}

function StageColumnSkeleton({ stage }: { stage: StageCategory }) {
  const config = STAGE_CONFIG[stage];
  return (
    <div className="flex flex-1 flex-col">
      <div
        className={cn(
          "mb-3 flex items-center justify-between rounded-lg px-3 py-2",
          stage === "MQL" && "bg-violet-100 dark:bg-violet-950",
          stage === "SAL" && "bg-blue-100 dark:bg-blue-950",
          stage === "SQL" && "bg-cyan-100 dark:bg-cyan-950"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold">{config.label}</span>
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-1 h-3 w-1/2" />
              <div className="mt-2 flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StageColumn({ stage, deals, isLoading }: StageColumnProps) {
  const config = STAGE_CONFIG[stage];
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

  if (isLoading) {
    return <StageColumnSkeleton stage={stage} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div
        className={cn(
          "mb-3 flex items-center justify-between rounded-lg px-3 py-2",
          stage === "MQL" && "bg-violet-100 dark:bg-violet-950",
          stage === "SAL" && "bg-blue-100 dark:bg-blue-950",
          stage === "SQL" && "bg-cyan-100 dark:bg-cyan-950"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold">{config.label}</span>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium">
            {deals.length}
          </span>
        </div>
        <span className="text-sm font-medium tabular-nums">
          {formatCurrency(totalValue)}
        </span>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto">
        {deals.map((deal) => (
          <Card key={deal.id} className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{deal.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {deal.customerName}
                  </p>
                </div>
                <DealHealthBadge status={deal.health as HealthStatus} showLabel={false} />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{deal.ownerName || "Unassigned"}</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(deal.value, false)}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {deal.daysInStage}d in stage
              </div>
            </CardContent>
          </Card>
        ))}
        {deals.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No deals in this stage
          </p>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const { selectedWeekId } = useWeek();
  const { data: apiDeals, isLoading } = useDeals(selectedWeekId);

  const deals: Deal[] = useMemo(() => {
    if (!apiDeals) return [];
    return apiDeals.map((d) => ({
      id: d.id,
      name: d.name,
      customerName: d.customerName || undefined,
      value: d.value,
      stage: d.stage as StageCategory,
      stageId: d.stageId,
      pipelineId: d.pipelineId,
      pipelineName: d.pipelineName,
      ownerId: d.ownerId,
      ownerName: d.ownerName,
      createdDate: d.createdDate,
      closeDate: d.closeDate,
      lastModifiedDate: d.lastModifiedDate,
      health: d.health as HealthStatus,
      healthReasons: d.healthReasons,
      daysInStage: d.daysInStage,
    }));
  }, [apiDeals]);

  const dealsByStage = useMemo(() => {
    const grouped = new Map<StageCategory, Deal[]>();
    PIPELINE_STAGES.forEach((stage) => grouped.set(stage, []));

    deals.forEach((deal) => {
      const stageDeals = grouped.get(deal.stage);
      if (stageDeals) {
        stageDeals.push(deal);
      }
    });

    return grouped;
  }, [deals]);

  return (
    <DashboardShell>
      <div className="flex h-full flex-col space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground">
            Visual overview of deals across pipeline stages.
          </p>
        </div>
        <div className="flex flex-1 gap-4 overflow-hidden">
          {PIPELINE_STAGES.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              deals={dealsByStage.get(stage) || []}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
