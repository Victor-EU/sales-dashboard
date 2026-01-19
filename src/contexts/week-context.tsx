"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useSnapshots, useCurrentWeek } from "@/hooks/use-api";
import type { ApiSnapshot } from "@/lib/api";

/** Available period options */
export type PeriodOption = {
  value: string;
  label: string;
  type: "year" | "quarter" | "all";
};

/** Generate period options for the selector */
function generatePeriodOptions(): PeriodOption[] {
  const currentYear = new Date().getFullYear();
  const options: PeriodOption[] = [];

  // Add "All Time" option
  options.push({ value: "all", label: "All Time", type: "all" });

  // Add years (current year and 2 previous years)
  for (let year = currentYear; year >= currentYear - 2; year--) {
    options.push({ value: String(year), label: String(year), type: "year" });
  }

  // Add quarters for current year
  for (let q = 4; q >= 1; q--) {
    options.push({
      value: `${currentYear}-Q${q}`,
      label: `Q${q} ${currentYear}`,
      type: "quarter",
    });
  }

  return options;
}

interface WeekContextValue {
  /** Currently selected week ID (e.g., "2026-W03") */
  selectedWeekId: string | undefined;
  /** Set the selected week */
  setSelectedWeekId: (weekId: string) => void;
  /** Available snapshots from the database */
  availableWeeks: ApiSnapshot[];
  /** Whether snapshots are loading */
  isLoading: boolean;
  /** Whether the selected week has snapshot data */
  hasSnapshotData: boolean;
  /** The current calendar week ID */
  currentWeekId: string | undefined;
  /** Selected period for scoped metrics (e.g., "2025", "2025-Q1") */
  selectedPeriod: string | undefined;
  /** Set the selected period */
  setSelectedPeriod: (period: string) => void;
  /** Available period options */
  periodOptions: PeriodOption[];
  /** Whether scoped metrics mode is enabled (period is not "all") */
  isScopedMode: boolean;
}

const WeekContext = createContext<WeekContextValue | undefined>(undefined);

export function WeekProvider({ children }: { children: ReactNode }) {
  const { data: snapshots, isLoading: snapshotsLoading } = useSnapshots();
  const { data: currentWeekData, isLoading: currentWeekLoading } = useCurrentWeek();

  const [selectedWeekId, setSelectedWeekIdState] = useState<string | undefined>(undefined);
  const [selectedPeriod, setSelectedPeriodState] = useState<string>("all");

  // Use the most recent snapshot week as default, falling back to current week
  const effectiveWeekId = selectedWeekId || currentWeekData?.weekId;

  const setSelectedWeekId = useCallback((weekId: string) => {
    setSelectedWeekIdState(weekId);
  }, []);

  const setSelectedPeriod = useCallback((period: string) => {
    setSelectedPeriodState(period);
  }, []);

  // Check if selected week has snapshot data
  const hasSnapshotData = snapshots?.some(
    (s) => s.weekId === effectiveWeekId
  ) ?? false;

  const periodOptions = generatePeriodOptions();

  const value: WeekContextValue = {
    selectedWeekId: effectiveWeekId,
    setSelectedWeekId,
    availableWeeks: snapshots ?? [],
    isLoading: snapshotsLoading || currentWeekLoading,
    hasSnapshotData,
    currentWeekId: currentWeekData?.currentWeek || currentWeekData?.weekId,
    selectedPeriod,
    setSelectedPeriod,
    periodOptions,
    isScopedMode: selectedPeriod !== "all",
  };

  return <WeekContext.Provider value={value}>{children}</WeekContext.Provider>;
}

export function useWeek() {
  const context = useContext(WeekContext);
  if (!context) {
    throw new Error("useWeek must be used within a WeekProvider");
  }
  return context;
}
