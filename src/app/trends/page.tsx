"use client";

import { useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendChart } from "@/components/charts/trend-chart";
import { useTrends, useMetrics } from "@/hooks/use-api";
import { useWeek } from "@/contexts/week-context";
import { formatCurrency, formatNumber } from "@/lib/format";
import { TrendIndicator } from "@/components/dashboard/trend-indicator";
import { STAGE_CONFIG, FUNNEL_STAGES } from "@/lib/constants";
import type { StageCategory } from "@/lib/constants";
import type { TrendPoint, StageMetrics } from "@/types";
import { cn } from "@/lib/utils";

function TrendsSkeleton() {
  return (
    <>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="mt-1 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    </>
  );
}

export default function TrendsPage() {
  const { selectedWeekId } = useWeek();
  const { data: apiTrends, isLoading: trendsLoading, error: trendsError } = useTrends(12);
  const { data: apiMetrics, isLoading: metricsLoading, error: metricsError } = useMetrics(selectedWeekId);

  const isLoading = trendsLoading || metricsLoading;
  const error = trendsError || metricsError;

  const trendData: TrendPoint[] = useMemo(() => {
    if (!apiTrends) return [];
    return apiTrends.map((t) => ({
      weekId: t.weekId,
      week: t.week,
      value: t.value,
      logos: typeof t.logos === "string" ? parseInt(t.logos, 10) : t.logos,
      arpa: t.arpa,
    }));
  }, [apiTrends]);

  const stages: StageMetrics[] = useMemo(() => {
    if (!apiMetrics) return [];
    return apiMetrics.stages.map((s) => ({
      stage: s.stage as StageCategory,
      value: s.value,
      logos: s.logos,
      arpa: s.arpa,
      prevValue: s.prevValue ?? undefined,
      prevLogos: s.prevLogos ?? undefined,
      prevArpa: s.prevArpa ?? undefined,
      valueChange: s.valueChange ?? undefined,
      logosChange: s.logosChange ?? undefined,
      arpaChange: s.arpaChange ?? undefined,
      valueChangePct: s.valueChangePct ?? undefined,
      dealsEntered: s.dealsEntered,
      dealsExited: s.dealsExited,
    }));
  }, [apiMetrics]);

  const stageColorClasses: Record<string, string> = {
    MQL: "bg-violet-500",
    SAL: "bg-blue-500",
    SQL: "bg-cyan-500",
    WON: "bg-emerald-500",
    LOST: "bg-gray-500",
  };

  const avgWeeklyGrowth = useMemo(() => {
    if (trendData.length < 2) return 0;
    const growthRates = [];
    for (let i = 1; i < trendData.length; i++) {
      if (trendData[i - 1].value > 0) {
        growthRates.push(
          ((trendData[i].value - trendData[i - 1].value) / trendData[i - 1].value) * 100
        );
      }
    }
    return growthRates.length > 0
      ? growthRates.reduce((sum, r) => sum + r, 0) / growthRates.length
      : 0;
  }, [trendData]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trends</h1>
          <p className="text-muted-foreground">
            Historical pipeline performance and week-over-week comparisons.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            Failed to load trends. Please check your backend connection.
          </div>
        )}

        {isLoading ? (
          <TrendsSkeleton />
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>12-Week Pipeline Value Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart data={trendData} />
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Weekly Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {avgWeeklyGrowth >= 0 ? "+" : ""}
                    {avgWeeklyGrowth.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on {trendData.length}-week trend
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Peak Week Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums">
                    {trendData.length > 0
                      ? formatCurrency(Math.max(...trendData.map((t) => t.value)))
                      : "$0"}
                  </div>
                  <p className="text-xs text-muted-foreground">Highest in period</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg ARPA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums">
                    {trendData.length > 0
                      ? formatCurrency(
                          Math.round(
                            trendData.reduce((sum, t) => sum + t.arpa, 0) / trendData.length
                          ),
                          false
                        )
                      : "$0"}
                  </div>
                  <p className="text-xs text-muted-foreground">{trendData.length}-week average</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Current Logos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tabular-nums">
                    {trendData.length > 0
                      ? formatNumber(trendData[trendData.length - 1]?.logos || 0)
                      : "0"}
                  </div>
                  <p className="text-xs text-muted-foreground">Active deals in pipeline</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Stage Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {FUNNEL_STAGES.map((stageName) => {
                    const stage = stages.find((s) => s.stage === stageName);
                    if (!stage) return null;

                    const config = STAGE_CONFIG[stageName];

                    return (
                      <div
                        key={stageName}
                        className="flex items-center gap-4 rounded-lg border p-4"
                      >
                        <div
                          className={cn(
                            "h-3 w-3 rounded-full",
                            stageColorClasses[stageName]
                          )}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{config.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatNumber(stage.logos)} deals
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums">
                            {formatCurrency(stage.value)}
                          </p>
                          {stage.valueChange !== undefined && (
                            <TrendIndicator value={stage.valueChange} format="currency" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {stages.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No stage data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
