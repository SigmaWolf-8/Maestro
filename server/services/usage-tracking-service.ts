import { storage } from "../storage";
import type { UsageMetric } from "@shared/schema";
import type { UsageSummary, UsageLimitStatus } from "../../shared/types/billing";

export class UsageTrackingService {
  async getMetrics(tenantId: string, startDate?: string, endDate?: string): Promise<UsageMetric[]> {
    return storage.getUsageMetrics(tenantId, startDate, endDate);
  }

  async recordMetric(tenantId: string, metricDate: string, data: Partial<UsageMetric>): Promise<UsageMetric> {
    return storage.upsertUsageMetric({
      tenantId,
      metricDate,
      ...data,
    } as any);
  }

  async incrementApiCalls(tenantId: string): Promise<void> {
    const sub = await storage.getTenantSubscription(tenantId);
    if (sub) {
      await storage.updateTenantSubscription(sub.id, {
        apiCallsThisMonth: (sub.apiCallsThisMonth ?? 0) + 1,
      });
    }
  }

  async getUsageSummary(tenantId: string): Promise<UsageSummary> {
    const sub = await storage.getTenantSubscription(tenantId);
    const today = new Date().toISOString().split("T")[0];
    const metric = await storage.getUsageMetrics(tenantId, today, today);

    const todayMetric = metric[0];

    return {
      activeUsers: todayMetric?.activeUsers ?? sub?.userSeats ?? 0,
      currentProjects: sub?.currentProjects ?? 0,
      storageUsedGb: parseFloat(sub?.storageUsedGb ?? "0"),
      apiCallsThisMonth: sub?.apiCallsThisMonth ?? 0,
      ternaryOperations: todayMetric?.ternaryOperations ?? 0,
      phaseSyncEvents: todayMetric?.phaseSyncEvents ?? 0,
      algorandWitnessEvents: todayMetric?.algorandWitnessEvents ?? 0,
      hederaWitnessEvents: todayMetric?.hederaWitnessEvents ?? 0,
      femtosecondTimingEvents: todayMetric?.femtosecondTimingEvents ?? 0,
      phaseAlignmentEfficiency: parseFloat(todayMetric?.phaseAlignmentEfficiency ?? "0"),
    };
  }

  async checkLimits(tenantId: string): Promise<UsageLimitStatus[]> {
    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub) return [];

    const plan = await storage.getSubscriptionPlan(sub.planId);
    if (!plan) return [];

    const summary = await this.getUsageSummary(tenantId);
    const limits: UsageLimitStatus[] = [];

    const addLimit = (metric: string, current: number, limit: number) => {
      if (limit <= 0) return;
      const percentUsed = Math.round((current / limit) * 100);
      limits.push({
        metric,
        current,
        limit,
        percentUsed,
        exceeded: current >= limit,
        warningThreshold: percentUsed >= 80,
      });
    };

    addLimit("users", summary.activeUsers, plan.maxUsers ?? 999);
    addLimit("projects", summary.currentProjects, plan.maxProjects ?? 999);
    addLimit("storage_gb", summary.storageUsedGb, plan.storageGb ?? 999);
    if ((plan.apiCallsPerMonth ?? -1) > 0) {
      addLimit("api_calls", summary.apiCallsThisMonth, plan.apiCallsPerMonth!);
    }

    return limits;
  }
}

export const usageTrackingService = new UsageTrackingService();
