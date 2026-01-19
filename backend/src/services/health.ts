import type { HealthStatus, StageCategory } from "../types/index.js";
import { HEALTH_THRESHOLDS, FUNNEL_STAGES } from "./constants.js";

interface HealthInput {
  stageCategory: StageCategory;
  daysInStage: number;
  closeDate: Date | null;
  lastModifiedDate: Date;
}

interface HealthResult {
  status: HealthStatus;
  reasons: string[];
}

/** Calculate deal health based on multiple factors */
export function calculateDealHealth(input: HealthInput): HealthResult {
  const reasons: string[] = [];
  let isCritical = false;
  let isAttention = false;

  const now = new Date();

  // Skip health calculation for WON/LOST deals
  if (!FUNNEL_STAGES.includes(input.stageCategory)) {
    return { status: "HEALTHY", reasons: [] };
  }

  // Check 1: Days without activity
  const daysSinceModified = Math.floor(
    (now.getTime() - input.lastModifiedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceModified >= HEALTH_THRESHOLDS.criticalDaysNoActivity) {
    isCritical = true;
    reasons.push(`No activity for ${daysSinceModified} days`);
  } else if (daysSinceModified >= HEALTH_THRESHOLDS.attentionDaysNoActivity) {
    isAttention = true;
    reasons.push(`No activity for ${daysSinceModified} days`);
  }

  // Check 2: Past close date
  if (input.closeDate) {
    const daysUntilClose = Math.floor(
      (input.closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilClose < -HEALTH_THRESHOLDS.criticalDaysPastDue) {
      isCritical = true;
      reasons.push(`Past due close date by ${Math.abs(daysUntilClose)} days`);
    } else if (daysUntilClose < -HEALTH_THRESHOLDS.attentionDaysPastDue) {
      isAttention = true;
      reasons.push(`Past due close date`);
    } else if (daysUntilClose <= 7 && daysUntilClose >= 0) {
      isAttention = true;
      reasons.push(`Close date in ${daysUntilClose} days`);
    }
  }

  // Check 3: Days in stage
  const criticalDays =
    HEALTH_THRESHOLDS.criticalDaysInStage[input.stageCategory];
  const attentionDays =
    HEALTH_THRESHOLDS.attentionDaysInStage[input.stageCategory];

  if (criticalDays && input.daysInStage >= criticalDays) {
    isCritical = true;
    reasons.push(`${input.daysInStage} days in ${input.stageCategory} stage`);
  } else if (attentionDays && input.daysInStage >= attentionDays) {
    isAttention = true;
    reasons.push(`${input.daysInStage} days in ${input.stageCategory} stage`);
  }

  // Determine final status
  let status: HealthStatus = "HEALTHY";
  if (isCritical) {
    status = "CRITICAL";
  } else if (isAttention) {
    status = "ATTENTION";
  }

  return { status, reasons };
}

/** Calculate days in stage from stage entry date */
export function calculateDaysInStage(
  stageEnteredDate: Date | null,
  createdDate: Date
): number {
  const now = new Date();
  const referenceDate = stageEnteredDate || createdDate;
  return Math.floor(
    (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/** Get stage entry date from HubSpot properties */
export function getStageEnteredDate(
  stageId: string,
  properties: Record<string, string | null | undefined>
): Date | null {
  const propertyName = `hs_date_entered_${stageId}`;
  const dateStr = properties[propertyName];

  if (dateStr) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}
