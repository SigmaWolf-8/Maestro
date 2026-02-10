import { storage } from "../storage";
import type { SubscriptionPlan, TenantSubscription } from "@shared/schema";
import type { BillingInterval, SubscriptionStatus } from "../../shared/types/subscriptions";
import { PLAN_ORDER, SUBSCRIPTION_TIER_SEEDS } from "../../shared/types/subscriptions";
import { taxService } from "./tax-service";
import { pricingConfigService } from "./pricing-config-service";
import type { BillingCalculation, InvoiceLineItem } from "../../shared/types/billing";

export class SubscriptionService {
  async getPlans(): Promise<SubscriptionPlan[]> {
    return storage.getSubscriptionPlans();
  }

  async getPlanByCode(code: string): Promise<SubscriptionPlan | undefined> {
    return storage.getSubscriptionPlanByCode(code);
  }

  async getTenantSubscription(tenantId: string): Promise<TenantSubscription | undefined> {
    return storage.getTenantSubscription(tenantId);
  }

  async createSubscription(
    tenantId: string,
    planCode: string,
    billingInterval: BillingInterval = "monthly",
    userSeats: number = 1
  ): Promise<TenantSubscription> {
    const plan = await storage.getSubscriptionPlanByCode(planCode);
    if (!plan) throw new Error(`Plan not found: ${planCode}`);

    const trialDays = await pricingConfigService.getIntValue("trial_days", 14);
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    const periodEnd = new Date(now);
    if (billingInterval === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    return storage.createTenantSubscription({
      tenantId,
      planId: plan.id,
      billingInterval,
      status: "trialing",
      lockedBasePriceCents: billingInterval === "yearly" ? plan.basePriceYearlyCents : plan.basePriceMonthlyCents,
      lockedPerUserPriceCents: plan.perUserPriceCents,
      userSeats,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEndsAt: trialEnd,
      securityMode: plan.securityMode ?? "zero",
    });
  }

  async changePlan(
    tenantId: string,
    newPlanCode: string,
    lockPricing: boolean = true
  ): Promise<TenantSubscription> {
    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub) throw new Error("No subscription found");

    const newPlan = await storage.getSubscriptionPlanByCode(newPlanCode);
    if (!newPlan) throw new Error(`Plan not found: ${newPlanCode}`);

    const updates: Partial<TenantSubscription> = {
      planId: newPlan.id,
      securityMode: newPlan.securityMode ?? "zero",
    };

    if (lockPricing) {
      updates.lockedBasePriceCents = sub.billingInterval === "yearly"
        ? newPlan.basePriceYearlyCents
        : newPlan.basePriceMonthlyCents;
      updates.lockedPerUserPriceCents = newPlan.perUserPriceCents;
    }

    return (await storage.updateTenantSubscription(sub.id, updates))!;
  }

  async updateSeats(tenantId: string, seats: number): Promise<TenantSubscription> {
    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub) throw new Error("No subscription found");
    return (await storage.updateTenantSubscription(sub.id, { userSeats: seats }))!;
  }

  async cancelSubscription(tenantId: string, atPeriodEnd: boolean = true): Promise<TenantSubscription> {
    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub) throw new Error("No subscription found");

    const updates: Partial<TenantSubscription> = atPeriodEnd
      ? { cancelAtPeriodEnd: true }
      : { status: "canceled" as any };

    return (await storage.updateTenantSubscription(sub.id, updates))!;
  }

  async calculateBilling(tenantId: string, province: string = "ON"): Promise<BillingCalculation> {
    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub) throw new Error("No subscription found");

    const plan = await storage.getSubscriptionPlan(sub.planId);
    if (!plan) throw new Error("Plan not found");

    const basePlanCents = sub.lockedBasePriceCents ?? (sub.billingInterval === "yearly" ? plan.basePriceYearlyCents ?? 0 : plan.basePriceMonthlyCents ?? 0);
    const perUserCents = sub.lockedPerUserPriceCents ?? plan.perUserPriceCents ?? 0;

    const includedUsers = plan.maxUsers ?? 1;
    const additionalUsers = Math.max(0, (sub.userSeats ?? 1) - includedUsers);
    const userChargesCents = additionalUsers * perUserCents;

    const subtotalCents = basePlanCents + userChargesCents;
    const taxBreakdown = taxService.calculateTax(subtotalCents, province);

    return {
      basePlanCents,
      additionalUsers,
      userChargesCents,
      overageChargesCents: 0,
      plenumnetChargesCents: 0,
      ledgerWitnessingChargesCents: 0,
      subtotalCents,
      taxRateBps: taxService.getTotalTaxRateBps(province),
      taxAmountCents: taxBreakdown.totalTaxCents,
      totalCents: subtotalCents + taxBreakdown.totalTaxCents,
      currency: "CAD",
      province,
      taxBreakdown,
    };
  }

  async activateSubscription(tenantId: string): Promise<TenantSubscription> {
    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub) throw new Error("No subscription found");
    return (await storage.updateTenantSubscription(sub.id, { status: "active" as any }))!;
  }

  canUpgrade(currentPlanCode: string, targetPlanCode: string): boolean {
    const currentIdx = PLAN_ORDER.indexOf(currentPlanCode);
    const targetIdx = PLAN_ORDER.indexOf(targetPlanCode);
    return targetIdx > currentIdx;
  }

  async seedPlans(): Promise<void> {
    for (const seed of Object.values(SUBSCRIPTION_TIER_SEEDS)) {
      const existing = await storage.getSubscriptionPlanByCode(seed.code);
      if (!existing) {
        await storage.createSubscriptionPlan({
          name: seed.name,
          code: seed.code,
          basePriceMonthlyCents: seed.basePriceMonthlyCents,
          basePriceYearlyCents: seed.basePriceYearlyCents,
          perUserPriceCents: seed.perUserPriceCents,
          annualDiscountBps: seed.annualDiscountBps,
          currency: "CAD",
          features: seed.features,
          maxUsers: seed.maxUsers,
          maxProjects: typeof seed.maxProjects === "number" ? seed.maxProjects : null,
          storageGb: seed.storageGb,
          apiCallsPerMonth: seed.apiCallsPerMonth,
          securityMode: seed.securityMode,
          plenumnetEnabled: seed.plenumnet.enabled,
          phaseSyncRequired: seed.plenumnet.phaseSync,
          femtosecondTiming: seed.plenumnet.timing === "femtosecond",
          ledgerWitnessingEnabled: seed.plenumnet.ledgerWitnessing,
          ledgerProvider: seed.plenumnet.ledgerProvider,
        });
      }
    }
  }
}

export const subscriptionService = new SubscriptionService();
