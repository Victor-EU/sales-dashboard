"use client";

import { useMemo } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { MovementsList } from "@/components/dashboard/movements-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMovements } from "@/hooks/use-api";
import { useWeek } from "@/contexts/week-context";
import { formatCurrency } from "@/lib/format";
import type { StageCategory } from "@/lib/constants";
import type { DealMovement } from "@/types";

function MovementsSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
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
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export default function MovementsPage() {
  const { selectedWeekId } = useWeek();
  const { data: apiMovements, isLoading, error } = useMovements(selectedWeekId);

  const categorizedMovements = useMemo(() => {
    if (!apiMovements) {
      return { forward: [], won: [], lost: [], newDeals: [] };
    }

    const transform = (m: typeof apiMovements.movements.forward[0]): DealMovement => ({
      id: m.id,
      dealId: m.dealId,
      dealName: m.dealName,
      customerName: m.customerName || undefined,
      fromStage: m.fromStage as StageCategory | null,
      toStage: m.toStage as StageCategory,
      movementType: m.movementType as DealMovement["movementType"],
      value: m.value,
      ownerName: m.ownerName,
      weekId: m.weekId,
    });

    return {
      forward: [
        ...apiMovements.movements.forward.map(transform),
        ...(apiMovements.movements.backward || []).map(transform),
      ],
      won: apiMovements.movements.won.map(transform),
      lost: apiMovements.movements.lost.map(transform),
      newDeals: apiMovements.movements.newDeals.map(transform),
    };
  }, [apiMovements]);

  const totals = useMemo(() => {
    return {
      forward: categorizedMovements.forward.reduce((sum, m) => sum + m.value, 0),
      won: categorizedMovements.won.reduce((sum, m) => sum + m.value, 0),
      lost: categorizedMovements.lost.reduce((sum, m) => sum + m.value, 0),
      newDeals: categorizedMovements.newDeals.reduce((sum, m) => sum + m.value, 0),
    };
  }, [categorizedMovements]);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Movements</h1>
          <p className="text-muted-foreground">
            Track deal stage changes and pipeline activity this week.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            Failed to load movements. Please check your backend connection.
          </div>
        )}

        {isLoading ? (
          <MovementsSkeleton />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Forward Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-500 tabular-nums">
                    {formatCurrency(totals.forward)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {categorizedMovements.forward.length} deals moved forward
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Deals Won
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-500 tabular-nums">
                    {formatCurrency(totals.won)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {categorizedMovements.won.length} deals closed-won
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Deals Lost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500 tabular-nums">
                    {formatCurrency(totals.lost)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {categorizedMovements.lost.length} deals closed-lost
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    New Deals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-violet-500 tabular-nums">
                    {formatCurrency(totals.newDeals)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {categorizedMovements.newDeals.length} deals created
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <MovementsList
                title="Stage Progressions"
                movements={categorizedMovements.forward}
                variant="forward"
              />
              <MovementsList
                title="Deals Won"
                movements={categorizedMovements.won}
                variant="won"
              />
              <MovementsList
                title="Deals Lost"
                movements={categorizedMovements.lost}
                variant="lost"
              />
              <MovementsList
                title="New Deals"
                movements={categorizedMovements.newDeals}
                variant="new"
              />
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
