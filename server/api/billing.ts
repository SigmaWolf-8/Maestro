import { Router, Request, Response } from "express";
import { billingService } from "../services/billing-service";
import { usageTrackingService } from "../services/usage-tracking-service";
import { ledgerWitnessService } from "../services/ledger-witness-service";
import { getDefaultTenantId } from "./tenants";
import { z } from "zod";

const generateInvoiceSchema = z.object({
  province: z.string().length(2).default("ON"),
});

export function createBillingRouter(): Router {
  const router = Router();

  router.get("/api/billing/invoices", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const invoices = await billingService.getInvoices(tenantId);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/billing/invoices/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const invoice = await billingService.getInvoice(id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/api/billing/invoices/generate", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const body = generateInvoiceSchema.parse(req.body);
      const invoice = await billingService.generateInvoice(tenantId, body.province);
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/api/billing/invoices/:id/pay", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const invoice = await billingService.markInvoicePaid(id, req.body.stripeInvoiceId);
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post("/api/billing/invoices/:id/witness", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const provider = req.body.provider || "algorand";
      const receipt = await ledgerWitnessService.witnessInvoice(id, provider);
      res.json(receipt);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get("/api/billing/usage", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const metrics = await usageTrackingService.getMetrics(tenantId, startDate, endDate);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/billing/usage/summary", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const summary = await usageTrackingService.getUsageSummary(tenantId);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/api/billing/usage/limits", async (req: Request, res: Response) => {
    try {
      const tenantId = await getDefaultTenantId();
      const limits = await usageTrackingService.checkLimits(tenantId);
      res.json(limits);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
