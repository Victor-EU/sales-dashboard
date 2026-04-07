"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  ApiSnapshot,
  ApiDashboardMetrics,
  ApiDeal,
  ApiTrendPoint,
  ApiMovementsResponse,
  ApiScopedMetrics,
  ApiScopedDeal,
} from "@/lib/api";

/** Query keys */
export const queryKeys = {
  snapshots: ["snapshots"] as const,
  currentWeek: ["currentWeek"] as const,
  metrics: (weekId: string) => ["metrics", weekId] as const,
  deals: (weekId?: string) => ["deals", weekId] as const,
  trends: (weeks: number) => ["trends", weeks] as const,
  trendsByStage: (weeks: number) => ["trendsByStage", weeks] as const,
  movements: (weekId?: string) => ["movements", weekId] as const,
  health: ["health"] as const,
  scopedMetrics: (weekId: string, period: string) =>
    ["scopedMetrics", weekId, period] as const,
  scopedDeals: (weekId: string, period: string, scope: string, stage?: string) =>
    ["scopedDeals", weekId, period, scope, stage] as const,
};

/** Hook to get available snapshots */
export function useSnapshots() {
  return useQuery({
    queryKey: queryKeys.snapshots,
    queryFn: async () => {
      const { snapshots } = await api.getSnapshots();
      return snapshots;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/** Hook to get current week info */
export function useCurrentWeek() {
  return useQuery({
    queryKey: queryKeys.currentWeek,
    queryFn: () => api.getCurrentWeek(),
    staleTime: 60 * 1000, // 1 minute
  });
}

/** Hook to get dashboard metrics */
export function useMetrics(weekId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.metrics(weekId || ""),
    queryFn: () => api.getMetrics(weekId!),
    enabled: !!weekId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Hook to get deals */
export function useDeals(weekId?: string) {
  return useQuery({
    queryKey: queryKeys.deals(weekId),
    queryFn: async () => {
      const { deals } = await api.getDeals(weekId);
      return deals;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/** Hook to get trends */
export function useTrends(weeks = 12) {
  return useQuery({
    queryKey: queryKeys.trends(weeks),
    queryFn: async () => {
      const { trends } = await api.getTrends(weeks);
      return trends;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Hook to get trends broken down by stage */
export function useTrendsByStage(weeks = 12) {
  return useQuery({
    queryKey: queryKeys.trendsByStage(weeks),
    queryFn: async () => {
      const { trends } = await api.getTrendsByStage(weeks);
      return trends;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Hook to get movements */
export function useMovements(weekId?: string) {
  return useQuery({
    queryKey: queryKeys.movements(weekId),
    queryFn: () => api.getMovements(weekId),
    staleTime: 5 * 60 * 1000,
  });
}

/** Hook to trigger a snapshot */
export function useTriggerSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.triggerSnapshot(),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.snapshots });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentWeek });
    },
  });
}

/** Hook for health check */
export function useHealthCheck() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => api.healthCheck(),
    staleTime: 30 * 1000, // 30 seconds
    retry: false,
  });
}

/** Hook to get scoped metrics */
export function useScopedMetrics(weekId: string | undefined, period: string | undefined) {
  return useQuery({
    queryKey: queryKeys.scopedMetrics(weekId || "", period || ""),
    queryFn: () => api.getScopedMetrics(weekId!, period!),
    enabled: !!weekId && !!period,
    staleTime: 5 * 60 * 1000,
  });
}

/** Hook to get scoped deals */
export function useScopedDeals(
  weekId: string | undefined,
  period: string | undefined,
  scope: "pipeline" | "arr" | "winrate" = "pipeline",
  stage?: string
) {
  return useQuery({
    queryKey: queryKeys.scopedDeals(weekId || "", period || "", scope, stage),
    queryFn: async () => {
      const { deals } = await api.getScopedDeals(weekId!, period!, scope, stage);
      return deals;
    },
    enabled: !!weekId && !!period,
    staleTime: 2 * 60 * 1000,
  });
}
