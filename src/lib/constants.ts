/** Stage category types */
export type StageCategory = "SAL" | "SQL" | "QUOTE_SENT" | "NEGOTIATION" | "WON" | "LOST";
export type HealthStatus = "CRITICAL" | "ATTENTION" | "HEALTHY";

/** HubSpot stage ID to dashboard category mapping */
export const STAGE_CATEGORY_MAP: Record<string, StageCategory> = {
  // New Business Pipeline
  appointmentscheduled: "SAL",
  qualifiedtobuy: "SAL",
  "2101268719": "SQL",
  decisionmakerboughtin: "QUOTE_SENT",
  contractsent: "NEGOTIATION",
  closedwon: "WON",
  closedlost: "LOST",
  "156501691": "LOST",
};

/** Stage order for progression calculation */
export const STAGE_ORDER: Record<string, number> = {
  appointmentscheduled: 1,
  qualifiedtobuy: 2,
  "2101268719": 3,
  decisionmakerboughtin: 4,
  contractsent: 5,
  closedwon: 6,
  closedlost: 0,
  "156501691": 0,
};

/** Stage display configuration */
export const STAGE_CONFIG: Record<StageCategory, { label: string; color: string; bgColor: string }> = {
  SAL: {
    label: "SAL",
    color: "hsl(var(--stage-sal))",
    bgColor: "hsl(var(--stage-sal) / 0.1)",
  },
  SQL: {
    label: "SQL",
    color: "hsl(var(--stage-sql))",
    bgColor: "hsl(var(--stage-sql) / 0.1)",
  },
  QUOTE_SENT: {
    label: "Quote Sent",
    color: "hsl(var(--stage-quote-sent))",
    bgColor: "hsl(var(--stage-quote-sent) / 0.1)",
  },
  NEGOTIATION: {
    label: "Negotiation",
    color: "hsl(var(--stage-negotiation))",
    bgColor: "hsl(var(--stage-negotiation) / 0.1)",
  },
  WON: {
    label: "Won",
    color: "hsl(var(--stage-won))",
    bgColor: "hsl(var(--stage-won) / 0.1)",
  },
  LOST: {
    label: "Lost",
    color: "hsl(var(--stage-lost))",
    bgColor: "hsl(var(--stage-lost) / 0.1)",
  },
};

/** Health status configuration */
export const HEALTH_CONFIG: Record<HealthStatus, { label: string; icon: string; className: string }> = {
  CRITICAL: {
    label: "Critical",
    icon: "●",
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
  ATTENTION: {
    label: "Attention",
    icon: "◐",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
  HEALTHY: {
    label: "Healthy",
    icon: "○",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  },
};

/** Funnel stages in order */
export const FUNNEL_STAGES: StageCategory[] = ["SAL", "SQL", "QUOTE_SENT", "NEGOTIATION", "WON", "LOST"];

/** Navigation items */
export const NAV_ITEMS = [
  { href: "/", label: "Summary", icon: "LayoutDashboard" },
  { href: "/pipeline", label: "Pipeline", icon: "GitBranch" },
  { href: "/deals", label: "Deals", icon: "Briefcase" },
  { href: "/trends", label: "Trends", icon: "TrendingUp" },
  { href: "/movements", label: "Movements", icon: "ArrowRightLeft" },
] as const;
