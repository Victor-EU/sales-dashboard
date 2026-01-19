"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "./metric-card";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { WeeklyComparisonTable } from "./weekly-comparison-table";
import { MovementsList } from "./movements-list";
import { useMetrics, useTrends, useMovements, useScopedMetrics } from "@/hooks/use-api";
import { useWeek } from "@/contexts/week-context";
import { getMockDashboardMetrics, getMockTrendData, getMockMovements } from "@/lib/mock-data";
import type { StageMetrics, TrendPoint, DealMovement } from "@/types";
import type { StageCategory } from "@/lib/constants";

export function DashboardContent() {
  // Get selected week and period from context
  const { selectedWeekId: weekId, selectedPeriod, isScopedMode } = useWeek();

  // Use regular metrics for "all" or scoped metrics when a period is selected
  const { data: apiMetrics, isLoading: metricsLoading, error: metricsError } = useMetrics(weekId);
  const { data: scopedMetrics, isLoading: scopedLoading, error: scopedError } = useScopedMetrics(
    isScopedMode ? weekId : undefined,
    isScopedMode ? selectedPeriod : undefined
  );
  const { data: apiTrends, isLoading: trendsLoading, error: trendsError } = useTrends(12);
  const { data: apiMovements, isLoading: movementsLoading, error: movementsError } = useMovements(weekId);

  // Use mock data as fallback when API is not available
  const mockMetrics = getMockDashboardMetrics();
  const mockTrendData = getMockTrendData();
  const mockMovements = getMockMovements();

  // Transform API data to match component types
  // When in scoped mode, use scoped metrics; otherwise use regular metrics
  const metrics = (() => {
    if (isScopedMode && scopedMetrics) {
      // Transform scoped metrics format to match the dashboard format
      return {
        totalValue: scopedMetrics.pipeline.totalValue,
        totalLogos: scopedMetrics.pipeline.totalLogos,
        arpa: scopedMetrics.pipeline.arpa,
        winRate: scopedMetrics.winRate.rate,
        // For scoped mode, we don't have previous week comparisons
        prevTotalValue: undefined,
        prevTotalLogos: undefined,
        prevArpa: undefined,
        prevWinRate: undefined,
        stages: scopedMetrics.pipeline.stages.map((s) => ({
          ...s,
          stage: s.stage as StageCategory,
          // Scoped mode doesn't have week-over-week changes
          prevValue: undefined,
          prevLogos: undefined,
          valueChange: undefined,
          logoChange: undefined,
        })) as StageMetrics[],
      };
    }
    if (apiMetrics) {
      return {
        ...apiMetrics,
        stages: apiMetrics.stages.map((s) => ({
          ...s,
          stage: s.stage as StageCategory,
        })) as StageMetrics[],
      };
    }
    return mockMetrics;
  })();

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
  const isLoading = metricsLoading || trendsLoading || movementsLoading || scopedLoading;
  const hasApiError = metricsError || trendsError || movementsError || (isScopedMode && scopedError);

  return (
    <div className="space-y-6">
      {/* Scoped Mode Indicator */}
      {isScopedMode && scopedMetrics && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
          <strong>{scopedMetrics.pipelineName} - {selectedPeriod}:</strong>{" "}
          Pipeline: {scopedMetrics.pipeline.totalLogos} deals (${(scopedMetrics.pipeline.totalValue / 1000000).toFixed(2)}M) |{" "}
          Won: {scopedMetrics.winRate.wonLogos} deals (${(scopedMetrics.winRate.wonValue / 1000).toFixed(0)}K) |{" "}
          Lost: {scopedMetrics.winRate.lostLogos} |{" "}
          Win Rate: {scopedMetrics.winRate.rate.toFixed(1)}%
        </div>
      )}

      {/* Key Metrics */}
      {hasApiError && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
          Using demo data. Connect to backend for live HubSpot data.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Pipeline"
          value={metrics.totalValue}
          previousValue={metrics.prevTotalValue}
          format="currency"
          sparklineData={sparklineData}
          tooltip="Sum of ARR for all deals in MQL, SAL, and SQL stages"
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
