"use client";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { DealsTable } from "@/components/deals/deals-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeals } from "@/hooks/use-api";
import { useWeek } from "@/contexts/week-context";
import type { Deal } from "@/types";
import type { StageCategory, HealthStatus } from "@/lib/constants";

export default function DealsPage() {
  const { selectedWeekId } = useWeek();
  const { data: apiDeals, isLoading, error } = useDeals(selectedWeekId);

  // Transform API deals to match component types
  const deals: Deal[] = apiDeals
    ? apiDeals.map((d) => ({
        id: d.id,
        name: d.name,
        customerName: d.customerName || "",
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
      }))
    : [];

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-muted-foreground">
            Manage and track all active deals in your pipeline.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            Failed to load deals. Please check your backend connection.
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <DealsTable deals={deals} />
        )}
      </div>
    </DashboardShell>
  );
}
