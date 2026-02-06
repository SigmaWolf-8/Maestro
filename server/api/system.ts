import { Router, Request, Response } from "express";
import { stripeService } from "../services/stripe-service";
import { ledgerWitnessService } from "../services/ledger-witness-service";
import { getAuthStatus, getAzureAuthUrl, exchangeAzureCode } from "../middleware/azure-ad-auth";

export function createSystemRouter(): Router {
  const router = Router();

  router.get("/api/system/status", (_req: Request, res: Response) => {
    res.json({
      version: "3.3.0",
      environment: process.env.NODE_ENV || "development",
      auth: getAuthStatus(),
      stripe: {
        configured: stripeService.isConfigured,
        webhookConfigured: stripeService.webhookSecretConfigured,
      },
      ledger: ledgerWitnessService.getAdapterStatus(),
      features: {
        rateLimiting: true,
        structuredLogging: true,
        correlationIds: true,
        migrationTooling: true,
      },
    });
  });

  router.get("/api/auth/azure/login", (_req: Request, res: Response) => {
    const url = getAzureAuthUrl();
    if (!url) {
      return res.status(503).json({ error: "Azure AD not configured" });
    }
    res.redirect(url);
  });

  router.get("/api/auth/azure/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }

    const result = await exchangeAzureCode(code);
    if (!result) {
      return res.status(401).json({ error: "Azure AD authentication failed" });
    }

    if (req.session) {
      (req.session as any).azureUser = {
        email: result.email,
        name: result.name,
        oid: result.oid,
        tenantId: result.tenantId,
      };
    }

    res.redirect("/");
  });

  router.get("/api/auth/azure/status", (req: Request, res: Response) => {
    res.json(getAuthStatus());
  });

  router.get("/api/system/health", (_req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  return router;
}
