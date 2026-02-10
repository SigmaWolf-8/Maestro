import { Router, Request, Response } from "express";
import { pricingConfigService } from "../services/pricing-config-service";
import { subscriptionService } from "../services/subscription-service";
import { storage } from "../storage";
import { z } from "zod";

const upsertPricingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  valueType: z.enum(["string", "integer", "boolean", "json"]).default("string"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
  description: z.string().optional(),
});

const updatePlanSchema = z.object({
  name: z.string().optional(),
  basePriceMonthlyCents: z.number().int().optional(),
  basePriceYearlyCents: z.number().int().optional(),
  perUserPriceCents: z.number().int().optional(),
  annualDiscountBps: z.number().int().optional(),
  maxUsers: z.number().int().optional(),
  maxProjects: z.number().int().nullable().optional(),
  storageGb: z.number().int().optional(),
  apiCallsPerMonth: z.number().int().optional(),
  isActive: z.boolean().optional(),
  features: z.record(z.any()).optional(),
});

export function createAdminPricingRouter(): Router {
  const router = Router();

  router.get("/api/admin/pricing/configs", async (req: Request, res: Response) => {
    try {
      const configs = await pricingConfigService.getAllConfigs();
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put("/api/admin/pricing/configs", async (req: Request, res: Response) => {
    try {
      const body = upsertPricingSchema.parse(req.body);
      await pricingConfigService.setValue(
        body.key,
        body.value,
        body.valueType,
        body.visibility,
        body.description
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.delete("/api/admin/pricing/configs/:key", async (req: Request, res: Response) => {
    try {
      const deleted = await pricingConfigService.deleteConfig(req.params.key as string);
      res.json({ success: deleted });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/api/admin/pricing/plans", async (req: Request, res: Response) => {
    try {
      const plans = await subscriptionService.getPlans();
      res.json(plans);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch("/api/admin/pricing/plans/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const body = updatePlanSchema.parse(req.body);
      const updated = await storage.updateSubscriptionPlan(id, body as any);
      if (!updated) return res.status(404).json({ error: "Plan not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/api/admin/pricing/stripe-sync", async (req: Request, res: Response) => {
    try {
      const records = await storage.getStripeSyncRecords();
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/admin/pricing/seed", async (req: Request, res: Response) => {
    try {
      await subscriptionService.seedPlans();
      await pricingConfigService.seedDefaults();
      res.json({ success: true, message: "Plans and pricing config seeded" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
