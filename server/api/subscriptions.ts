import { Router, Request, Response } from "express";
import { subscriptionService } from "../services/subscription-service";
import { usageTrackingService } from "../services/usage-tracking-service";
import { taxService } from "../services/tax-service";
import { getDefaultTenantId } from "./tenants";
import { z } from "zod";
import { PLAN_ORDER, FEATURE_GATES, PLAN_REQUIREMENTS, SECURITY_MODE_HIERARCHY, SECURITY_MODE_REQUIREMENTS } from "../../shared/types/subscriptions";

const createSubscriptionSchema = z.object({
  planCode: z.string().min(1),
  billingInterval: z.enum(["monthly", "yearly"]).default("monthly"),
  userSeats: z.number().int().min(1).default(1),
});

const changePlanSchema = z.object({
  planCode: z.string().min(1),
  lockPricing: z.boolean().default(true),
});

const updateSeatsSchema = z.object({
  seats: z.number().int().min(1),
});

export function createSubscriptionsRouter(): Router {
  const router = Router();

  router.get("/api/subscriptions/plans", async (req: Request, res: Response) => {
    try {
      const plans = await subscriptionService.getPlans();
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/subscriptions/plans/:code", async (req: Request, res: Response) => {
    try {
      const plan = await subscriptionService.getPlanByCode(req.params.code as string);
      if (!plan) return res.status(404).json({ error: "Plan not found" });
      res.json(plan);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/subscriptions/current", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const sub = await subscriptionService.getTenantSubscription(tenantId);
      if (!sub) return res.status(404).json({ error: "No subscription found" });

      const plan = await subscriptionService.getPlanByCode(
        (await subscriptionService.getPlans()).find(p => p.id === sub.planId)?.code ?? ""
      );

      res.json({ subscription: sub, plan });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/subscriptions", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const body = createSubscriptionSchema.parse(req.body);
      const sub = await subscriptionService.createSubscription(
        tenantId, body.planCode, body.billingInterval, body.userSeats
      );
      res.status(201).json(sub);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/api/subscriptions/plan", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const body = changePlanSchema.parse(req.body);
      const sub = await subscriptionService.changePlan(tenantId, body.planCode, body.lockPricing);
      res.json(sub);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch("/api/subscriptions/seats", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const body = updateSeatsSchema.parse(req.body);
      const sub = await subscriptionService.updateSeats(tenantId, body.seats);
      res.json(sub);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/api/subscriptions/cancel", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const atPeriodEnd = req.body.atPeriodEnd !== false;
      const sub = await subscriptionService.cancelSubscription(tenantId, atPeriodEnd);
      res.json(sub);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/api/subscriptions/activate", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const sub = await subscriptionService.activateSubscription(tenantId);
      res.json(sub);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/api/subscriptions/usage", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const summary = await usageTrackingService.getUsageSummary(tenantId);
      const limits = await usageTrackingService.checkLimits(tenantId);
      res.json({ summary, limits });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/subscriptions/entitlements", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const sub = await subscriptionService.getTenantSubscription(tenantId);
      if (!sub) return res.json({ features: {}, planCode: "none" });

      const plans = await subscriptionService.getPlans();
      const plan = plans.find(p => p.id === sub.planId);
      const planCode = plan?.code ?? "essentials";

      const features: Record<string, boolean> = {};
      for (const [gate, minPlan] of Object.entries(PLAN_REQUIREMENTS)) {
        const planIdx = PLAN_ORDER.indexOf(planCode);
        const minIdx = PLAN_ORDER.indexOf(minPlan);
        features[gate] = planIdx >= minIdx;
      }

      for (const [gate, minMode] of Object.entries(SECURITY_MODE_REQUIREMENTS)) {
        const currentIdx = SECURITY_MODE_HIERARCHY.indexOf(sub.securityMode as any ?? "zero");
        const minIdx = SECURITY_MODE_HIERARCHY.indexOf(minMode);
        if (currentIdx < minIdx) features[gate] = false;
      }

      res.json({
        planCode,
        planName: plan?.name,
        status: sub.status,
        securityMode: sub.securityMode,
        features,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/subscriptions/provinces", async (req: Request, res: Response) => {
    try {
      const provinces = taxService.getAllProvinces();
      res.json(provinces);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/subscriptions/calculate", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const province = (req.query.province as string) || "ON";
      const billing = await subscriptionService.calculateBilling(tenantId, province);
      res.json(billing);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}
