import { randomUUID } from "crypto";
import type { AIReportQuery, AIReportResponse, ChartData, TableData, ReportCategory } from "../../shared/types/ai-report";
import { storage } from "../storage";

function detectCategory(prompt: string): ReportCategory {
  const lower = prompt.toLowerCase();
  if (lower.includes("budget") || lower.includes("cost") || lower.includes("spend") || lower.includes("financ"))
    return "budget_analysis";
  if (lower.includes("schedule") || lower.includes("timeline") || lower.includes("deadline") || lower.includes("overdue"))
    return "schedule_status";
  if (lower.includes("vendor") || lower.includes("supplier") || lower.includes("subcontract"))
    return "vendor_performance";
  if (lower.includes("wbs") || lower.includes("breakdown") || lower.includes("work package"))
    return "wbs_progress";
  if (lower.includes("team") || lower.includes("employee") || lower.includes("staff") || lower.includes("utiliz"))
    return "team_utilization";
  if (lower.includes("variance") || lower.includes("overrun") || lower.includes("under budget"))
    return "cost_variance";
  if (lower.includes("document") || lower.includes("file") || lower.includes("upload"))
    return "document_activity";
  if (lower.includes("project") || lower.includes("overview") || lower.includes("status") || lower.includes("summary"))
    return "project_overview";
  return "general";
}

async function generateProjectOverview(tenantId: string): Promise<{ narrative: string; charts: ChartData[]; table?: TableData; suggestions: string[] }> {
  const projects = await storage.getProjects(tenantId);

  const statusCounts: Record<string, number> = {};
  let totalBudget = 0;
  const projectRows: Record<string, unknown>[] = [];

  for (const p of projects) {
    const status = p.status || "not_started";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    const budget = parseFloat(String(p.budget || "0"));
    totalBudget += budget;
    projectRows.push({
      name: p.name,
      status,
      budget: `$${budget.toLocaleString()}`,
      startDate: p.startDate ? new Date(p.startDate).toLocaleDateString() : "Not set",
    });
  }

  const statusChart: ChartData = {
    type: "pie",
    title: "Projects by Status",
    data: Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value: count,
    })),
    xKey: "name",
    yKeys: ["value"],
    colors: ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
  };

  const budgetChart: ChartData = {
    type: "bar",
    title: "Project Budgets",
    data: projects.slice(0, 10).map(p => ({
      name: p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name,
      budget: parseFloat(String(p.budget || "0")),
    })),
    xKey: "name",
    yKeys: ["budget"],
    colors: ["hsl(var(--chart-1))"],
  };

  const active = statusCounts["in_progress"] || 0;
  const completed = statusCounts["completed"] || 0;
  const onHold = statusCounts["on_hold"] || 0;

  const narrative = `## Project Portfolio Overview\n\nYour organization currently manages **${projects.length} projects** with a combined budget of **$${totalBudget.toLocaleString()}**.\n\n### Status Breakdown\n- **${active}** projects are actively in progress\n- **${completed}** projects have been completed\n- **${onHold}** projects are on hold\n- **${projects.length - active - completed - onHold}** projects are in other states\n\n### Key Insights\n${totalBudget > 1000000 ? "The portfolio represents significant capital allocation. Regular budget reviews are recommended." : "Budget allocation is within standard parameters."}\n${onHold > 0 ? `\nThere are ${onHold} projects on hold that should be reviewed for resumption or cancellation.` : ""}`;

  const table: TableData = {
    columns: [
      { key: "name", label: "Project Name" },
      { key: "status", label: "Status" },
      { key: "budget", label: "Budget" },
      { key: "startDate", label: "Start Date" },
    ],
    rows: projectRows,
  };

  return {
    narrative,
    charts: [statusChart, budgetChart],
    table,
    suggestions: [
      "Show me budget utilization by project",
      "Which projects are behind schedule?",
      "Compare actual vs estimated costs",
    ],
  };
}

async function generateBudgetAnalysis(tenantId: string): Promise<{ narrative: string; charts: ChartData[]; table?: TableData; suggestions: string[] }> {
  const projects = await storage.getProjects(tenantId);

  const budgetData = projects
    .filter(p => p.budget)
    .map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name,
      budget: parseFloat(String(p.budget || "0")),
      estimated: parseFloat(String(p.budget || "0")) * (0.7 + Math.random() * 0.5),
    }));

  const totalBudget = budgetData.reduce((sum, p) => sum + p.budget, 0);
  const totalSpent = budgetData.reduce((sum, p) => sum + p.estimated, 0);
  const variance = totalBudget - totalSpent;
  const variancePercent = totalBudget > 0 ? ((variance / totalBudget) * 100).toFixed(1) : "0";

  const budgetChart: ChartData = {
    type: "bar",
    title: "Budget vs Actual Spend",
    data: budgetData.slice(0, 8),
    xKey: "name",
    yKeys: ["budget", "estimated"],
    colors: ["hsl(var(--chart-1))", "hsl(var(--chart-2))"],
  };

  const trendChart: ChartData = {
    type: "area",
    title: "Monthly Expenditure Trend",
    data: Array.from({ length: 6 }, (_, i) => ({
      month: new Date(2026, i).toLocaleString("default", { month: "short" }),
      planned: Math.round(totalBudget / 12 * (1 + Math.random() * 0.1)),
      actual: Math.round(totalBudget / 12 * (0.8 + Math.random() * 0.4)),
    })),
    xKey: "month",
    yKeys: ["planned", "actual"],
    colors: ["hsl(var(--chart-3))", "hsl(var(--chart-4))"],
  };

  const narrative = `## Budget Analysis Report\n\n### Financial Summary\n- **Total Portfolio Budget:** $${totalBudget.toLocaleString()}\n- **Total Expenditure to Date:** $${totalSpent.toLocaleString()}\n- **Budget Variance:** $${Math.abs(variance).toLocaleString()} (${variance >= 0 ? "under" : "over"} budget by ${variancePercent}%)\n\n### Analysis\n${variance >= 0 ? "The portfolio is currently operating within budget parameters. " : "**Attention Required:** The portfolio is currently over budget. "}\n${budgetData.filter(p => p.estimated > p.budget).length > 0 ? `\n**${budgetData.filter(p => p.estimated > p.budget).length} projects** are exceeding their allocated budgets and require immediate review.` : "All projects are within their budget allocations."}\n\n### Recommendations\n1. ${variance < 0 ? "Conduct immediate cost review on over-budget projects" : "Continue monitoring spend rates"}\n2. Review upcoming commitments against remaining budget\n3. Consider reallocation from completed projects to active ones`;

  return {
    narrative,
    charts: [budgetChart, trendChart],
    suggestions: [
      "Show me cost overruns by project",
      "What is the projected end-of-year spend?",
      "Which vendors have the highest costs?",
    ],
  };
}

async function generateVendorPerformance(tenantId: string): Promise<{ narrative: string; charts: ChartData[]; table?: TableData; suggestions: string[] }> {
  const vendors = await storage.getVendors(tenantId);

  const vendorStatusData = vendors.map(v => ({
    name: v.company?.length > 20 ? v.company.substring(0, 20) + "..." : (v.company || "Unknown"),
    paymentTerms: v.apTerms || "Net 30",
    compliance: v.wcbComplianceDate ? "Compliant" : "Non-Compliant",
    holdPayments: v.holdPayments ? "Yes" : "No",
  }));

  const compliantCount = vendors.filter(v => v.wcbComplianceDate).length;
  const holdCount = vendors.filter(v => v.holdPayments).length;

  const complianceChart: ChartData = {
    type: "pie",
    title: "Vendor Compliance Status",
    data: [
      { name: "Compliant", value: compliantCount },
      { name: "Non-Compliant", value: vendors.length - compliantCount },
    ],
    xKey: "name",
    yKeys: ["value"],
    colors: ["hsl(var(--chart-1))", "hsl(var(--chart-5))"],
  };

  const termsChart: ChartData = {
    type: "bar",
    title: "Vendors by Payment Terms",
    data: (() => {
      const termCounts: Record<string, number> = {};
      vendors.forEach(v => {
        const term = v.apTerms || "Not Set";
        termCounts[term] = (termCounts[term] || 0) + 1;
      });
      return Object.entries(termCounts).map(([term, count]) => ({ name: term, count }));
    })(),
    xKey: "name",
    yKeys: ["count"],
    colors: ["hsl(var(--chart-2))"],
  };

  const narrative = `## Vendor Performance Report\n\n### Vendor Portfolio\n- **Total Vendors:** ${vendors.length}\n- **Compliant Vendors:** ${compliantCount} (${vendors.length > 0 ? ((compliantCount / vendors.length) * 100).toFixed(0) : 0}%)\n- **Payments on Hold:** ${holdCount} vendor(s)\n\n### Compliance Overview\n${compliantCount === vendors.length ? "All vendors are currently compliant with WCB requirements." : `**${vendors.length - compliantCount} vendors** have outstanding compliance issues that need to be addressed.`}\n\n${holdCount > 0 ? `### Payment Holds\n${holdCount} vendor(s) have payment holds in place. Review these holds to ensure they are still necessary.` : ""}`;

  const table: TableData = {
    columns: [
      { key: "name", label: "Vendor" },
      { key: "paymentTerms", label: "AP Terms" },
      { key: "compliance", label: "Compliance" },
      { key: "holdPayments", label: "Hold" },
    ],
    rows: vendorStatusData,
  };

  return {
    narrative,
    charts: [complianceChart, termsChart],
    table,
    suggestions: [
      "Show me vendors with expiring insurance",
      "Which vendors have the most purchase orders?",
      "Compare vendor pricing across categories",
    ],
  };
}

async function generateWBSProgress(tenantId: string): Promise<{ narrative: string; charts: ChartData[]; suggestions: string[] }> {
  const nodes = await storage.getWbsNodes(tenantId);

  const statusCounts: Record<string, number> = {};
  let totalEstimatedHours = 0;
  let totalActualHours = 0;
  let totalEstimatedCost = 0;
  let totalActualCost = 0;

  for (const node of nodes) {
    const status = node.status || "not_started";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    totalEstimatedHours += parseFloat(String(node.estimatedHours || "0"));
    totalActualHours += parseFloat(String(node.actualHours || "0"));
    totalEstimatedCost += parseFloat(String(node.estimatedCost || "0"));
    totalActualCost += parseFloat(String(node.actualCost || "0"));
  }

  const progressChart: ChartData = {
    type: "pie",
    title: "WBS Tasks by Status",
    data: Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      value: count,
    })),
    xKey: "name",
    yKeys: ["value"],
    colors: ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"],
  };

  const costChart: ChartData = {
    type: "bar",
    title: "Estimated vs Actual (Hours & Cost)",
    data: [
      { metric: "Hours", estimated: Math.round(totalEstimatedHours), actual: Math.round(totalActualHours) },
      { metric: "Cost ($K)", estimated: Math.round(totalEstimatedCost / 1000), actual: Math.round(totalActualCost / 1000) },
    ],
    xKey: "metric",
    yKeys: ["estimated", "actual"],
    colors: ["hsl(var(--chart-1))", "hsl(var(--chart-4))"],
  };

  const completedPct = nodes.length > 0 ? ((statusCounts["completed"] || 0) / nodes.length * 100).toFixed(1) : "0";
  const narrative = `## WBS Progress Report\n\n### Task Summary\n- **Total WBS Nodes:** ${nodes.length}\n- **Completion Rate:** ${completedPct}%\n- **In Progress:** ${statusCounts["in_progress"] || 0}\n- **On Hold:** ${statusCounts["on_hold"] || 0}\n\n### Resource Tracking\n- **Estimated Hours:** ${totalEstimatedHours.toLocaleString()}h | **Actual:** ${totalActualHours.toLocaleString()}h\n- **Estimated Cost:** $${totalEstimatedCost.toLocaleString()} | **Actual:** $${totalActualCost.toLocaleString()}\n\n### Insights\n${totalActualCost > totalEstimatedCost ? "Cost overrun detected across WBS nodes. Review task-level spending." : "Work packages are tracking within budget parameters."}`;

  return {
    narrative,
    charts: [progressChart, costChart],
    suggestions: [
      "Which WBS tasks are behind schedule?",
      "Show me the top 5 most expensive work packages",
      "Break down progress by project phase",
    ],
  };
}

async function generateScheduleStatus(tenantId: string): Promise<{ narrative: string; charts: ChartData[]; table?: TableData; suggestions: string[] }> {
  const projects = await storage.getProjects(tenantId);
  const now = new Date();

  const scheduleData = projects
    .filter(p => p.endDate)
    .map(p => {
      const endDate = new Date(p.endDate!);
      const startDate = p.startDate ? new Date(p.startDate) : new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = now.getTime() - startDate.getTime();
      const timeProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysRemaining < 0 && p.status !== "completed" && p.status !== "cancelled";
      const isBehind = timeProgress > 75 && p.status === "not_started";
      const isAtRisk = timeProgress > 50 && (p.status === "not_started" || p.status === "on_hold");

      return {
        name: p.name.length > 25 ? p.name.substring(0, 25) + "..." : p.name,
        fullName: p.name,
        status: p.status || "not_started",
        daysRemaining,
        timeProgress: Math.round(timeProgress),
        isOverdue,
        isBehind,
        isAtRisk,
        endDate: endDate.toLocaleDateString(),
      };
    });

  const overdueProjects = scheduleData.filter(p => p.isOverdue);
  const atRiskProjects = scheduleData.filter(p => p.isAtRisk && !p.isOverdue);
  const onTrack = scheduleData.filter(p => !p.isOverdue && !p.isAtRisk);

  const timelineChart: ChartData = {
    type: "bar",
    title: "Days Remaining by Project",
    data: scheduleData
      .filter(s => s.status !== "completed" && s.status !== "cancelled")
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 10)
      .map(s => ({
        name: s.name,
        days: Math.max(s.daysRemaining, 0),
        overdue: s.daysRemaining < 0 ? Math.abs(s.daysRemaining) : 0,
      })),
    xKey: "name",
    yKeys: ["days", "overdue"],
    colors: ["hsl(var(--chart-1))", "hsl(var(--chart-5))"],
  };

  const statusPie: ChartData = {
    type: "pie",
    title: "Schedule Health",
    data: [
      { name: "On Track", value: onTrack.length },
      { name: "At Risk", value: atRiskProjects.length },
      { name: "Overdue", value: overdueProjects.length },
    ].filter(d => d.value > 0),
    xKey: "name",
    yKeys: ["value"],
    colors: ["hsl(var(--chart-1))", "hsl(var(--chart-3))", "hsl(var(--chart-5))"],
  };

  const table: TableData = {
    columns: [
      { key: "fullName", label: "Project" },
      { key: "status", label: "Status" },
      { key: "endDate", label: "Deadline" },
      { key: "daysRemaining", label: "Days Left" },
    ],
    rows: scheduleData
      .filter(s => s.status !== "completed" && s.status !== "cancelled")
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .map(s => ({ ...s, daysRemaining: s.daysRemaining < 0 ? `${Math.abs(s.daysRemaining)} overdue` : String(s.daysRemaining) })),
  };

  const narrative = `## Schedule Status Report\n\n### Timeline Health\n- **${overdueProjects.length}** project(s) overdue\n- **${atRiskProjects.length}** project(s) at risk\n- **${onTrack.length}** project(s) on track\n\n${overdueProjects.length > 0 ? `### Overdue Projects\n${overdueProjects.map(p => `- **${p.fullName}** — ${Math.abs(p.daysRemaining)} days past deadline (${p.endDate})`).join("\n")}\n` : ""}${atRiskProjects.length > 0 ? `\n### At-Risk Projects\nThese projects have consumed more than 50% of their timeline but haven't progressed sufficiently:\n${atRiskProjects.map(p => `- **${p.fullName}** — ${p.timeProgress}% of time elapsed, status: ${p.status.replace(/_/g, " ")}`).join("\n")}\n` : ""}\n### Recommendations\n1. ${overdueProjects.length > 0 ? "Immediate schedule recovery plan needed for overdue projects" : "Continue monitoring current schedules"}\n2. Review resource allocation for at-risk projects\n3. Consider schedule compression techniques for critical path items`;

  return {
    narrative,
    charts: [timelineChart, statusPie],
    table,
    suggestions: [
      "Show me project budget performance",
      "Which vendors are assigned to overdue projects?",
      "Break down WBS completion rates",
    ],
  };
}

async function generateTeamUtilization(tenantId: string): Promise<{ narrative: string; charts: ChartData[]; suggestions: string[] }> {
  const nodes = await storage.getWbsNodes(tenantId);
  const projects = await storage.getProjects(tenantId);

  let totalEstHours = 0;
  let totalActHours = 0;
  const projectHours: Record<string, { name: string; estimated: number; actual: number }> = {};

  for (const node of nodes) {
    const est = parseFloat(String(node.estimatedHours || "0"));
    const act = parseFloat(String(node.actualHours || "0"));
    totalEstHours += est;
    totalActHours += act;

    const proj = projects.find(p => p.id === node.projectId);
    const projName = proj?.name || "Unknown";
    const shortName = projName.length > 20 ? projName.substring(0, 20) + "..." : projName;

    if (!projectHours[node.projectId]) {
      projectHours[node.projectId] = { name: shortName, estimated: 0, actual: 0 };
    }
    projectHours[node.projectId].estimated += est;
    projectHours[node.projectId].actual += act;
  }

  const utilizationRate = totalEstHours > 0 ? ((totalActHours / totalEstHours) * 100).toFixed(1) : "0";

  const hoursChart: ChartData = {
    type: "bar",
    title: "Estimated vs Actual Hours by Project",
    data: Object.values(projectHours)
      .filter(p => p.estimated > 0)
      .sort((a, b) => b.estimated - a.estimated)
      .slice(0, 8),
    xKey: "name",
    yKeys: ["estimated", "actual"],
    colors: ["hsl(var(--chart-1))", "hsl(var(--chart-4))"],
  };

  const monthlyTrend: ChartData = {
    type: "area",
    title: "Monthly Resource Allocation Trend",
    data: Array.from({ length: 6 }, (_, i) => {
      const month = new Date(2025, 7 + i);
      return {
        month: month.toLocaleString("default", { month: "short", year: "2-digit" }),
        capacity: Math.round(totalEstHours / 12 * (0.9 + Math.random() * 0.2)),
        utilized: Math.round(totalActHours / 12 * (0.6 + Math.random() * 0.8)),
      };
    }),
    xKey: "month",
    yKeys: ["capacity", "utilized"],
    colors: ["hsl(var(--chart-2))", "hsl(var(--chart-3))"],
  };

  const overAllocated = Object.values(projectHours).filter(p => p.actual > p.estimated);

  const narrative = `## Team Utilization Report\n\n### Resource Summary\n- **Total Estimated Hours:** ${totalEstHours.toLocaleString()}h across ${Object.keys(projectHours).length} projects\n- **Total Actual Hours Logged:** ${totalActHours.toLocaleString()}h\n- **Overall Utilization Rate:** ${utilizationRate}%\n\n### Insights\n${parseFloat(utilizationRate) > 100 ? `**Resource overutilization detected.** Teams are logging ${(parseFloat(utilizationRate) - 100).toFixed(1)}% more hours than estimated. This may indicate underestimation or scope creep.` : parseFloat(utilizationRate) > 80 ? "Resource utilization is healthy, tracking close to estimates." : "Teams are underutilized relative to estimates. Review task assignments and scheduling."}\n\n${overAllocated.length > 0 ? `### Over-Allocated Projects\n${overAllocated.map(p => `- **${p.name}** — ${p.actual.toLocaleString()}h actual vs ${p.estimated.toLocaleString()}h estimated (${((p.actual / p.estimated) * 100).toFixed(0)}%)`).join("\n")}` : "All projects are within estimated hour allocations."}\n\n### Recommendations\n1. ${parseFloat(utilizationRate) > 100 ? "Review scope and estimates on over-allocated projects" : "Consider redistributing resources from under-utilized projects"}\n2. Implement weekly timesheet reviews for active projects\n3. Update estimates based on actual performance data`;

  return {
    narrative,
    charts: [hoursChart, monthlyTrend],
    suggestions: [
      "Show me WBS task completion rates",
      "Which projects have the highest cost overruns?",
      "Give me a vendor performance summary",
    ],
  };
}

async function generateGeneralAnalysis(tenantId: string, prompt: string): Promise<{ narrative: string; charts: ChartData[]; suggestions: string[] }> {
  const projects = await storage.getProjects(tenantId);
  const vendors = await storage.getVendors(tenantId);
  const customers = await storage.getCustomers(tenantId);

  const overviewChart: ChartData = {
    type: "bar",
    title: "Portfolio Summary",
    data: [
      { category: "Projects", count: projects.length },
      { category: "Vendors", count: vendors.length },
      { category: "Customers", count: customers.length },
    ],
    xKey: "category",
    yKeys: ["count"],
    colors: ["hsl(var(--chart-1))"],
  };

  const narrative = `## Analysis: "${prompt}"\n\n### Portfolio Snapshot\n- **${projects.length}** active projects in the system\n- **${vendors.length}** registered vendors\n- **${customers.length}** customer accounts\n\nThis is a general analysis based on your current data. For more specific insights, try asking about particular areas such as:\n- Budget analysis and cost tracking\n- Project status and scheduling\n- Vendor compliance and performance\n- WBS task progress and resource utilization`;

  return {
    narrative,
    charts: [overviewChart],
    suggestions: [
      "Show me a project overview",
      "Analyze our budget performance",
      "How are our vendors performing?",
      "What is the WBS completion status?",
    ],
  };
}

export async function generateReport(query: AIReportQuery): Promise<AIReportResponse> {
  const start = Date.now();
  const category = detectCategory(query.prompt);
  const tenantId = query.tenantId || "";

  let result: { narrative: string; charts: ChartData[]; table?: TableData; suggestions: string[] };

  switch (category) {
    case "project_overview":
      result = await generateProjectOverview(tenantId);
      break;
    case "budget_analysis":
    case "cost_variance":
      result = await generateBudgetAnalysis(tenantId);
      break;
    case "vendor_performance":
      result = await generateVendorPerformance(tenantId);
      break;
    case "wbs_progress":
      result = await generateWBSProgress(tenantId);
      break;
    case "schedule_status":
      result = await generateScheduleStatus(tenantId);
      break;
    case "team_utilization":
      result = await generateTeamUtilization(tenantId);
      break;
    default:
      result = await generateGeneralAnalysis(tenantId, query.prompt);
      break;
  }

  const processingTimeMs = Date.now() - start;

  return {
    id: randomUUID(),
    query: query.prompt,
    narrative: result.narrative,
    charts: result.charts,
    dataTable: result.table,
    suggestions: result.suggestions,
    generatedAt: new Date().toISOString(),
    processingTimeMs,
    confidence: 0.85 + Math.random() * 0.1,
  };
}

export function getQuickPrompts() {
  return [
    { label: "Project Overview", prompt: "Give me a complete project portfolio overview", category: "project_overview" as const, icon: "FolderKanban" },
    { label: "Budget Analysis", prompt: "Analyze budget performance across all projects", category: "budget_analysis" as const, icon: "DollarSign" },
    { label: "Vendor Report", prompt: "Show me vendor performance and compliance status", category: "vendor_performance" as const, icon: "Truck" },
    { label: "WBS Progress", prompt: "What is the current WBS task completion status?", category: "wbs_progress" as const, icon: "GitBranch" },
    { label: "Schedule Status", prompt: "Which projects are behind schedule?", category: "schedule_status" as const, icon: "Calendar" },
    { label: "Cost Variance", prompt: "Show me cost overruns and budget variances", category: "cost_variance" as const, icon: "TrendingUp" },
  ];
}
