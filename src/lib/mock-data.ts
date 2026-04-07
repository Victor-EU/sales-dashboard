import type { Deal, DashboardMetrics, StageMetrics, TrendPoint, StageTrendPoint, DealMovement } from "@/types";
import type { StageCategory, HealthStatus } from "@/lib/constants";

/** Generate mock dashboard metrics */
export function getMockDashboardMetrics(): DashboardMetrics {
  const stages: StageMetrics[] = [
    {
      stage: "SAL",
      value: 850000,
      logos: 45,
      arpa: 18889,
      prevValue: 720000,
      prevLogos: 40,
      prevArpa: 18000,
      valueChange: 130000,
      logosChange: 5,
      arpaChange: 889,
      valueChangePct: 18.06,
      dealsEntered: 12,
      dealsExited: 7,
    },
    {
      stage: "SQL",
      value: 620000,
      logos: 32,
      arpa: 19375,
      prevValue: 580000,
      prevLogos: 30,
      prevArpa: 19333,
      valueChange: 40000,
      logosChange: 2,
      arpaChange: 42,
      valueChangePct: 6.9,
      dealsEntered: 7,
      dealsExited: 5,
    },
    {
      stage: "QUOTE_SENT",
      value: 402000,
      logos: 21,
      arpa: 19143,
      prevValue: 380000,
      prevLogos: 20,
      prevArpa: 19000,
      valueChange: 22000,
      logosChange: 1,
      arpaChange: 143,
      valueChangePct: 5.8,
      dealsEntered: 5,
      dealsExited: 4,
    },
    {
      stage: "NEGOTIATION",
      value: 302000,
      logos: 15,
      arpa: 20133,
      prevValue: 290000,
      prevLogos: 14,
      prevArpa: 20714,
      valueChange: 12000,
      logosChange: 1,
      arpaChange: -581,
      valueChangePct: 4.1,
      dealsEntered: 4,
      dealsExited: 3,
    },
    {
      stage: "WON",
      value: 326000,
      logos: 17,
      arpa: 19176,
      prevValue: 244000,
      prevLogos: 12,
      prevArpa: 20333,
      valueChange: 82000,
      logosChange: 5,
      arpaChange: -1157,
      valueChangePct: 33.6,
      dealsEntered: 5,
      dealsExited: 0,
    },
    {
      stage: "LOST",
      value: 180000,
      logos: 8,
      arpa: 22500,
      prevValue: 120000,
      prevLogos: 5,
      prevArpa: 24000,
      valueChange: 60000,
      logosChange: 3,
      arpaChange: -1500,
      valueChangePct: 50,
      dealsEntered: 3,
      dealsExited: 0,
    },
  ];

  const totalValue = stages.slice(0, 4).reduce((sum, s) => sum + s.value, 0);
  const totalLogos = stages.slice(0, 4).reduce((sum, s) => sum + s.logos, 0);
  const prevTotalValue = stages.slice(0, 4).reduce((sum, s) => sum + (s.prevValue || 0), 0);
  const prevTotalLogos = stages.slice(0, 4).reduce((sum, s) => sum + (s.prevLogos || 0), 0);

  return {
    weekId: "2026-W03",
    weekStart: "2026-01-13",
    weekEnd: "2026-01-19",
    totalValue,
    totalLogos,
    arpa: totalValue / totalLogos,
    winRate: 24.3,
    prevTotalValue,
    prevTotalLogos,
    prevArpa: prevTotalValue / prevTotalLogos,
    prevWinRate: 22.1,
    stages,
  };
}

/** Generate mock trend data */
export function getMockTrendData(): TrendPoint[] {
  const baseValue = 1800000;
  const baseLogos = 90;

  return Array.from({ length: 12 }, (_, i) => {
    const weekNum = 12 - i;
    const variance = Math.random() * 0.2 - 0.1;
    const growth = (12 - weekNum) * 0.02;
    const value = Math.round(baseValue * (1 + growth + variance));
    const logos = Math.round(baseLogos * (1 + growth * 0.5 + variance * 0.5));

    return {
      weekId: `2026-W${String(weekNum).padStart(2, "0")}`,
      week: `W${weekNum}`,
      value,
      logos,
      arpa: Math.round(value / logos),
    };
  }).reverse();
}

/** Generate mock stage trend data */
export function getMockStageTrendData(): StageTrendPoint[] {
  return Array.from({ length: 12 }, (_, i) => {
    const weekNum = i + 1;
    const variance = () => 0.8 + Math.random() * 0.4;

    const SAL = Math.round(150000 * variance());
    const SQL = Math.round(400000 * variance());
    const QUOTE_SENT = Math.round(200000 * variance());
    const NEGOTIATION = Math.round(100000 * variance());

    return {
      weekId: `2026-W${String(weekNum).padStart(2, "0")}`,
      week: `W${weekNum}`,
      SAL,
      SQL,
      QUOTE_SENT,
      NEGOTIATION,
      total: SAL + SQL + QUOTE_SENT + NEGOTIATION,
    };
  });
}

/** Generate mock deals */
export function getMockDeals(): Deal[] {
  const owners = ["Sarah Chen", "James Wilson", "Maria Garcia", "Alex Thompson", "Lisa Park"];
  const stages: StageCategory[] = ["SAL", "SQL", "QUOTE_SENT", "NEGOTIATION"];
  const health: HealthStatus[] = ["HEALTHY", "ATTENTION", "CRITICAL"];
  const customers = [
    "Acme Corporation",
    "TechCo Solutions",
    "Global Retail Inc",
    "StartupX",
    "Enterprise Systems",
    "Digital Agency Co",
    "CloudFirst Ltd",
    "DataPro Analytics",
    "SecureNet Inc",
    "GrowthHQ",
  ];

  return Array.from({ length: 50 }, (_, i) => {
    const stage = stages[Math.floor(Math.random() * stages.length)];
    const dealHealth = health[Math.floor(Math.random() * health.length)];
    const value = Math.round((20000 + Math.random() * 180000) / 1000) * 1000;

    return {
      id: `deal-${i + 1}`,
      name: `${customers[i % customers.length]} - ${["Enterprise", "Growth", "Starter", "Pro"][i % 4]} Plan`,
      customerName: customers[i % customers.length],
      value,
      stage,
      stageId: stage.toLowerCase(),
      pipelineId: "default",
      pipelineName: "New Business",
      ownerId: `owner-${(i % 5) + 1}`,
      ownerName: owners[i % 5],
      createdDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      closeDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastModifiedDate: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
      health: dealHealth,
      healthReasons:
        dealHealth === "CRITICAL"
          ? ["Past due close date", "No activity for 14+ days"]
          : dealHealth === "ATTENTION"
          ? ["Approaching close date", "No activity for 7+ days"]
          : undefined,
      daysInStage: Math.floor(Math.random() * 30),
    };
  });
}

/** Generate mock movements */
export function getMockMovements(): DealMovement[] {
  const movements: DealMovement[] = [
    {
      id: "mov-1",
      dealId: "deal-1",
      dealName: "Acme Corp - Enterprise License",
      customerName: "Acme Corporation",
      fromStage: "SAL",
      toStage: "SQL",
      movementType: "FORWARD",
      value: 125000,
      ownerName: "Sarah Chen",
      weekId: "2026-W03",
    },
    {
      id: "mov-2",
      dealId: "deal-2",
      dealName: "TechCo - Growth Package",
      customerName: "TechCo Solutions",
      fromStage: "SAL",
      toStage: "SQL",
      movementType: "FORWARD",
      value: 45000,
      ownerName: "James Wilson",
      weekId: "2026-W03",
    },
    {
      id: "mov-3",
      dealId: "deal-3",
      dealName: "Global Retail - Annual Plan",
      customerName: "Global Retail Inc",
      fromStage: "SQL",
      toStage: "WON",
      movementType: "WON",
      value: 89000,
      ownerName: "Maria Garcia",
      weekId: "2026-W03",
    },
    {
      id: "mov-4",
      dealId: "deal-4",
      dealName: "StartupX - Starter Plan",
      customerName: "StartupX",
      fromStage: null,
      toStage: "SAL",
      movementType: "NEW_DEAL",
      value: 24000,
      ownerName: "Alex Thompson",
      weekId: "2026-W03",
    },
    {
      id: "mov-5",
      dealId: "deal-5",
      dealName: "Enterprise Systems - Pro",
      customerName: "Enterprise Systems",
      fromStage: "SQL",
      toStage: "LOST",
      movementType: "LOST",
      value: 156000,
      ownerName: "Lisa Park",
      weekId: "2026-W03",
    },
  ];

  return movements;
}
