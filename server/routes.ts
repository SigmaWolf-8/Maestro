import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { createTenantsRouter } from "./api/tenants";
import { createProjectsRouter } from "./api/projects";
import { createPeopleRouter } from "./api/people";
import { createDocumentsRouter } from "./api/documents";
import { createMicrosoftRouter } from "./api/microsoft";
import { createWopiRouter } from "./api/wopi";
import { createIntelligenceRouter } from "./api/intelligence";
import { createSubscriptionsRouter } from "./api/subscriptions";
import { createBillingRouter } from "./api/billing";
import { createAdminPricingRouter } from "./api/admin-pricing";
import { createPlenumNetRouter } from "./api/plenumnet";
import { createStripeRouter } from "./api/stripe";
import { createSystemRouter } from "./api/system";
import { requestLogger, errorHandler } from "./middleware/request-logger";
import { globalApiLimiter, authLimiter, plenumnetLimiter, webhookLimiter } from "./middleware/rate-limiter";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(requestLogger);

  app.use("/api/", globalApiLimiter);
  app.use("/api/login", authLimiter);
  app.use("/api/auth", authLimiter);
  app.use("/api/plenumnet/", plenumnetLimiter);
  app.use("/api/stripe/webhook", webhookLimiter);

  await setupAuth(app);
  registerAuthRoutes(app);

  app.use(createTenantsRouter());
  app.use(createProjectsRouter());
  app.use(createPeopleRouter());
  app.use(createDocumentsRouter());
  app.use(createMicrosoftRouter());
  app.use(createWopiRouter());
  app.use(createIntelligenceRouter());
  app.use(createSubscriptionsRouter());
  app.use(createBillingRouter());
  app.use(createAdminPricingRouter());
  app.use(createPlenumNetRouter());
  app.use(createStripeRouter());
  app.use(createSystemRouter());

  app.use(errorHandler);

  return httpServer;
}
