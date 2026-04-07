const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** API response types */
export interface ApiSnapshot {
  weekId: string;
  weekNumber: number;
  year: number;
  weekStart: string;
  weekEnd: string;
  snapshotTakenAt: string;
  status: string;
  totalDeals: number;
  totalValue: number;
}

export interface ApiDashboardMetrics {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  totalValue: number;
  totalLogos: number;
  arpa: number;
  winRate: number;
  prevTotalValue: number | null;
  prevTotalLogos: number | null;
  prevArpa: number | null;
  prevWinRate: number | null;
  stages: ApiStageMetrics[];
}

export interface ApiStageMetrics {
  stage: string;
  value: number;
  logos: number;
  arpa: number;
  prevValue: number | null;
  prevLogos: number | null;
  prevArpa: number | null;
  valueChange: number | null;
  logosChange: number | null;
  arpaChange: number | null;
  valueChangePct: number | null;
  dealsEntered: number;
  dealsExited: number;
}

export interface ApiDeal {
  id: string;
  name: string;
  customerName: string | null;
  value: number;
  stage: string;
  stageId: string;
  pipelineId: string;
  pipelineName: string;
  ownerId: string | null;
  ownerName: string | null;
  createdDate: string;
  closeDate: string | null;
  lastModifiedDate: string;
  health: string;
  healthReasons: string[];
  daysInStage: number;
}

export interface ApiTrendPoint {
  weekId: string;
  week: string;
  value: number;
  logos: number;
  arpa: number;
}

export interface ApiStageTrendPoint {
  weekId: string;
  week: string;
  SAL: number;
  SQL: number;
  QUOTE_SENT: number;
  NEGOTIATION: number;
  total: number;
}

export interface ApiMovement {
  id: string;
  dealId: string;
  dealName: string;
  customerName: string | null;
  fromStage: string | null;
  toStage: string;
  movementType: string;
  value: number;
  ownerName: string | null;
  weekId: string;
}

export interface ApiMovementsResponse {
  weekId: string;
  movements: {
    forward: ApiMovement[];
    won: ApiMovement[];
    lost: ApiMovement[];
    newDeals: ApiMovement[];
    backward: ApiMovement[];
    resurrected: ApiMovement[];
  };
  totals: {
    forward: number;
    won: number;
    lost: number;
    newDeals: number;
  };
  counts: {
    forward: number;
    won: number;
    lost: number;
    newDeals: number;
    total: number;
  };
}

export interface ApiScopedMetrics {
  weekId: string;
  period: string;
  pipelineName: string;
  periodStart: string;
  periodEnd: string;
  pipeline: {
    totalValue: number;
    totalLogos: number;
    arpa: number;
    stages: ApiStageMetrics[];
  };
  arr: {
    value: number;
    logos: number;
    arpa: number;
  };
  winRate: {
    rate: number;
    wonValue: number;
    wonLogos: number;
    lostValue: number;
    lostLogos: number;
  };
}

export interface ApiScopedDeal {
  id: string;
  name: string;
  customerName: string | null;
  value: number;
  stage: string;
  pipeline: string;
  owner: string | null;
  createdDate: string | null;
  closeDate: string | null;
  contractStartDate: string | null;
}

/** Fetch wrapper with error handling */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

/** API functions */
export const api = {
  /** Get list of available snapshots */
  async getSnapshots(): Promise<{ snapshots: ApiSnapshot[] }> {
    return fetchApi("/api/snapshots");
  },

  /** Get current week info */
  async getCurrentWeek(): Promise<{ weekId: string; exists: boolean; currentWeek?: string }> {
    return fetchApi("/api/snapshots/current");
  },

  /** Get dashboard metrics for a week */
  async getMetrics(weekId: string): Promise<ApiDashboardMetrics> {
    return fetchApi(`/api/snapshots/${weekId}`);
  },

  /** Get deals */
  async getDeals(weekId?: string): Promise<{ deals: ApiDeal[]; total: number }> {
    const query = weekId ? `?weekId=${weekId}` : "";
    return fetchApi(`/api/deals${query}`);
  },

  /** Get trend data */
  async getTrends(weeks = 12): Promise<{ trends: ApiTrendPoint[] }> {
    return fetchApi(`/api/trends?weeks=${weeks}`);
  },

  /** Get trend data broken down by stage */
  async getTrendsByStage(weeks = 12): Promise<{ trends: ApiStageTrendPoint[] }> {
    return fetchApi(`/api/trends/by-stage?weeks=${weeks}`);
  },

  /** Get movements for a week */
  async getMovements(weekId?: string): Promise<ApiMovementsResponse> {
    const query = weekId ? `?weekId=${weekId}` : "";
    return fetchApi(`/api/movements${query}`);
  },

  /** Trigger a manual snapshot */
  async triggerSnapshot(): Promise<{ success: boolean; snapshotRunId: number }> {
    return fetchApi("/api/snapshots/trigger", { method: "POST" });
  },

  /** Health check */
  async healthCheck(): Promise<{ status: string; database: string }> {
    return fetchApi("/health");
  },

  /** Get scoped metrics for a week and period */
  async getScopedMetrics(weekId: string, period: string): Promise<ApiScopedMetrics> {
    return fetchApi(`/api/scoped-metrics/${weekId}?period=${encodeURIComponent(period)}`);
  },

  /** Get scoped deals */
  async getScopedDeals(
    weekId: string,
    period: string,
    scope: "pipeline" | "arr" | "winrate" = "pipeline",
    stage?: string
  ): Promise<{ deals: ApiScopedDeal[]; totalCount: number }> {
    let query = `?period=${encodeURIComponent(period)}&scope=${scope}`;
    if (stage) query += `&stage=${stage}`;
    return fetchApi(`/api/scoped-metrics/${weekId}/deals${query}`);
  },
};

export default api;
