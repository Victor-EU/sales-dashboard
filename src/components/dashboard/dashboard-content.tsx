"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "./metric-card";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { WeeklyComparisonTable } from "./weekly-comparison-table";
import { MovementsList } from "./movements-list";
import { useMetrics, useTrends, useMovements } from "@/hooks/use-api";
import { useWeek } from "@/contexts/week-context";
import { getMockDashboardMetrics, getMockTrendData, getMockMovements } from "@/lib/mock-data";
import type { StageMetrics, TrendPoint, DealMovement } from "@/types";
import type { StageCategory } from "@/lib/constants";

export function DashboardContent() {
  // Get selected week from context - pipeline data comes from the snapshot
  const { selectedWeekId: weekId } = useWeek();

  // Use snapshot metrics - pipeline = all open deals at snapshot time
  const { data: apiMetrics, isLoading: metricsLoading, error: metricsError } = useMetrics(weekId);
  const { data: apiTrends, isLoading: trendsLoading, error: trendsError } = useTrends(12);
  const { data: apiMovements, isLoading: movementsLoading, error: movementsError } = useMovements(weekId);

  // Use mock data as fallback when API is not available
  const mockMetrics = getMockDashboardMetrics();
  const mockTrendData = getMockTrendData();
  const mockMovements = getMockMovements();

  // Transform API data to match component types
  const metrics = apiMetrics
    ? {
        ...apiMetrics,
        stages: apiMetrics.stages.map((s) => ({
          ...s,
          stage: s.stage as StageCategory,
        })) as StageMetrics[],
      }
    : mockMetrics;

  const trendData: TrendPoint[] = apiTrends || mockTrendData;

  const movements: DealMovement[] = apiMovements
    ? [
        ...apiMovements.movements.forward,
        ...apiMovements.movements.won,
        ...apiMovements.movements.lost,
        ...apiMovements.movements.newDeals,
      ].map((m) => ({
        id: m.id,
        dealId: m.dealId,
        dealName: m.dealName,
        customerName: m.customerName || "",
        fromStage: m.fromStage as StageCategory | null,
        toStage: m.toStage as StageCategory,
        movementType: m.movementType as DealMovement["movementType"],
        value: m.value,
        ownerName: m.ownerName || "",
        weekId: m.weekId,
      }))
    : mockMovements;

  const sparklineData = trendData.map((d) => d.value);
  const isLoading = metricsLoading || trendsLoading || movementsLoading;
  const hasApiError = metricsError || trendsError || movementsError;

  return (
    <div className="space-y-6">
      {/* API Error Indicator */}
      {hasApiError && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
          Using demo data. Connect to backend for live HubSpot data.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Open Pipeline"
          value={metrics.totalValue}
          previousValue={metrics.prevTotalValue}
          format="currency"
          sparklineData={sparklineData}
          tooltip="Sum of ARR for all open deals (MQL, SAL, SQL) at snapshot time"
          loading={isLoading && !hasApiError}
        />
        <MetricCard
          label="Total Logos"
          value={metrics.totalLogos}
          previousValue={metrics.prevTotalLogos}
          format="number"
          tooltip="Number of unique deals in the pipeline"
          loading={isLoading && !hasApiError}
        />
        <MetricCard
          label="ARPA"
          value={metrics.arpa}
          previousValue={metrics.prevArpa}
          format="currency"
          tooltip="Average Revenue Per Account (Total Value / Total Logos)"
          loading={isLoading && !hasApiError}
        />
        <MetricCard
          label="Win Rate"
          value={metrics.winRate}
          previousValue={metrics.prevWinRate}
          format="percent"
          tooltip="Percentage of deals closed won vs total closed"
          loading={isLoading && !hasApiError}
        />
      </div>

      {/* Funnel & Trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={metrics.stages} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>12-Week Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trendData} />
          </CardContent>
        </Card>
      </div>

      {/* Weekly Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <WeeklyComparisonTable stages={metrics.stages} />
        </CardContent>
      </Card>

      {/* Stage Movements */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MovementsList
          title="Moved Forward"
          movements={movements.filter(
            (m) => m.movementType === "FORWARD" || m.movementType === "SKIP_FORWARD"
          )}
          variant="forward"
        />
        <MovementsList
          title="Won This Week"
          movements={movements.filter((m) => m.movementType === "WON")}
          variant="won"
        />
      </div>
    </div>
  );
}
