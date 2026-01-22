import type { StageCategory } from "../types/index.js";

/** Map HubSpot stage IDs to dashboard categories */
export const STAGE_CATEGORY_MAP: Record<string, StageCategory> = {
  // ============================================
  // New Business Pipeline (default) - Main Sales Funnel
  // ============================================
  appointmentscheduled: "MQL",      // Deals Created
  qualifiedtobuy: "SAL",            // SAL
  "2101268719": "SQL",              // SQL
  decisionmakerboughtin: "SQL",     // Quote Sent
  contractsent: "SQL",              // Negotiation / Commitment
  closedwon: "WON",                 // Closed Won
  closedlost: "LOST",               // Closed Lost
  "156501691": "LOST",              // Rejected - No Opportunity

  // ============================================
  // Renewal Pipeline (27850444)
  // ============================================
  "85640927": "MQL",                // Renewal Created
  "244610530": "MQL",               // In Communication
  "418418645": "SAL",               // Quote Sent
  "85640929": "SAL",                // At Risk
  "4097209550": "SAL",              // Auto renewal (in progress)
  "85640930": "SQL",                // Negotiation
  "1309001921": "SQL",              // PO on hold
  "1634227405": "SQL",              // Verbal Agreement
  "85640931": "WON",                // Won (Contract renewed)
  "85640933": "LOST",               // Lost (Contract lost)
  "3817869502": "LOST",             // Invoice Cancelled
  "4131171576": "WON",              // Auto renewal (create invoice)

  // ============================================
  // Expansion Pipeline (38293447)
  // ============================================
  "1281613041": "MQL",              // Deal Created
  "108679918": "MQL",               // Customer Contacted
  "108679919": "SAL",               // Expansion Meeting
  "108679920": "SAL",               // Quote sent
  "108679921": "SQL",               // Negotiation
  "108679922": "WON",               // Customer Won (Expanded)
  "108679924": "LOST",              // Closed lost

  // ============================================
  // Partnership Deals Pipeline (1280996578)
  // ============================================
  "1750222043": "MQL",              // Deal registration
  "1750222044": "SQL",              // SQL
  "1750222045": "LOST",             // Rejected
  "1750222046": "SQL",              // Quote Sent
  "1750222048": "WON",              // Closed Won
  "1750222049": "LOST",             // Closed Lost

  // ============================================
  // Partnership Acquisition Funnel (2568451319)
  // ============================================
  "3527480509": "MQL",              // Demo Scheduled
  "3527480510": "SAL",              // Demo Completed
  "3527480512": "SAL",              // Product Testing / Trial
  "3527480513": "SQL",              // Negotiation
  "3527480514": "WON",              // Contract Signed
  "3527471313": "WON",              // Active Partner
  "3527480515": "LOST",             // Lost

  // ============================================
  // Invoices - Multi Year deals (1587132605)
  // ============================================
  "2189386983": "MQL",              // Invoice to create
  "2189386988": "SAL",              // Invoice sent
  "3056367814": "WON",              // Invoice paid

  // ============================================
  // Self-serve Pipeline (712118459)
  // ============================================
  "1034181874": "MQL",              // Deal Created
  "1034181879": "WON",              // Closed Won
  "1034181880": "LOST",             // Closed Lost
  "1634227403": "LOST",             // Rejected - No Opportunity
};

/** Stage display names */
export const STAGE_NAMES: Record<string, string> = {
  // New Business
  appointmentscheduled: "Deals Created",
  qualifiedtobuy: "SAL",
  "2101268719": "SQL",
  decisionmakerboughtin: "Quote Sent",
  contractsent: "Negotiation",
  closedwon: "Closed Won",
  closedlost: "Closed Lost",
  "156501691": "Rejected",

  // Renewal
  "85640927": "Renewal Created",
  "244610530": "In Communication",
  "418418645": "Quote Sent",
  "85640929": "At Risk",
  "4097209550": "Auto Renewal (In Progress)",
  "85640930": "Negotiation",
  "1309001921": "PO on Hold",
  "1634227405": "Verbal Agreement",
  "85640931": "Won (Renewed)",
  "85640933": "Lost (Churned)",
  "3817869502": "Invoice Cancelled",
  "4131171576": "Auto Renewal (Invoice)",

  // Expansion
  "1281613041": "Deal Created",
  "108679918": "Customer Contacted",
  "108679919": "Expansion Meeting",
  "108679920": "Quote Sent",
  "108679921": "Negotiation",
  "108679922": "Customer Won",
  "108679924": "Closed Lost",

  // Self-serve
  "1034181874": "Deal Created",
  "1034181879": "Closed Won",
  "1034181880": "Closed Lost",
  "1634227403": "Rejected",
};

/** Category display configuration */
export const CATEGORY_CONFIG: Record<
  StageCategory,
  { label: string; order: number }
> = {
  MQL: { label: "MQL (Deals Created)", order: 1 },
  SAL: { label: "SAL", order: 2 },
  SQL: { label: "SQL", order: 3 },
  WON: { label: "Closed Won", order: 4 },
  LOST: { label: "Closed Lost", order: 5 },
};

/** Funnel stages in order (excludes WON/LOST for active pipeline) */
export const FUNNEL_STAGES: StageCategory[] = ["MQL", "SAL", "SQL"];

/** All stage categories in order */
export const ALL_STAGES: StageCategory[] = ["MQL", "SAL", "SQL", "WON", "LOST"];

/** Stage progression order for movement detection */
export const STAGE_ORDER: Record<StageCategory, number> = {
  MQL: 1,
  SAL: 2,
  SQL: 3,
  WON: 4,
  LOST: 5,
};

/** Health thresholds */
export const HEALTH_THRESHOLDS = {
  /** Days without activity before ATTENTION */
  attentionDaysNoActivity: 7,
  /** Days without activity before CRITICAL */
  criticalDaysNoActivity: 14,
  /** Days past close date before ATTENTION */
  attentionDaysPastDue: 0,
  /** Days past close date before CRITICAL */
  criticalDaysPastDue: 7,
  /** Days in stage before ATTENTION (per stage) */
  attentionDaysInStage: {
    MQL: 14,
    SAL: 21,
    SQL: 30,
  } as Record<string, number>,
  /** Days in stage before CRITICAL (per stage) */
  criticalDaysInStage: {
    MQL: 30,
    SAL: 45,
    SQL: 60,
  } as Record<string, number>,
};

/** Deal properties to fetch from HubSpot */
export const DEAL_PROPERTIES = [
  "dealname",
  "amount",
  "arr___usd_",
  "arr",
  "deal_currency_code",
  "dealstage",
  "pipeline",
  "hubspot_owner_id",
  "closedate",
  "createdate",
  "hs_lastmodifieddate",
  "end_customer_name_synch",
  "license_subscription_start", // Contract start date (first day of subscription)
  "hs_date_entered_appointmentscheduled",
  "hs_date_entered_qualifiedtobuy",
  "hs_date_entered_2101268719",
  "hs_date_entered_decisionmakerboughtin",
  "hs_date_entered_contractsent",
  "hs_date_entered_85640927",
  "hs_date_entered_244610530",
  "hs_date_entered_418418645",
  "hs_date_entered_85640929",
  "hs_date_entered_85640930",
];

/** Default pipeline for filtering (New Business) */
export const DEFAULT_PIPELINE = "default";

/** All pipelines to include in dashboard */
export const ACTIVE_PIPELINES = [
  "default",      // New Business
  "27850444",     // Renewal
  "38293447",     // Expansion
];

/**
 * Sales pipelines for scoped metrics (New Business + Partnership Deals)
 * These are the pipelines that represent "new sales" pipeline value
 * - New Business: Direct sales pipeline
 * - Partnership Deals: Deals coming through partner channel
 */
export const SALES_PIPELINES = ["New Business", "Partnership Deals"];
