/** Stage categories for the sales funnel */
export type StageCategory = "MQL" | "SAL" | "SQL" | "QUOTE_SENT" | "NEGOTIATION" | "WON" | "LOST";

/** Health status for deals */
export type HealthStatus = "HEALTHY" | "ATTENTION" | "CRITICAL";

/** Movement types for deal stage changes */
export type MovementType =
  | "NEW_DEAL"
  | "FORWARD"
  | "SKIP_FORWARD"
  | "BACKWARD"
  | "WON"
  | "LOST"
  | "RESURRECTED";

/** HubSpot deal properties we fetch */
export interface HubSpotDealProperties {
  dealname: string;
  amount: string | null;
  arr___usd_: string | null;
  arr: string | null;
  deal_currency_code: string | null;
  dealstage: string;
  pipeline: string;
  hubspot_owner_id: string | null;
  closedate: string | null;
  createdate: string;
  hs_lastmodifieddate: string;
  end_customer_name_synch: string | null;
  license_subscription_start: string | null; // Contract start date
  hs_date_entered_appointmentscheduled?: string;
  hs_date_entered_qualifiedtobuy?: string;
  hs_date_entered_2101268719?: string;
}

/** Normalized deal from HubSpot */
export interface HubSpotDeal {
  id: string;
  properties: HubSpotDealProperties;
}

/** Internal deal representation */
export interface Deal {
  id: string;
  name: string;
  customerName: string | null;
  value: number;
  arrLocal: number | null;
  currency: string | null;
  stageId: string;
  stageName: string;
  stageCategory: StageCategory;
  pipelineId: string;
  pipelineName: string;
  ownerId: string | null;
  ownerName: string | null;
  createdDate: Date;
  closeDate: Date | null;
  contractStartDate: Date | null;
  lastModifiedDate: Date;
  daysInStage: number;
  stageEnteredDate: Date | null;
  health: HealthStatus;
  healthReasons: string[];
}

/** Snapshot run metadata */
export interface SnapshotRun {
  id: number;
  weekId: string;
  weekNumber: number;
  year: number;
  weekStartDate: Date;
  weekEndDate: Date;
  snapshotDate: Date;
  snapshotTakenAt: Date;
  durationSeconds: number | null;
  status: "completed" | "failed" | "partial";
  totalDeals: number | null;
  totalValue: number | null;
  dealsMoved: number | null;
  errorMessage: string | null;
  retryCount: number;
}

/** Weekly stage snapshot */
export interface WeeklyStageSnapshot {
  id: number;
  snapshotRunId: number;
  weekId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  weekNumber: number;
  year: number;
  pipelineId: string;
  pipelineName: string | null;
  stageId: string;
  stageName: string | null;
  stageCategory: StageCategory;
  totalValue: number;
  logoCount: number;
  arpa: number | null;
  prevWeekValue: number | null;
  prevWeekLogos: number | null;
  prevWeekArpa: number | null;
  valueChange: number | null;
  logoChange: number | null;
  arpaChange: number | null;
  valueChangePct: number | null;
  dealsEntered: number;
  dealsExited: number;
  valueEntered: number;
  valueExited: number;
  avgDaysInStage: number | null;
  snapshotTakenAt: Date;
}

/** Deal weekly snapshot */
export interface DealWeeklySnapshot {
  id: number;
  snapshotRunId: number;
  weekId: string;
  weekStartDate: Date;
  dealId: string;
  dealName: string | null;
  endCustomerName: string | null;
  pipelineId: string | null;
  pipelineName: string | null;
  stageId: string | null;
  stageName: string | null;
  stageCategory: StageCategory | null;
  amount: number | null;
  arrUsd: number | null;
  arrLocal: number | null;
  currency: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdDate: Date | null;
  closeDate: Date | null;
  contractStartDate: Date | null;
  lastModifiedDate: Date | null;
  daysInCurrentStage: number | null;
  stageEnteredDate: Date | null;
  prevWeekStageId: string | null;
  prevWeekValue: number | null;
  stageChanged: boolean;
  valueChanged: number | null;
  createdWeek: string | null;
  weeksSinceCreated: number | null;
}

/** Deal stage movement */
export interface DealMovement {
  id: number;
  snapshotRunId: number;
  weekId: string;
  dealId: string;
  dealName: string | null;
  endCustomerName: string | null;
  fromStageId: string | null;
  fromStageName: string | null;
  fromStageCategory: StageCategory | null;
  toStageId: string;
  toStageName: string | null;
  toStageCategory: StageCategory;
  movementType: MovementType;
  isForward: boolean | null;
  stagesSkipped: number;
  dealValue: number | null;
  valueChange: number | null;
  ownerId: string | null;
  ownerName: string | null;
  daysInPrevStage: number | null;
  dealAgeWeeks: number | null;
  createdAt: Date;
}

/** HubSpot owner */
export interface HubSpotOwner {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/** HubSpot pipeline */
export interface HubSpotPipeline {
  id: string;
  label: string;
  stages: HubSpotStage[];
}

/** HubSpot pipeline stage */
export interface HubSpotStage {
  id: string;
  label: string;
  displayOrder: number;
}

/** Dashboard metrics response */
export interface DashboardMetrics {
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
  stages: StageMetrics[];
}

/** Stage metrics for dashboard */
export interface StageMetrics {
  stage: StageCategory;
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

/** Trend data point */
export interface TrendPoint {
  weekId: string;
  week: string;
  value: number;
  logos: number;
  arpa: number;
}

/** API movement response */
export interface MovementResponse {
  id: string;
  dealId: string;
  dealName: string;
  customerName: string | null;
  fromStage: StageCategory | null;
  toStage: StageCategory;
  movementType: MovementType;
  value: number;
  ownerName: string | null;
  weekId: string;
}

/** Week info */
export interface WeekInfo {
  weekId: string;
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
}
