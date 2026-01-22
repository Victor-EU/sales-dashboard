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
}

const WeekContext = createContext<WeekContextValue | undefined>(undefined);

export function WeekProvider({ children }: { children: ReactNode }) {
  const { data: snapshots, isLoading: snapshotsLoading } = useSnapshots();
  const { data: currentWeekData, isLoading: currentWeekLoading } = useCurrentWeek();

  const [selectedWeekId, setSelectedWeekIdState] = useState<string | undefined>(undefined);

  // Use the most recent snapshot week as default, falling back to current week
  const effectiveWeekId = selectedWeekId || currentWeekData?.weekId;

  const setSelectedWeekId = useCallback((weekId: string) => {
    setSelectedWeekIdState(weekId);
  }, []);

  // Check if selected week has snapshot data
  const hasSnapshotData = snapshots?.some(
    (s) => s.weekId === effectiveWeekId
  ) ?? false;

  const value: WeekContextValue = {
    selectedWeekId: effectiveWeekId,
    setSelectedWeekId,
    availableWeeks: snapshots ?? [],
    isLoading: snapshotsLoading || currentWeekLoading,
    hasSnapshotData,
    currentWeekId: currentWeekData?.currentWeek || currentWeekData?.weekId,
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
