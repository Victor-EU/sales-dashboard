"use client";

import { ChevronLeft, ChevronRight, Calendar, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useWeek } from "@/contexts/week-context";
import { useState } from "react";

function formatWeekLabel(weekId: string, weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

export function WeekSelector() {
  const [open, setOpen] = useState(false);
  const {
    selectedWeekId,
    setSelectedWeekId,
    availableWeeks,
    isLoading,
    hasSnapshotData,
    currentWeekId,
  } = useWeek();

  // Find current selection in available weeks
  const currentIndex = availableWeeks.findIndex(
    (w) => w.weekId === selectedWeekId
  );

  const selectedWeek = availableWeeks.find((w) => w.weekId === selectedWeekId);
  const isCurrentWeek = selectedWeekId === currentWeekId;

  const handlePreviousWeek = () => {
    if (currentIndex < availableWeeks.length - 1) {
      setSelectedWeekId(availableWeeks[currentIndex + 1].weekId);
    }
  };

  const handleNextWeek = () => {
    if (currentIndex > 0) {
      setSelectedWeekId(availableWeeks[currentIndex - 1].weekId);
    }
  };

  const handleSelectWeek = (weekId: string) => {
    setSelectedWeekId(weekId);
    setOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" className="min-w-[200px]" disabled>
          <Calendar className="h-4 w-4 mr-2" />
          Loading...
        </Button>
        <Button variant="ghost" size="icon" disabled>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (availableWeeks.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Database className="h-4 w-4" />
        <span>No snapshots available</span>
      </div>
    );
  }

  const weekLabel = selectedWeek
    ? formatWeekLabel(selectedWeek.weekId, selectedWeek.weekStart, selectedWeek.weekEnd)
    : selectedWeekId || "Select week";

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePreviousWeek}
        disabled={currentIndex >= availableWeeks.length - 1}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous week</span>
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-start gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">{weekLabel}</span>
            {isCurrentWeek && (
              <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                Current
              </span>
            )}
            {!hasSnapshotData && (
              <span className="ml-1 rounded bg-yellow-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                No Data
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-2" align="start">
          <div className="mb-2 px-2">
            <span className="text-sm font-medium">Available Snapshots</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {availableWeeks.map((week) => (
              <button
                key={week.weekId}
                onClick={() => handleSelectWeek(week.weekId)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                  week.weekId === selectedWeekId && "bg-accent font-medium"
                )}
              >
                <div className="flex items-center justify-between">
                  <span>
                    {formatWeekLabel(week.weekId, week.weekStart, week.weekEnd)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {week.weekId}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {week.totalDeals.toLocaleString()} deals · $
                  {(week.totalValue / 1_000_000).toFixed(1)}M
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextWeek}
        disabled={currentIndex <= 0}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next week</span>
      </Button>
    </div>
  );
}
