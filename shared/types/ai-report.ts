import { z } from "zod";

export const aiReportQuerySchema = z.object({
  prompt: z.string().min(1).max(2000),
  tenantId: z.string().optional(),
  context: z.object({
    projectId: z.string().optional(),
    dateRange: z.object({
      from: z.string(),
      to: z.string(),
    }).optional(),
    department: z.string().optional(),
  }).optional(),
});

export type AIReportQuery = z.infer<typeof aiReportQuerySchema>;

export interface ChartData {
  type: "bar" | "line" | "pie" | "area";
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
}

export interface TableData {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
}

export interface AIReportResponse {
  id: string;
  query: string;
  narrative: string;
  charts?: ChartData[];
  dataTable?: TableData;
  suggestions?: string[];
  generatedAt: string;
  processingTimeMs: number;
  sqlGenerated?: string;
  confidence: number;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  report?: AIReportResponse;
  timestamp: string;
}

export interface AIConversation {
  id: string;
  tenantId: string;
  messages: AIMessage[];
  createdAt: string;
  title?: string;
}

export const reportCategories = [
  "project_overview",
  "budget_analysis",
  "schedule_status",
  "vendor_performance",
  "wbs_progress",
  "team_utilization",
  "cost_variance",
  "document_activity",
  "general",
] as const;

export type ReportCategory = typeof reportCategories[number];

export interface QuickPrompt {
  label: string;
  prompt: string;
  category: ReportCategory;
  icon: string;
}
