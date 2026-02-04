import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, seedNavigationForTenant } from "./storage";
import { z } from "zod";
import { insertProjectSchema, insertWbsNodeSchema, insertTenantUserSchema } from "@shared/schema";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

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

const wbsTemplateNodeSchema: z.ZodType<any> = z.lazy(() => z.object({
  title: z.string(),
  description: z.string().optional(),
  codePath: z.string(),
  codeDisplay: z.string(),
  dimensions: z.record(z.any()).optional(),
  estimatedHours: z.number().optional(),
  children: z.array(wbsTemplateNodeSchema).optional(),
}));

const wbsTemplateCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  structure: z.array(wbsTemplateNodeSchema).optional(),
  tenantId: z.string().optional(),
});

const wbsTemplateUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  structure: z.array(wbsTemplateNodeSchema).optional(),
  isActive: z.boolean().optional(),
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
  
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/tenants", async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  app.get("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  app.patch("/api/tenants/:id", async (req, res) => {
    try {
      const tenant = await storage.updateTenant(req.params.id, req.body);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  app.post("/api/tenants", async (req, res) => {
    try {
      const { companyName, contactEmail } = req.body;
      if (!companyName) {
        return res.status(400).json({ error: "Company name is required" });
      }
      const subdomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
      const tenant = await storage.createTenant({
        subdomain,
        companyName,
        contactEmail: contactEmail || `admin@${subdomain}.com`,
        config: {
          branding: {
            primaryColor: "168 76% 36%",
            secondaryColor: "28 85% 52%",
            sidebarColor: "175 35% 15%",
            fontStyle: "elegant",
            logoUrl: null,
            faviconUrl: null,
          },
          modules: { hrSync: false, advancedWbs: true, documentTemplating: false },
          wbsDimensions: [
            { key: "phase", label: "Project Phase", required: true },
            { key: "trade", label: "Trade", required: true },
          ],
        },
        storageMode: "cloud",
        onboardingComplete: true,
        instanceStatus: "active",
      });
      
      await seedNavigationForTenant(tenant.id);
      
      res.status(201).json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  // Seed navigation for existing tenants that are missing items
  app.post("/api/tenants/:id/seed-navigation", async (req, res) => {
    try {
      const tenantId = req.params.id;
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      
      // Check if navigation already exists
      const existingNav = await storage.getNavigationItems(tenantId);
      if (existingNav.length > 0) {
        return res.status(400).json({ error: "Navigation already exists for this tenant", count: existingNav.length });
      }
      
      await seedNavigationForTenant(tenantId);
      const newNav = await storage.getNavigationItems(tenantId);
      res.json({ message: "Navigation seeded successfully", count: newNav.length });
    } catch (error) {
      console.error("Error seeding navigation:", error);
      res.status(500).json({ error: "Failed to seed navigation" });
    }
  });

  app.get("/api/navigation", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const items = await storage.getNavigationItems(tenantId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching navigation items:", error);
      res.status(500).json({ error: "Failed to fetch navigation items" });
    }
  });

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

  // WBS Templates API
  app.get("/api/wbs-templates", async (req, res) => {
    try {
      const tenantId = typeof req.query.tenantId === "string" 
        ? req.query.tenantId 
        : await getDefaultTenantId();
      const templates = await storage.getWbsTemplates(tenantId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching WBS templates:", error);
      res.status(500).json({ error: "Failed to fetch WBS templates" });
    }
  });

  app.get("/api/wbs-templates/:id", async (req, res) => {
    try {
      const tenantId = typeof req.query.tenantId === "string" 
        ? req.query.tenantId 
        : await getDefaultTenantId();
      const template = await storage.getWbsTemplate(req.params.id);
      if (!template || template.tenantId !== tenantId) {
        return res.status(404).json({ error: "WBS template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching WBS template:", error);
      res.status(500).json({ error: "Failed to fetch WBS template" });
    }
  });

  app.post("/api/wbs-templates", validateBody(wbsTemplateCreateSchema), async (req, res) => {
    try {
      const { name, description, category, structure, tenantId } = req.body;
      const finalTenantId = tenantId || await getDefaultTenantId();
      const template = await storage.createWbsTemplate({
        tenantId: finalTenantId,
        name,
        description,
        category,
        structure: structure || [],
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating WBS template:", error);
      res.status(500).json({ error: "Failed to create WBS template" });
    }
  });

  app.patch("/api/wbs-templates/:id", validateBody(wbsTemplateUpdateSchema), async (req, res) => {
    try {
      const tenantId = typeof req.query.tenantId === "string" 
        ? req.query.tenantId 
        : await getDefaultTenantId();
      const existing = await storage.getWbsTemplate(req.params.id);
      if (!existing || existing.tenantId !== tenantId) {
        return res.status(404).json({ error: "WBS template not found" });
      }
      const template = await storage.updateWbsTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating WBS template:", error);
      res.status(500).json({ error: "Failed to update WBS template" });
    }
  });

  app.delete("/api/wbs-templates/:id", async (req, res) => {
    try {
      const tenantId = typeof req.query.tenantId === "string" 
        ? req.query.tenantId 
        : await getDefaultTenantId();
      const existing = await storage.getWbsTemplate(req.params.id);
      if (!existing || existing.tenantId !== tenantId) {
        return res.status(404).json({ error: "WBS template not found" });
      }
      await storage.deleteWbsTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting WBS template:", error);
      res.status(500).json({ error: "Failed to delete WBS template" });
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

  const propagateSchema = z.object({
    oldKey: z.string().min(1),
    newKey: z.string().min(1),
    applyTo: z.enum(["all", "specific", "forward"]),
    projectIds: z.array(z.string()).optional(),
  });

  app.post("/api/dimensions/propagate", async (req, res) => {
    try {
      const parseResult = propagateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parseResult.error.flatten().fieldErrors 
        });
      }

      const { oldKey, newKey, applyTo, projectIds } = parseResult.data;
      const tenantId = await getDefaultTenantId();

      if (applyTo === "forward") {
        return res.json({ success: true, affectedNodes: 0, message: "Changes will apply to new projects only" });
      }

      let affectedNodes = 0;

      if (applyTo === "all") {
        const nodes = await storage.getWbsNodes(tenantId);
        for (const node of nodes) {
          const dimensions = node.dimensions as Record<string, any> || {};
          if (oldKey in dimensions) {
            const newDimensions = { ...dimensions };
            if (oldKey !== newKey) {
              newDimensions[newKey] = newDimensions[oldKey];
              delete newDimensions[oldKey];
            }
            await storage.updateWbsNode(node.id, { dimensions: newDimensions });
            affectedNodes++;
          }
        }
      } else if (applyTo === "specific" && projectIds?.length) {
        for (const projectId of projectIds) {
          const nodes = await storage.getWbsNodesByProject(projectId);
          for (const node of nodes) {
            const dimensions = node.dimensions as Record<string, any> || {};
            if (oldKey in dimensions) {
              const newDimensions = { ...dimensions };
              if (oldKey !== newKey) {
                newDimensions[newKey] = newDimensions[oldKey];
                delete newDimensions[oldKey];
              }
              await storage.updateWbsNode(node.id, { dimensions: newDimensions });
              affectedNodes++;
            }
          }
        }
      }

      res.json({ success: true, affectedNodes });
    } catch (error) {
      console.error("Error propagating dimension changes:", error);
      res.status(500).json({ error: "Failed to propagate dimension changes" });
    }
  });

  // ===== USER GROUPS =====
  
  // Get all user groups for a tenant
  app.get("/api/user-groups", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || (await getDefaultTenantId());
      const groups = await storage.getUserGroups(tenantId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
      res.status(500).json({ error: "Failed to fetch user groups" });
    }
  });

  // Get a single user group
  app.get("/api/user-groups/:id", async (req: Request, res: Response) => {
    try {
      const group = await storage.getUserGroup(req.params.id);
      if (!group) {
        return res.status(404).json({ error: "User group not found" });
      }
      res.json(group);
    } catch (error) {
      console.error("Error fetching user group:", error);
      res.status(500).json({ error: "Failed to fetch user group" });
    }
  });

  // Create a user group
  app.post("/api/user-groups", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        tenantId: z.string().min(1),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        isActive: z.boolean().optional(),
      });
      const data = schema.parse(req.body);
      const group = await storage.createUserGroup(data);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating user group:", error);
      res.status(500).json({ error: "Failed to create user group" });
    }
  });

  // Update a user group
  app.patch("/api/user-groups/:id", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        isActive: z.boolean().optional(),
      });
      const data = schema.parse(req.body);
      const group = await storage.updateUserGroup(req.params.id, data);
      if (!group) {
        return res.status(404).json({ error: "User group not found" });
      }
      res.json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating user group:", error);
      res.status(500).json({ error: "Failed to update user group" });
    }
  });

  // Delete a user group
  app.delete("/api/user-groups/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteUserGroup(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user group:", error);
      res.status(500).json({ error: "Failed to delete user group" });
    }
  });

  // ===== USER GROUP MEMBERS =====
  
  // Get members of a group
  app.get("/api/user-groups/:groupId/members", async (req: Request, res: Response) => {
    try {
      const members = await storage.getUserGroupMembers(req.params.groupId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ error: "Failed to fetch group members" });
    }
  });

  // Add a user to a group
  app.post("/api/user-groups/:groupId/members", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        tenantId: z.string().min(1),
        userId: z.string().min(1),
      });
      const data = schema.parse(req.body);
      const member = await storage.addUserToGroup({
        tenantId: data.tenantId,
        groupId: req.params.groupId,
        userId: data.userId,
      });
      res.status(201).json(member);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error adding user to group:", error);
      res.status(500).json({ error: "Failed to add user to group" });
    }
  });

  // Remove a user from a group
  app.delete("/api/user-groups/:groupId/members/:userId", async (req: Request, res: Response) => {
    try {
      await storage.removeUserFromGroup(req.params.groupId, req.params.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing user from group:", error);
      res.status(500).json({ error: "Failed to remove user from group" });
    }
  });

  // ===== GROUP PERMISSIONS =====
  
  // Get permissions for a group
  app.get("/api/user-groups/:groupId/permissions", async (req: Request, res: Response) => {
    try {
      const permissions = await storage.getGroupPermissions(req.params.groupId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching group permissions:", error);
      res.status(500).json({ error: "Failed to fetch group permissions" });
    }
  });

  // Set/update a permission for a group on a navigation item
  app.post("/api/user-groups/:groupId/permissions", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        tenantId: z.string().min(1),
        navigationItemId: z.string().min(1),
        canView: z.boolean().optional(),
        canCreate: z.boolean().optional(),
        canEdit: z.boolean().optional(),
        canDelete: z.boolean().optional(),
        inheritToChildren: z.boolean().optional(),
      });
      const data = schema.parse(req.body);
      const permission = await storage.setGroupPermission({
        tenantId: data.tenantId,
        groupId: req.params.groupId,
        navigationItemId: data.navigationItemId,
        canView: data.canView,
        canCreate: data.canCreate,
        canEdit: data.canEdit,
        canDelete: data.canDelete,
        inheritToChildren: data.inheritToChildren,
      });
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error setting group permission:", error);
      res.status(500).json({ error: "Failed to set group permission" });
    }
  });

  // Update a specific permission
  app.patch("/api/permissions/:id", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        canView: z.boolean().optional(),
        canCreate: z.boolean().optional(),
        canEdit: z.boolean().optional(),
        canDelete: z.boolean().optional(),
        inheritToChildren: z.boolean().optional(),
      });
      const data = schema.parse(req.body);
      const permission = await storage.updateGroupPermission(req.params.id, data);
      if (!permission) {
        return res.status(404).json({ error: "Permission not found" });
      }
      res.json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating permission:", error);
      res.status(500).json({ error: "Failed to update permission" });
    }
  });

  // Delete a permission
  app.delete("/api/permissions/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteGroupPermission(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting permission:", error);
      res.status(500).json({ error: "Failed to delete permission" });
    }
  });

  // ==================== DOCUMENT ENDPOINTS WITH KONG INTEGRATION ====================

  // Get all documents for a tenant
  app.get("/api/documents", async (req: Request, res: Response) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const documents = await storage.getDocuments(tenantId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Get a single document
  app.get("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.json(doc);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  // Get documents by project
  app.get("/api/projects/:projectId/documents", async (req: Request, res: Response) => {
    try {
      const documents = await storage.getDocumentsByProject(req.params.projectId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching project documents:", error);
      res.status(500).json({ error: "Failed to fetch project documents" });
    }
  });

  // Create a new document (with optional encryption via Kong)
  app.post("/api/documents", async (req: Request, res: Response) => {
    try {
      const { kongService } = await import("./kong-service");
      
      const schema = z.object({
        tenantId: z.string().min(1),
        projectId: z.string().optional(),
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        category: z.string().max(50).optional(),
        content: z.string().optional(),
        encrypt: z.boolean().optional(),
        encryptionMode: z.enum(["high_security", "balanced", "performance", "adaptive"]).optional(),
      });
      
      const data = schema.parse(req.body);
      
      let encryptedContent: string | null = null;
      let originalSize = 0;
      let compressedSize = 0;
      let savingsPercent = 0;
      let kongTimestamp: string | null = null;
      let checksum: string | null = null;
      
      // Get timestamp from Kong for audit trail
      try {
        const timestampResult = await kongService.getTimestamp();
        kongTimestamp = timestampResult.timestamp.humanReadable;
      } catch (e) {
        console.warn("Could not get Kong timestamp:", e);
      }
      
      // Track if encryption was attempted but failed
      let encryptionFailed = false;
      
      // Encrypt/compress if requested
      if (data.content && data.encrypt) {
        try {
          const mode = data.encryptionMode || "balanced";
          const encryptResult = await kongService.encryptData(data.content, mode);
          encryptedContent = JSON.stringify(encryptResult.encrypted);
          originalSize = encryptResult.originalSize;
          compressedSize = encryptResult.encryptedSize;
          savingsPercent = originalSize > 0 
            ? ((originalSize - compressedSize) / originalSize) * 100 
            : 0;
          checksum = encryptResult.encrypted.checksum;
        } catch (e) {
          console.warn("Kong encryption failed, falling back to unencrypted storage:", e);
          encryptionFailed = true;
          // Still calculate original size for unencrypted storage
          originalSize = Buffer.byteLength(data.content, 'utf8');
        }
      } else if (data.content) {
        originalSize = Buffer.byteLength(data.content, 'utf8');
      }
      
      // Determine what content to store - ALWAYS preserve content
      const storeEncrypted = !!encryptedContent;
      const storedPlainContent = storeEncrypted ? null : data.content;
      
      const doc = await storage.createDocument({
        tenantId: data.tenantId,
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        category: data.category,
        status: storeEncrypted ? "encrypted" : "draft",
        originalSizeBytes: originalSize,
        compressedSizeBytes: compressedSize > 0 ? compressedSize : null,
        isEncrypted: storeEncrypted,
        encryptionMode: storeEncrypted ? (data.encryptionMode || "balanced") : null,
        encryptedContent: encryptedContent,
        plainContent: storedPlainContent,
        checksum: checksum,
        kongTimestamp: kongTimestamp,
        savingsPercent: savingsPercent > 0 ? String(savingsPercent.toFixed(2)) : null,
      });
      
      // Include encryption status in response
      const response: any = { ...doc };
      if (encryptionFailed) {
        response.encryptionFailed = true;
        response.message = "Kong encryption unavailable, document stored unencrypted";
      }
      
      res.status(201).json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Failed to create document" });
    }
  });

  // Decrypt a document (fetch decrypted content)
  app.get("/api/documents/:id/decrypt", async (req: Request, res: Response) => {
    try {
      const { kongService } = await import("./kong-service");
      
      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      if (!doc.isEncrypted || !doc.encryptedContent) {
        return res.json({ content: doc.plainContent, encrypted: false });
      }
      
      try {
        const encrypted = JSON.parse(doc.encryptedContent);
        const decryptResult = await kongService.decryptData(encrypted);
        res.json({ 
          content: decryptResult.data, 
          encrypted: true,
          mode: decryptResult.mode 
        });
      } catch (e) {
        console.error("Decryption failed:", e);
        res.status(500).json({ error: "Failed to decrypt document" });
      }
    } catch (error) {
      console.error("Error decrypting document:", error);
      res.status(500).json({ error: "Failed to decrypt document" });
    }
  });

  // Update a document
  app.patch("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).optional(),
        category: z.string().max(50).optional(),
        status: z.enum(["draft", "pending_review", "approved", "archived", "encrypted"]).optional(),
        projectId: z.string().nullable().optional(),
      });
      
      const data = schema.parse(req.body);
      const doc = await storage.updateDocument(req.params.id, data);
      
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      res.json(doc);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // Delete a document
  app.delete("/api/documents/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteDocument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Document not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // ==================== WBS MASTER CODES (13-Dimensional) ====================

  // List WBS master codes by tenant (optionally filter by dimension type)
  app.get("/api/wbs-codes", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string || await getDefaultTenantId();
      const dimensionType = req.query.dimensionType as string | undefined;
      const codes = await storage.getWbsMasterCodes(tenantId, dimensionType);
      res.json(codes);
    } catch (error) {
      console.error("Error fetching WBS codes:", error);
      res.status(500).json({ error: "Failed to fetch WBS codes" });
    }
  });

  // Get a single WBS master code
  app.get("/api/wbs-codes/:id", async (req: Request, res: Response) => {
    try {
      const code = await storage.getWbsMasterCode(req.params.id);
      if (!code) {
        return res.status(404).json({ error: "WBS code not found" });
      }
      res.json(code);
    } catch (error) {
      console.error("Error fetching WBS code:", error);
      res.status(500).json({ error: "Failed to fetch WBS code" });
    }
  });

  // Create WBS master code
  app.post("/api/wbs-codes", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        tenantId: z.string().uuid().optional(),
        dimensionType: z.string().min(1).max(50),
        code: z.string().min(1).max(50),
        name: z.string().min(1).max(200),
        description: z.string().max(500).optional(),
        parentCodeId: z.string().uuid().nullable().optional(),
        sortOrder: z.number().int().optional(),
        metadata: z.record(z.any()).optional(),
      });
      
      const data = schema.parse(req.body);
      const tenantId = data.tenantId || await getDefaultTenantId();
      
      const newCode = await storage.createWbsMasterCode({
        ...data,
        tenantId,
      });
      
      res.status(201).json(newCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating WBS code:", error);
      res.status(500).json({ error: "Failed to create WBS code" });
    }
  });

  // Update WBS master code
  app.patch("/api/wbs-codes/:id", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        code: z.string().min(1).max(50).optional(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(500).nullable().optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
        metadata: z.record(z.any()).optional(),
      });
      
      const data = schema.parse(req.body);
      const updated = await storage.updateWbsMasterCode(req.params.id, data);
      
      if (!updated) {
        return res.status(404).json({ error: "WBS code not found" });
      }
      
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error updating WBS code:", error);
      res.status(500).json({ error: "Failed to update WBS code" });
    }
  });

  // Delete (soft-delete) WBS master code
  app.delete("/api/wbs-codes/:id", async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteWbsMasterCode(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "WBS code not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting WBS code:", error);
      res.status(500).json({ error: "Failed to delete WBS code" });
    }
  });

  // ==================== DOCUMENT META TAGS ====================

  // Get meta tags for a document
  app.get("/api/documents/:id/meta-tags", async (req: Request, res: Response) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const tags = await storage.getDocumentMetaTags(req.params.id);
      res.json(tags);
    } catch (error) {
      console.error("Error fetching document meta tags:", error);
      res.status(500).json({ error: "Failed to fetch meta tags" });
    }
  });

  // Set meta tags for a document (replaces all existing tags)
  app.put("/api/documents/:id/meta-tags", async (req: Request, res: Response) => {
    try {
      const doc = await storage.getDocument(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      const schema = z.object({
        tags: z.array(z.object({
          dimensionType: z.string().min(1).max(50),
          wbsCodeId: z.string().uuid().nullable().optional(),
          customValue: z.string().max(200).nullable().optional(),
        })),
      });
      
      const data = schema.parse(req.body);
      const savedTags = await storage.setDocumentMetaTags(req.params.id, data.tags);
      
      res.json(savedTags);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error setting document meta tags:", error);
      res.status(500).json({ error: "Failed to set meta tags" });
    }
  });

  // Filter documents by meta tags
  app.post("/api/documents/filter", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        tenantId: z.string().uuid().optional(),
        filters: z.record(z.array(z.string())), // { dimensionType: [codeId1, codeId2] }
      });
      
      const data = schema.parse(req.body);
      const tenantId = data.tenantId || await getDefaultTenantId();
      
      const documents = await storage.getDocumentsWithMetaTags(tenantId, data.filters);
      res.json(documents);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error filtering documents:", error);
      res.status(500).json({ error: "Failed to filter documents" });
    }
  });

  // Seed default WBS master codes for a tenant
  app.post("/api/wbs-codes/seed/:tenantId", async (req: Request, res: Response) => {
    try {
      const tenantId = req.params.tenantId;
      
      // Default WBS codes for each of the 13 dimensions
      const defaultCodes = [
        // Phase dimension
        { dimensionType: "phase", code: "PRE", name: "Pre-Construction", sortOrder: 1 },
        { dimensionType: "phase", code: "CON", name: "Construction", sortOrder: 2 },
        { dimensionType: "phase", code: "CLO", name: "Close-Out", sortOrder: 3 },
        { dimensionType: "phase", code: "WAR", name: "Warranty", sortOrder: 4 },
        
        // Trade dimension (CSI MasterFormat)
        { dimensionType: "trade", code: "03", name: "Concrete", sortOrder: 1 },
        { dimensionType: "trade", code: "04", name: "Masonry", sortOrder: 2 },
        { dimensionType: "trade", code: "05", name: "Metals", sortOrder: 3 },
        { dimensionType: "trade", code: "06", name: "Wood & Plastics", sortOrder: 4 },
        { dimensionType: "trade", code: "07", name: "Thermal & Moisture", sortOrder: 5 },
        { dimensionType: "trade", code: "08", name: "Doors & Windows", sortOrder: 6 },
        { dimensionType: "trade", code: "09", name: "Finishes", sortOrder: 7 },
        { dimensionType: "trade", code: "15", name: "Mechanical", sortOrder: 8 },
        { dimensionType: "trade", code: "16", name: "Electrical", sortOrder: 9 },
        
        // Location dimension
        { dimensionType: "location", code: "SITE", name: "Site Work", sortOrder: 1 },
        { dimensionType: "location", code: "BLDG-A", name: "Building A", sortOrder: 2 },
        { dimensionType: "location", code: "BLDG-B", name: "Building B", sortOrder: 3 },
        { dimensionType: "location", code: "PARKING", name: "Parking Structure", sortOrder: 4 },
        
        // Building dimension
        { dimensionType: "building", code: "MAIN", name: "Main Building", sortOrder: 1 },
        { dimensionType: "building", code: "ANNEX", name: "Annex", sortOrder: 2 },
        { dimensionType: "building", code: "GARAGE", name: "Garage", sortOrder: 3 },
        
        // Level dimension
        { dimensionType: "level", code: "B1", name: "Basement Level 1", sortOrder: 1 },
        { dimensionType: "level", code: "L1", name: "Level 1 (Ground)", sortOrder: 2 },
        { dimensionType: "level", code: "L2", name: "Level 2", sortOrder: 3 },
        { dimensionType: "level", code: "L3", name: "Level 3", sortOrder: 4 },
        { dimensionType: "level", code: "ROOF", name: "Roof Level", sortOrder: 5 },
        
        // Zone dimension
        { dimensionType: "zone", code: "Z-A", name: "Zone A (North)", sortOrder: 1 },
        { dimensionType: "zone", code: "Z-B", name: "Zone B (South)", sortOrder: 2 },
        { dimensionType: "zone", code: "Z-C", name: "Zone C (East)", sortOrder: 3 },
        { dimensionType: "zone", code: "Z-D", name: "Zone D (West)", sortOrder: 4 },
        
        // System dimension
        { dimensionType: "system", code: "HVAC", name: "HVAC System", sortOrder: 1 },
        { dimensionType: "system", code: "PLUM", name: "Plumbing System", sortOrder: 2 },
        { dimensionType: "system", code: "ELEC", name: "Electrical System", sortOrder: 3 },
        { dimensionType: "system", code: "FIRE", name: "Fire Protection", sortOrder: 4 },
        { dimensionType: "system", code: "STRUCT", name: "Structural", sortOrder: 5 },
        
        // Subsystem dimension
        { dimensionType: "subsystem", code: "LIGHT", name: "Lighting", sortOrder: 1 },
        { dimensionType: "subsystem", code: "POWER", name: "Power Distribution", sortOrder: 2 },
        { dimensionType: "subsystem", code: "CTRL", name: "Controls & Automation", sortOrder: 3 },
        { dimensionType: "subsystem", code: "DATA", name: "Data & Communications", sortOrder: 4 },
        
        // Element Type dimension
        { dimensionType: "element_type", code: "WALL", name: "Wall", sortOrder: 1 },
        { dimensionType: "element_type", code: "FLOOR", name: "Floor", sortOrder: 2 },
        { dimensionType: "element_type", code: "CEIL", name: "Ceiling", sortOrder: 3 },
        { dimensionType: "element_type", code: "DOOR", name: "Door", sortOrder: 4 },
        { dimensionType: "element_type", code: "WIN", name: "Window", sortOrder: 5 },
        { dimensionType: "element_type", code: "FIXT", name: "Fixture", sortOrder: 6 },
        
        // Material dimension
        { dimensionType: "material", code: "CONC", name: "Concrete", sortOrder: 1 },
        { dimensionType: "material", code: "STL", name: "Steel", sortOrder: 2 },
        { dimensionType: "material", code: "WOOD", name: "Wood", sortOrder: 3 },
        { dimensionType: "material", code: "GLS", name: "Glass", sortOrder: 4 },
        { dimensionType: "material", code: "ALUM", name: "Aluminum", sortOrder: 5 },
        
        // Work Package dimension
        { dimensionType: "work_package", code: "WP-001", name: "Foundation Package", sortOrder: 1 },
        { dimensionType: "work_package", code: "WP-002", name: "Framing Package", sortOrder: 2 },
        { dimensionType: "work_package", code: "WP-003", name: "MEP Rough-In", sortOrder: 3 },
        { dimensionType: "work_package", code: "WP-004", name: "Interior Finishes", sortOrder: 4 },
        
        // Cost Code dimension
        { dimensionType: "cost_code", code: "CC-100", name: "General Conditions", sortOrder: 1 },
        { dimensionType: "cost_code", code: "CC-200", name: "Site Work", sortOrder: 2 },
        { dimensionType: "cost_code", code: "CC-300", name: "Structure", sortOrder: 3 },
        { dimensionType: "cost_code", code: "CC-400", name: "Exterior", sortOrder: 4 },
        { dimensionType: "cost_code", code: "CC-500", name: "Interior", sortOrder: 5 },
        
        // Responsibility dimension
        { dimensionType: "responsibility", code: "GC", name: "General Contractor", sortOrder: 1 },
        { dimensionType: "responsibility", code: "OWNER", name: "Owner", sortOrder: 2 },
        { dimensionType: "responsibility", code: "ARCH", name: "Architect", sortOrder: 3 },
        { dimensionType: "responsibility", code: "ENG", name: "Engineer", sortOrder: 4 },
        { dimensionType: "responsibility", code: "SUB", name: "Subcontractor", sortOrder: 5 },
      ];
      
      const createdCodes = [];
      for (const codeData of defaultCodes) {
        const code = await storage.createWbsMasterCode({
          tenantId,
          ...codeData,
        });
        createdCodes.push(code);
      }
      
      res.status(201).json({ 
        message: `Created ${createdCodes.length} WBS master codes`,
        codes: createdCodes 
      });
    } catch (error) {
      console.error("Error seeding WBS codes:", error);
      res.status(500).json({ error: "Failed to seed WBS codes" });
    }
  });

  // ==================== KONG SERVICE ENDPOINTS ====================

  // Get Kong timestamp (useful for auditing)
  app.get("/api/kong/timestamp", async (req: Request, res: Response) => {
    try {
      const { kongService } = await import("./kong-service");
      const result = await kongService.getTimestamp();
      res.json(result);
    } catch (error) {
      console.error("Error fetching Kong timestamp:", error);
      res.status(500).json({ error: "Failed to fetch timestamp from Kong" });
    }
  });

  // Get Kong demo stats (compression statistics)
  app.get("/api/kong/stats", async (req: Request, res: Response) => {
    try {
      const { kongService } = await import("./kong-service");
      const result = await kongService.getDemoStats();
      res.json(result);
    } catch (error) {
      console.error("Error fetching Kong stats:", error);
      res.status(500).json({ error: "Failed to fetch stats from Kong" });
    }
  });

  // Get Kong API documentation
  app.get("/api/kong/docs", async (req: Request, res: Response) => {
    try {
      const { kongService } = await import("./kong-service");
      const result = await kongService.getApiDocs();
      res.json(result);
    } catch (error) {
      console.error("Error fetching Kong docs:", error);
      res.status(500).json({ error: "Failed to fetch docs from Kong" });
    }
  });

  // Get phase configuration
  app.get("/api/kong/phase-config/:mode", async (req: Request, res: Response) => {
    try {
      const { kongService } = await import("./kong-service");
      const mode = req.params.mode as "high_security" | "balanced" | "performance" | "adaptive";
      const result = await kongService.getPhaseConfig(mode);
      res.json(result);
    } catch (error) {
      console.error("Error fetching Kong phase config:", error);
      res.status(500).json({ error: "Failed to fetch phase config from Kong" });
    }
  });

  // Copy Master WBS Codes to Project - creates WBS nodes from master codes
  app.post("/api/projects/:projectId/copy-master-wbs", async (req: Request, res: Response) => {
    try {
      const projectId = req.params.projectId;
      const tenantId = req.query.tenantId as string;
      
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId is required" });
      }
      
      // Get the project to verify it exists and belongs to the tenant
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Verify project belongs to the tenant for security
      if (project.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied: project does not belong to this tenant" });
      }
      
      // Get all master codes for the tenant
      const masterCodes = await storage.getWbsMasterCodes(tenantId);
      if (!masterCodes || masterCodes.length === 0) {
        return res.status(400).json({ error: "No master codes found. Please seed default codes first." });
      }
      
      // Create WBS nodes for ALL master codes
      const createdNodes: any[] = [];
      let orderIndex = 1;
      
      for (const code of masterCodes) {
        const node = await storage.createWbsNode({
          tenantId,
          projectId,
          title: code.name,
          description: code.description || `${code.dimensionType}: ${code.code}`,
          status: "not_started",
          codePath: `${code.dimensionType}_${code.code}`,
          codeDisplay: code.code,
          dimensions: { [code.dimensionType]: code.code },
          orderIndex: orderIndex++,
        });
        createdNodes.push(node);
      }
      
      res.json({ 
        message: `Created ${createdNodes.length} WBS nodes from ${masterCodes.length} master codes`,
        nodes: createdNodes 
      });
    } catch (error) {
      console.error("Error copying master WBS to project:", error);
      res.status(500).json({ error: "Failed to copy master WBS codes" });
    }
  });

  return httpServer;
}
