import type { StageCategory, HealthStatus } from "@/lib/constants";

/** Deal from HubSpot */
export interface Deal {
  id: string;
  name: string;
  customerName?: string;
  value: number;
  stage: StageCategory;
  stageId: string;
  pipelineId: string;
  pipelineName: string;
  ownerId?: string | null;
  ownerName?: string | null;
  createdDate: string;
  closeDate?: string | null;
  lastModifiedDate: string;
  health: HealthStatus;
  healthReasons?: string[];
  daysInStage: number;
}

/** Stage metrics for a single week */
export interface StageMetrics {
  stage: StageCategory;
  value: number;
  logos: number;
  arpa: number;
  prevValue?: number;
  prevLogos?: number;
  prevArpa?: number;
  valueChange?: number;
  logosChange?: number;
  arpaChange?: number;
  valueChangePct?: number;
  dealsEntered?: number;
  dealsExited?: number;
}

/** Dashboard summary metrics */
export interface DashboardMetrics {
  weekId: string;
  weekStart: string;
  weekEnd: string;
  totalValue: number;
  totalLogos: number;
  arpa: number;
  winRate: number;
  prevTotalValue?: number;
  prevTotalLogos?: number;
  prevArpa?: number;
  prevWinRate?: number;
  stages: StageMetrics[];
}

/** Trend data point */
export interface TrendPoint {
  weekId: string;
  week: string;
  value: number;
  logos: number;
  arpa: number;
}

/** Deal movement record */
export interface DealMovement {
  id: string;
  dealId: string;
  dealName: string;
  customerName?: string;
  fromStage: StageCategory | null;
  toStage: StageCategory;
  movementType: "NEW_DEAL" | "FORWARD" | "SKIP_FORWARD" | "BACKWARD" | "WON" | "LOST" | "RESURRECTED";
  value: number;
  ownerName?: string | null;
  weekId: string;
}

/** Filter options for deals */
export interface DealFilters {
  search?: string;
  pipeline?: string;
  stage?: StageCategory[];
  owner?: string[];
  health?: HealthStatus[];
  minValue?: number;
  maxValue?: number;
  closingWithinDays?: number;
}

/** Sort configuration */
export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

/** API response wrapper */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

/** Week selector option */
export interface WeekOption {
  weekId: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isEstimated?: boolean;
}
