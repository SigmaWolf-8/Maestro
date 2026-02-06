import { Router, Request, Response } from "express";
import { stripeService } from "../services/stripe-service";
import { getDefaultTenantId } from "./tenants";
import { z } from "zod";
import express from "express";

const createCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const createSubscriptionSchema = z.object({
  planCode: z.string().min(1),
  billingInterval: z.enum(["monthly", "yearly"]).default("monthly"),
});

export function createStripeRouter(): Router {
  const router = Router();

  router.get("/api/stripe/status", (_req: Request, res: Response) => {
    res.json({
      configured: stripeService.isConfigured,
      webhookConfigured: stripeService.webhookSecretConfigured,
    });
  });

  router.post("/api/stripe/customers", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const body = createCustomerSchema.parse(req.body);
      const customerId = await stripeService.createCustomer(tenantId, body.email, body.name);
      res.status(201).json({ customerId });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/api/stripe/sync-products", async (_req: Request, res: Response) => {
    try {
      const result = await stripeService.syncProductsAndPrices();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/stripe/subscriptions", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const body = createSubscriptionSchema.parse(req.body);
      const result = await stripeService.createSubscription(tenantId, body.planCode, body.billingInterval);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/api/stripe/subscriptions/cancel", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const atPeriodEnd = req.body.atPeriodEnd !== false;
      await stripeService.cancelSubscription(tenantId, atPeriodEnd);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/api/stripe/payment-methods", async (_req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const methods = await stripeService.getPaymentMethods(tenantId);
      res.json(methods);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/stripe/setup-intent", async (_req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const result = await stripeService.createSetupIntent(tenantId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      try {
        const signature = req.headers["stripe-signature"] as string;
        if (!signature) {
          return res.status(400).json({ error: "Missing stripe-signature header" });
        }
        const result = await stripeService.handleWebhook(req.body, signature);
        res.json(result);
      } catch (error: any) {
        console.error("[ERROR] Stripe webhook error:", error.message);
        res.status(400).json({ error: error.message });
      }
    }
  );

  return router;
}
