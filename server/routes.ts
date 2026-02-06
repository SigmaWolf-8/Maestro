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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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

  return httpServer;
}
