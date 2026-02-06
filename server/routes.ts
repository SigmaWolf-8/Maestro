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

  return httpServer;
}
