import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertProjectSchema, insertWbsNodeSchema, insertTenantUserSchema } from "@shared/schema";

let cachedTenantId: string | null = null;

async function getDefaultTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;
  const tenant = await storage.getTenantBySubdomain("acme");
  cachedTenantId = tenant?.id || "";
  return cachedTenantId;
}

const projectCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(["not_started", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
  budget: z.union([z.string(), z.number()]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const projectUpdateSchema = projectCreateSchema.partial();

const wbsCreateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(["not_started", "in_progress", "on_hold", "completed", "cancelled"]).optional(),
  projectId: z.string().min(1),
  parentId: z.string().optional(),
  estimatedHours: z.union([z.string(), z.number()]).optional(),
  estimatedCost: z.union([z.string(), z.number()]).optional(),
});

const wbsUpdateSchema = wbsCreateSchema.partial();

const teamMemberCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "project_manager", "accountant", "viewer"]).optional(),
  profile: z.object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    jobTitle: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
  }).optional(),
});

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: result.error.flatten().fieldErrors 
      });
    }
    req.body = result.data;
    next();
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const tenantId = await getDefaultTenantId();
      const stats = await storage.getDashboardStats(tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      const tenantId = await getDefaultTenantId();
      const projects = await storage.getProjects(tenantId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", validateBody(projectCreateSchema), async (req, res) => {
    try {
      const tenantId = await getDefaultTenantId();
      const project = await storage.createProject({
        ...req.body,
        tenantId,
      });
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", validateBody(projectUpdateSchema), async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  app.get("/api/wbs", async (req, res) => {
    try {
      const tenantId = await getDefaultTenantId();
      const projectId = req.query.projectId as string | undefined;
      
      let nodes;
      if (projectId) {
        nodes = await storage.getWbsNodesByProject(projectId);
      } else {
        nodes = await storage.getWbsNodes(tenantId);
      }
      res.json(nodes);
    } catch (error) {
      console.error("Error fetching WBS nodes:", error);
      res.status(500).json({ error: "Failed to fetch WBS nodes" });
    }
  });

  app.get("/api/wbs/:id", async (req, res) => {
    try {
      const node = await storage.getWbsNode(req.params.id);
      if (!node) {
        return res.status(404).json({ error: "WBS node not found" });
      }
      res.json(node);
    } catch (error) {
      console.error("Error fetching WBS node:", error);
      res.status(500).json({ error: "Failed to fetch WBS node" });
    }
  });

  app.post("/api/wbs", validateBody(wbsCreateSchema), async (req, res) => {
    try {
      const tenantId = await getDefaultTenantId();
      const node = await storage.createWbsNode({
        ...req.body,
        tenantId,
      });
      res.status(201).json(node);
    } catch (error) {
      console.error("Error creating WBS node:", error);
      res.status(500).json({ error: "Failed to create WBS node" });
    }
  });

  app.patch("/api/wbs/:id", validateBody(wbsUpdateSchema), async (req, res) => {
    try {
      const node = await storage.updateWbsNode(req.params.id, req.body);
      if (!node) {
        return res.status(404).json({ error: "WBS node not found" });
      }
      res.json(node);
    } catch (error) {
      console.error("Error updating WBS node:", error);
      res.status(500).json({ error: "Failed to update WBS node" });
    }
  });

  app.delete("/api/wbs/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteWbsNode(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "WBS node not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting WBS node:", error);
      res.status(500).json({ error: "Failed to delete WBS node" });
    }
  });

  app.get("/api/team", async (req, res) => {
    try {
      const tenantId = await getDefaultTenantId();
      const users = await storage.getTenantUsers(tenantId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.get("/api/team/:id", async (req, res) => {
    try {
      const user = await storage.getTenantUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/team", validateBody(teamMemberCreateSchema), async (req, res) => {
    try {
      const tenantId = await getDefaultTenantId();
      const user = await storage.createTenantUser({
        ...req.body,
        tenantId,
      });
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/navigation", async (req, res) => {
    try {
      const tenantId = await getDefaultTenantId();
      const items = await storage.getNavigationItems(tenantId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching navigation:", error);
      res.status(500).json({ error: "Failed to fetch navigation" });
    }
  });

  app.get("/api/tenant", async (req, res) => {
    try {
      const tenant = await storage.getTenantBySubdomain("acme");
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  return httpServer;
}
