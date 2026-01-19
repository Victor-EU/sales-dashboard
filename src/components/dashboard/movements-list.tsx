"use client";

import { ArrowRight, Trophy, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DealMovement } from "@/types";
import { formatCurrency } from "@/lib/format";
import { STAGE_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface MovementsListProps {
  title: string;
  movements: DealMovement[];
  variant: "forward" | "won" | "lost" | "new";
}

export function MovementsList({ title, movements, variant }: MovementsListProps) {
  const icons = {
    forward: ArrowRight,
    won: Trophy,
    lost: ArrowRight,
    new: Plus,
  };

  const colors = {
    forward: "text-blue-500",
    won: "text-emerald-500",
    lost: "text-red-500",
    new: "text-violet-500",
  };

  const Icon = icons[variant];

  if (movements.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className={cn("h-4 w-4", colors[variant])} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No movements this week</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={cn("h-4 w-4", colors[variant])} />
          {title}
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {movements.length} deals
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {movements.map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{movement.dealName}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {movement.fromStage && (
                    <>
                      <span>{STAGE_CONFIG[movement.fromStage]?.label}</span>
                      <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                  <span className="font-medium text-foreground">
                    {STAGE_CONFIG[movement.toStage]?.label}
                  </span>
                  <span>•</span>
                  <span>{movement.ownerName}</span>
                </div>
              </div>
              <div className="ml-4 text-right">
                <p className="font-semibold tabular-nums">
                  {formatCurrency(movement.value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
