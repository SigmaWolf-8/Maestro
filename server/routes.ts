import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, seedNavigationForTenant } from "./storage";
import { z } from "zod";
import { insertProjectSchema, insertWbsNodeSchema, insertTenantUserSchema, type Customer, type VendorContact, type TenantUser } from "@shared/schema";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import * as microsoftGraph from "./microsoft-graph";
import nodemailer from "nodemailer";

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

// Customers & Quotes schemas (from MS Access VBA form)
const customerCreateSchema = z.object({
  tenantId: z.string(),
  jobNum: z.number().int(),
  address: z.string().optional(),
  city: z.string().optional(),
  stateProvince: z.string().optional(),
  zipPostalCode: z.string().optional(),
  countryRegion: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  webPage: z.string().optional(),
  homePhone: z.string().optional(),
});

const customerFieldUpdateSchema = z.object({
  tenantId: z.string(),
  jobNum: z.number().int(),
  field: z.string(),
  value: z.any(),
});

const quoteCreateSchema = z.object({
  tenantId: z.string(),
  jobNum: z.number().int(),
  qNum: z.string().optional(),
  customer: z.string().optional(),
  dateOfQuote: z.string().optional(),
  division: z.string().optional(),
  model: z.string().optional(),
  projectAddress: z.string().optional(),
  lot: z.string().optional(),
  block: z.string().optional(),
  plan: z.string().optional(),
  main: z.union([z.string(), z.number()]).optional(),
  upper: z.union([z.string(), z.number()]).optional(),
  low: z.union([z.string(), z.number()]).optional(),
  gar: z.union([z.string(), z.number()]).optional(),
  dp: z.union([z.string(), z.number()]).optional(),
  bp: z.union([z.string(), z.number()]).optional(),
  dgbp: z.union([z.string(), z.number()]).optional(),
});

const quoteFieldUpdateSchema = z.object({
  tenantId: z.string(),
  jobNum: z.number().int(),
  field: z.string(),
  value: z.any(),
});

// Vendors & Contacts schemas (from MS Access SalviVendors VBA form)
const vendorCreateSchema = z.object({
  tenantId: z.string(),
  company: z.string().min(1),
  vendorId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  stateProvince: z.string().optional(),
  zipPostalCode: z.string().optional(),
  countryRegion: z.string().optional(),
  apTerms: z.string().optional(),
  arTerms: z.string().optional(),
  gstNum: z.string().optional(),
  wcbNum: z.string().optional(),
  insuranceCert: z.string().optional(),
  matVendor: z.boolean().optional(),
  subtrade: z.boolean().optional(),
  includeInPayroll: z.boolean().optional(),
  rateReliability: z.number().min(1).max(5).nullable().optional(),
  rateQuality: z.number().min(1).max(5).nullable().optional(),
  rateSpeed: z.number().min(1).max(5).nullable().optional(),
  ratePricing: z.number().min(1).max(5).nullable().optional(),
  rateCongeniality: z.number().min(1).max(5).nullable().optional(),
});

const vendorUpdateSchema = vendorCreateSchema.partial().omit({ tenantId: true });

const vendorFieldUpdateSchema = z.object({
  field: z.string(),
  value: z.any(),
});

const vendorContactCreateSchema = z.object({
  tenantId: z.string(),
  vendorId: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  jobTitle: z.string().optional(),
  businessPhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  emailAddress: z.string().email().optional().or(z.literal('')),
  isPrimary: z.boolean().optional(),
});

const vendorContactUpdateSchema = vendorContactCreateSchema.partial().omit({ tenantId: true, vendorId: true });

const emailSendSchema = z.object({
  to: z.string().min(1, "Recipient email is required").email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string(),
  cc: z.string().email().optional().or(z.literal("")),
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

  // ==================== CUSTOMERS API (MS Access VBA Form Recreation) ====================
  
  // Get all customers for tenant
  app.get("/api/customers", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const customers = await storage.getCustomers(tenantId);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Get customer by job number (like VBA JobNum_AfterUpdate)
  app.get("/api/customers/job/:jobNum", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const jobNum = parseInt(req.params.jobNum, 10);
      if (isNaN(jobNum)) {
        return res.status(400).json({ error: "Invalid job number" });
      }
      const customer = await storage.getCustomerByJobNum(tenantId, jobNum);
      const quote = await storage.getQuoteByJobNum(tenantId, jobNum);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json({ customer, quote });
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  });

  // Create customer
  app.post("/api/customers", validateBody(customerCreateSchema), async (req, res) => {
    try {
      const customer = await storage.createCustomer(req.body);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  });

  // Update single customer field (like VBA AfterUpdate events)
  app.patch("/api/customers/field", validateBody(customerFieldUpdateSchema), async (req, res) => {
    try {
      const { tenantId, jobNum, field, value } = req.body;
      const updated = await storage.updateCustomerField(tenantId, jobNum, field, value);
      if (!updated) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating customer field:", error);
      res.status(500).json({ error: "Failed to update customer field" });
    }
  });

  // Update customer by ID
  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const updated = await storage.updateCustomer(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Customer not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  });

  // Delete customer
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ error: "Failed to delete customer" });
    }
  });

  // Seed sample customers (for testing)
  app.post("/api/customers/seed", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      
      const sampleCustomers = [
        { tenantId, jobNum: 1001, firstName: "John", lastName: "Smith", address: "123 Main St", city: "Calgary", stateProvince: "AB", zipPostalCode: "T2P 1A1", countryRegion: "Canada", homePhone: "(403) 555-1234" },
        { tenantId, jobNum: 1002, firstName: "Sarah", lastName: "Johnson", address: "456 Oak Ave", city: "Edmonton", stateProvince: "AB", zipPostalCode: "T5H 2B2", countryRegion: "Canada", homePhone: "(780) 555-5678" },
        { tenantId, jobNum: 1003, firstName: "Michael", lastName: "Williams", address: "789 Pine Rd", city: "Vancouver", stateProvince: "BC", zipPostalCode: "V6B 3C3", countryRegion: "Canada", homePhone: "(604) 555-9012" },
      ];
      
      const sampleQuotes = [
        { tenantId, jobNum: 1001, qNum: "Q-2026-001", customer: "John Smith", division: "Residential", model: "The Parkview", projectAddress: "Lot 15, Block 3, Parkland", lot: "15", block: "3", plan: "Plan A", main: "1200", upper: "800", low: "0", gar: "400" },
        { tenantId, jobNum: 1002, qNum: "Q-2026-002", customer: "Sarah Johnson", division: "Residential", model: "The Sunrise", projectAddress: "Lot 22, Block 5, Sunrise Valley", lot: "22", block: "5", plan: "Plan B", main: "1500", upper: "1000", low: "500", gar: "450" },
        { tenantId, jobNum: 1003, qNum: "Q-2026-003", customer: "Michael Williams", division: "Commercial", model: "Business Center", projectAddress: "123 Commerce Blvd", lot: "1", block: "A", plan: "Commercial", main: "5000", upper: "0", low: "0", gar: "0" },
      ];
      
      for (const c of sampleCustomers) {
        const existing = await storage.getCustomerByJobNum(tenantId, c.jobNum);
        if (!existing) {
          await storage.createCustomer(c);
        }
      }
      
      for (const q of sampleQuotes) {
        const existing = await storage.getQuoteByJobNum(tenantId, q.jobNum);
        if (!existing) {
          await storage.createQuote(q);
        }
      }
      
      res.json({ success: true, message: "Sample customers and quotes seeded" });
    } catch (error) {
      console.error("Error seeding customers:", error);
      res.status(500).json({ error: "Failed to seed customers" });
    }
  });

  // ==================== QUOTES API (MS Access VBA Form Recreation) ====================
  
  // Get all quotes for tenant
  app.get("/api/quotes", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const quotes = await storage.getQuotes(tenantId);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch quotes" });
    }
  });

  // Get quote by job number
  app.get("/api/quotes/job/:jobNum", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const jobNum = parseInt(req.params.jobNum, 10);
      if (isNaN(jobNum)) {
        return res.status(400).json({ error: "Invalid job number" });
      }
      const quote = await storage.getQuoteByJobNum(tenantId, jobNum);
      if (!quote) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  // Create quote
  app.post("/api/quotes", validateBody(quoteCreateSchema), async (req, res) => {
    try {
      const quoteData = {
        ...req.body,
        dateOfQuote: req.body.dateOfQuote ? new Date(req.body.dateOfQuote) : undefined,
      };
      const quote = await storage.createQuote(quoteData);
      res.status(201).json(quote);
    } catch (error) {
      console.error("Error creating quote:", error);
      res.status(500).json({ error: "Failed to create quote" });
    }
  });

  // Update single quote field (like VBA AfterUpdate events)
  app.patch("/api/quotes/field", validateBody(quoteFieldUpdateSchema), async (req, res) => {
    try {
      const { tenantId, jobNum, field, value } = req.body;
      const updated = await storage.updateQuoteField(tenantId, jobNum, field, value);
      if (!updated) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating quote field:", error);
      res.status(500).json({ error: "Failed to update quote field" });
    }
  });

  // Update quote by ID
  app.patch("/api/quotes/:id", async (req, res) => {
    try {
      const updated = await storage.updateQuote(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Quote not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ error: "Failed to update quote" });
    }
  });

  // Delete quote
  app.delete("/api/quotes/:id", async (req, res) => {
    try {
      await storage.deleteQuote(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ error: "Failed to delete quote" });
    }
  });

  // ==================== VENDORS API (MS Access SalviVendors Form Recreation) ====================

  // Get all vendors for tenant
  app.get("/api/vendors", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const vendorList = await storage.getVendors(tenantId);
      res.json(vendorList);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      res.status(500).json({ error: "Failed to fetch vendors" });
    }
  });

  // Get vendor by ID with contacts
  app.get("/api/vendors/:id", async (req, res) => {
    try {
      const vendor = await storage.getVendor(req.params.id);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      const contacts = await storage.getVendorContacts(req.params.id);
      const primaryContact = contacts.find(c => c.isPrimary) || null;
      res.json({ vendor, contacts, primaryContact });
    } catch (error) {
      console.error("Error fetching vendor:", error);
      res.status(500).json({ error: "Failed to fetch vendor" });
    }
  });

  // Create vendor
  app.post("/api/vendors", validateBody(vendorCreateSchema), async (req, res) => {
    try {
      const vendor = await storage.createVendor(req.body);
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Error creating vendor:", error);
      res.status(500).json({ error: "Failed to create vendor" });
    }
  });

  // Update vendor
  app.patch("/api/vendors/:id", validateBody(vendorUpdateSchema), async (req, res) => {
    try {
      const vendor = await storage.updateVendor(req.params.id, req.body);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor:", error);
      res.status(500).json({ error: "Failed to update vendor" });
    }
  });

  // Update vendor field (for auto-save)
  app.patch("/api/vendors/:id/field", validateBody(vendorFieldUpdateSchema), async (req, res) => {
    try {
      const { field, value } = req.body;
      const vendor = await storage.updateVendorField(req.params.id, field, value);
      if (!vendor) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      console.error("Error updating vendor field:", error);
      res.status(500).json({ error: "Failed to update vendor field" });
    }
  });

  // Delete vendor
  app.delete("/api/vendors/:id", async (req, res) => {
    try {
      await storage.deleteVendor(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting vendor:", error);
      res.status(500).json({ error: "Failed to delete vendor" });
    }
  });

  // Seed sample vendors
  app.post("/api/vendors/seed", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      
      const sampleVendors = [
        { tenantId, company: "ABC Supply Co.", vendorId: "V0001", address: "100 Industrial Blvd", city: "Calgary", stateProvince: "AB", zipPostalCode: "T2E 1K5", countryRegion: "Canada", matVendor: true, subtrade: false, apTerms: "Net 30", arTerms: "DOR - Due on Receipt" },
        { tenantId, company: "Elite Electrical Ltd.", vendorId: "V0002", address: "250 Trade Way", city: "Edmonton", stateProvince: "AB", zipPostalCode: "T5J 2L8", countryRegion: "Canada", matVendor: false, subtrade: true, apTerms: "Net 15", arTerms: "DOR - Due on Receipt", wcbNum: "WCB-12345", includeInPayroll: true },
        { tenantId, company: "Premium Plumbing Services", vendorId: "V0003", address: "75 Service Rd", city: "Red Deer", stateProvince: "AB", zipPostalCode: "T4N 3X2", countryRegion: "Canada", matVendor: false, subtrade: true, apTerms: "Net 30", arTerms: "Net 30", gstNum: "GST-98765" },
      ];
      
      for (const v of sampleVendors) {
        const existing = await storage.getVendorByCompany(tenantId, v.company);
        if (!existing) {
          const vendor = await storage.createVendor(v);
          const domain = v.company.toLowerCase().replace(/[^a-z0-9]/g, '');
          await storage.createVendorContact({
            tenantId,
            vendorId: vendor.id,
            firstName: "Primary",
            lastName: "Contact",
            jobTitle: "Account Manager",
            businessPhone: "(403) 555-0100",
            emailAddress: `contact@${domain}.com`,
            isPrimary: true,
          });
          await storage.createVendorContact({
            tenantId,
            vendorId: vendor.id,
            firstName: "Secondary",
            lastName: "Rep",
            jobTitle: "Sales Representative",
            businessPhone: "(403) 555-0200",
            mobilePhone: "(403) 555-0201",
            emailAddress: `sales@${domain}.com`,
            isPrimary: false,
          });
        }
      }
      
      res.json({ success: true, message: "Sample vendors seeded" });
    } catch (error) {
      console.error("Error seeding vendors:", error);
      res.status(500).json({ error: "Failed to seed vendors" });
    }
  });

  // ==================== VENDOR CONTACTS API ====================

  // Get contacts for a vendor
  app.get("/api/vendors/:vendorId/contacts", async (req, res) => {
    try {
      const contacts = await storage.getVendorContacts(req.params.vendorId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching vendor contacts:", error);
      res.status(500).json({ error: "Failed to fetch vendor contacts" });
    }
  });

  // Create vendor contact
  app.post("/api/vendors/:vendorId/contacts", validateBody(vendorContactCreateSchema.omit({ vendorId: true })), async (req, res) => {
    try {
      const contact = await storage.createVendorContact({
        ...req.body,
        vendorId: req.params.vendorId,
      });
      res.status(201).json(contact);
    } catch (error) {
      console.error("Error creating vendor contact:", error);
      res.status(500).json({ error: "Failed to create vendor contact" });
    }
  });

  // Update vendor contact
  app.patch("/api/vendor-contacts/:id", validateBody(vendorContactUpdateSchema), async (req, res) => {
    try {
      const contact = await storage.updateVendorContact(req.params.id, req.body);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error updating vendor contact:", error);
      res.status(500).json({ error: "Failed to update vendor contact" });
    }
  });

  // Delete vendor contact
  app.delete("/api/vendor-contacts/:id", async (req, res) => {
    try {
      await storage.deleteVendorContact(req.params.id);
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting vendor contact:", error);
      res.status(500).json({ error: "Failed to delete vendor contact" });
    }
  });

  // ==================== EMAIL API (AutoSendEmail from VBA) ====================

  app.post("/api/email/send", validateBody(emailSendSchema), async (req, res) => {
    try {
      const { to, subject, body, cc } = req.body;

      // Check authenticated user's personal email config first
      const session = req.session as any;
      const userId = session?.passport?.user?.claims?.sub;

      if (userId) {
        const { authStorage } = await import("./replit_integrations/auth/storage");
        const authUser = await authStorage.getUser(userId);
        const userConfig = (authUser?.config as any) || {};
        const userEmail = userConfig.emailSettings;

        if (userEmail?.email && userEmail?.password) {
          console.log("Sending email via user SMTP:", { to, subject, from: userEmail.email });

          const transporter = nodemailer.createTransport({
            host: userEmail.host || "smtp.office365.com",
            port: userEmail.port || 587,
            secure: false,
            auth: {
              user: userEmail.email,
              pass: userEmail.password,
            },
          });

          await transporter.sendMail({
            from: userEmail.email,
            to,
            cc,
            subject,
            html: body,
          });

          return res.json({
            success: true,
            message: "Email sent successfully",
          });
        }
      }

      // Fallback: Check if user has Microsoft 365 session (OAuth)
      const accessToken = session?.microsoft?.accessToken;

      if (accessToken) {
        console.log("Sending email via Microsoft 365 Graph API:", { to, subject });

        const result = await microsoftGraph.sendEmail(accessToken, { to, subject, body, cc });

        if (result.success) {
          return res.json({
            success: true,
            message: "Email sent successfully via Microsoft 365",
          });
        } else {
          return res.status(500).json({
            error: "Failed to send email",
            message: result.error,
          });
        }
      }

      return res.status(401).json({
        error: "Email not configured",
        message: "Please configure your email settings in your Profile to send emails",
      });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email", message: error.message });
    }
  });

  // Save SMTP configuration for a tenant
  app.post("/api/tenants/:id/smtp-config", async (req: Request, res: Response) => {
    try {
      const tenantId = req.params.id;
      const { email, password, host, port } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      // Update tenant config with SMTP credentials
      const updatedConfig = {
        ...tenant.config,
        smtp: {
          email,
          password,
          host: host || "smtp.office365.com",
          port: port || 587,
        },
      };

      await storage.updateTenant(tenantId, { config: updatedConfig });
      res.json({ success: true, message: "Email configuration saved" });
    } catch (error) {
      console.error("Save SMTP config error:", error);
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  // Get SMTP status
  app.get("/api/smtp/status", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (!tenantId) {
        return res.json({ configured: false });
      }
      
      const tenant = await storage.getTenant(tenantId);
      const smtpConfig = tenant?.config?.smtp;
      
      res.json({ 
        configured: !!(smtpConfig?.email && smtpConfig?.password),
        email: smtpConfig?.email || null,
      });
    } catch (error) {
      res.json({ configured: false });
    }
  });

  // ==================== CONTACTS DIRECTORY API ====================
  
  // Get unified contacts directory (customers, vendors, employees combined)
  app.get("/api/contacts/directory", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = (req.query.search as string) || "";
      const sortBy = (req.query.sortBy as string) || "name";
      const sortDirection = (req.query.sortDirection as string) || "asc";
      const category = (req.query.category as string) || "all";
      
      // Get all contacts from different sources
      const [customers, vendorContacts, tenantUsers] = await Promise.all([
        storage.getCustomers(tenantId),
        storage.getAllVendorContacts(tenantId),
        storage.getTenantUsers(tenantId),
      ]);
      
      // Transform customers into unified contact format
      const customerContacts = customers.map((c: Customer) => ({
        id: `customer-${c.id}`,
        category: "Customer" as const,
        sortId: c.jobNum,
        fullName: [c.firstName, c.lastName].filter(Boolean).join(" ") || `Customer ${c.jobNum}`,
        company: `Job #${c.jobNum}`,
        email: c.email1 || c.email2 || "",
        phone: c.mobilePhone || c.workPhone || c.homePhone || "",
        jobTitle: "",
        city: c.city || "",
        sourceId: c.id,
      }));
      
      // Transform vendor contacts into unified format
      const vendorContactsList = vendorContacts.map((vc: { contact: VendorContact; vendorName: string }) => ({
        id: `vendor-${vc.contact.id}`,
        category: "Vendor" as const,
        sortId: 0,
        fullName: [vc.contact.firstName, vc.contact.lastName].filter(Boolean).join(" ") || "Contact",
        company: vc.vendorName,
        email: vc.contact.emailAddress || "",
        phone: vc.contact.businessPhone || vc.contact.mobilePhone || "",
        jobTitle: vc.contact.jobTitle || "",
        city: "",
        sourceId: vc.contact.id,
      }));
      
      // Transform tenant users into unified format
      const employeeContacts = tenantUsers.map((tu: TenantUser) => {
        const profile = tu.profile as { firstName?: string; lastName?: string; jobTitle?: string } || {};
        return {
          id: `employee-${tu.id}`,
          category: "Employee" as const,
          sortId: 0,
          fullName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || tu.email,
          company: "Internal",
          email: tu.email,
          phone: "",
          jobTitle: profile.jobTitle || tu.role,
          city: "",
          sourceId: tu.id,
        };
      });
      
      // Combine all contacts
      let allContacts = [...customerContacts, ...vendorContactsList, ...employeeContacts];
      
      // Filter by category
      if (category !== "all") {
        allContacts = allContacts.filter(c => c.category.toLowerCase() === category.toLowerCase());
      }
      
      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        allContacts = allContacts.filter(c => 
          c.fullName.toLowerCase().includes(searchLower) ||
          c.company.toLowerCase().includes(searchLower) ||
          c.email.toLowerCase().includes(searchLower) ||
          c.phone.includes(search)
        );
      }
      
      // Sort
      const dir = sortDirection === "desc" ? -1 : 1;
      allContacts.sort((a, b) => {
        let cmp = 0;
        switch (sortBy) {
          case "company":
            cmp = a.company.localeCompare(b.company);
            break;
          case "category":
            cmp = a.category.localeCompare(b.category);
            break;
          case "jobTitle":
            cmp = a.jobTitle.localeCompare(b.jobTitle);
            break;
          case "email":
            cmp = a.email.localeCompare(b.email);
            break;
          case "phone":
            cmp = a.phone.localeCompare(b.phone);
            break;
          default:
            cmp = a.fullName.localeCompare(b.fullName);
        }
        return cmp * dir;
      });
      
      const total = allContacts.length;
      const paginatedContacts = allContacts.slice(offset, offset + limit);
      
      res.json({
        contacts: paginatedContacts,
        total,
        limit,
        offset,
      });
    } catch (error) {
      console.error("Error fetching contacts directory:", error);
      res.status(500).json({ error: "Failed to fetch contacts directory" });
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
      
      // Sanitize content - remove null bytes that PostgreSQL can't handle in UTF8 text columns
      // This is necessary for binary files like PDFs that get parsed as text
      if (data.content) {
        data.content = data.content.replace(/\0/g, '');
      }
      
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
        parentCodeId: z.string().uuid().nullable().optional(),
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
        
        // Trade dimension (CSI MasterFormat 50 Divisions)
        { dimensionType: "trade", code: "00", name: "Procurement and Contracting Requirements", sortOrder: 0 },
        { dimensionType: "trade", code: "01", name: "General Requirements", sortOrder: 1 },
        { dimensionType: "trade", code: "02", name: "Existing Conditions", sortOrder: 2 },
        { dimensionType: "trade", code: "03", name: "Concrete", sortOrder: 3 },
        { dimensionType: "trade", code: "04", name: "Masonry", sortOrder: 4 },
        { dimensionType: "trade", code: "05", name: "Metals", sortOrder: 5 },
        { dimensionType: "trade", code: "06", name: "Wood, Plastics, and Composites", sortOrder: 6 },
        { dimensionType: "trade", code: "07", name: "Thermal and Moisture Protection", sortOrder: 7 },
        { dimensionType: "trade", code: "08", name: "Openings", sortOrder: 8 },
        { dimensionType: "trade", code: "09", name: "Finishes", sortOrder: 9 },
        { dimensionType: "trade", code: "10", name: "Specialties", sortOrder: 10 },
        { dimensionType: "trade", code: "11", name: "Equipment", sortOrder: 11 },
        { dimensionType: "trade", code: "12", name: "Furnishings", sortOrder: 12 },
        { dimensionType: "trade", code: "13", name: "Special Construction", sortOrder: 13 },
        { dimensionType: "trade", code: "14", name: "Conveying Equipment", sortOrder: 14 },
        { dimensionType: "trade", code: "21", name: "Fire Suppression", sortOrder: 21 },
        { dimensionType: "trade", code: "22", name: "Plumbing", sortOrder: 22 },
        { dimensionType: "trade", code: "23", name: "Heating, Ventilating, and Air Conditioning (HVAC)", sortOrder: 23 },
        { dimensionType: "trade", code: "25", name: "Integrated Automation", sortOrder: 25 },
        { dimensionType: "trade", code: "26", name: "Electrical", sortOrder: 26 },
        { dimensionType: "trade", code: "27", name: "Communications", sortOrder: 27 },
        { dimensionType: "trade", code: "28", name: "Electronic Safety and Security", sortOrder: 28 },
        { dimensionType: "trade", code: "31", name: "Earthwork", sortOrder: 31 },
        { dimensionType: "trade", code: "32", name: "Exterior Improvements", sortOrder: 32 },
        { dimensionType: "trade", code: "33", name: "Utilities", sortOrder: 33 },
        { dimensionType: "trade", code: "34", name: "Transportation", sortOrder: 34 },
        { dimensionType: "trade", code: "35", name: "Waterway and Marine Construction", sortOrder: 35 },
        { dimensionType: "trade", code: "40", name: "Process Interconnections", sortOrder: 40 },
        { dimensionType: "trade", code: "41", name: "Material Processing and Handling Equipment", sortOrder: 41 },
        { dimensionType: "trade", code: "42", name: "Process Heating, Cooling, and Drying Equipment", sortOrder: 42 },
        { dimensionType: "trade", code: "43", name: "Process Gas and Liquid Handling, Purification, and Storage Equipment", sortOrder: 43 },
        { dimensionType: "trade", code: "44", name: "Pollution and Waste Control Equipment", sortOrder: 44 },
        { dimensionType: "trade", code: "45", name: "Industry-Specific Manufacturing Equipment", sortOrder: 45 },
        { dimensionType: "trade", code: "46", name: "Water and Wastewater Equipment", sortOrder: 46 },
        { dimensionType: "trade", code: "48", name: "Electrical Power Generation", sortOrder: 48 },
        
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

  // Microsoft Graph API routes
  app.get("/api/microsoft/status", async (req: Request, res: Response) => {
    const tenantId = req.query.tenantId as string;
    const session = req.session as any;
    const accessToken = session?.microsoft?.accessToken;
    const email = session?.microsoft?.email;
    
    // Check if user has an active Microsoft session
    const connected = !!accessToken;
    
    if (tenantId) {
      try {
        const tenant = await storage.getTenant(tenantId);
        const tenantConfig = tenant?.config?.microsoft;
        const configured = microsoftGraph.isTenantConfigured(tenantConfig);
        res.json({ connected, email, configured, tenantConfigured: !!tenantConfig?.clientId });
      } catch {
        res.json({ connected, email, configured: microsoftGraph.isConfigured(), tenantConfigured: false });
      }
    } else {
      res.json({ connected, email, configured: microsoftGraph.isConfigured(), tenantConfigured: false });
    }
  });

  // Connect Microsoft 365 - redirects to OAuth flow
  app.get("/api/microsoft/connect", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string;
      const sessionId = "default-user";
      
      let credentials: { clientId: string; clientSecret: string; tenantId: string } | null = null;
      
      if (tenantId) {
        const tenant = await storage.getTenant(tenantId);
        if (tenant?.config?.microsoft?.clientId && tenant?.config?.microsoft?.clientSecret) {
          credentials = {
            clientId: tenant.config.microsoft.clientId,
            clientSecret: tenant.config.microsoft.clientSecret,
            tenantId: tenant.config.microsoft.tenantId || "common",
          };
        }
      }
      
      if (!credentials) {
        credentials = microsoftGraph.getCredentials();
      }
      
      if (!credentials) {
        return res.redirect("/settings?error=microsoft_not_configured");
      }
      
      const state = microsoftGraph.generateOAuthState(sessionId, tenantId, credentials);
      const authUrl = microsoftGraph.getAuthUrl(state, credentials);
      res.redirect(authUrl);
    } catch (error) {
      console.error("Microsoft connect error:", error);
      res.redirect("/settings?error=microsoft_connect_failed");
    }
  });

  // Disconnect Microsoft 365
  app.post("/api/microsoft/disconnect", async (req: Request, res: Response) => {
    try {
      const session = req.session as any;
      if (session?.microsoft) {
        delete session.microsoft;
      }
      res.json({ success: true, message: "Microsoft 365 disconnected" });
    } catch (error) {
      console.error("Microsoft disconnect error:", error);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  // Save Microsoft 365 configuration for a tenant
  app.post("/api/tenants/:id/microsoft-config", async (req: Request, res: Response) => {
    try {
      const tenantId = req.params.id;
      const { clientId, clientSecret, tenantId: azureTenantId } = req.body;

      if (!clientId || !clientSecret) {
        return res.status(400).json({ error: "Client ID and Client Secret are required" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      // Update tenant config with Microsoft credentials
      const updatedConfig = {
        ...tenant.config,
        microsoft: {
          clientId,
          clientSecret,
          tenantId: azureTenantId || "common",
        },
      };

      await storage.updateTenant(tenantId, { config: updatedConfig });
      res.json({ success: true, message: "Microsoft 365 configuration saved" });
    } catch (error) {
      console.error("Save Microsoft config error:", error);
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  app.get("/api/microsoft/auth-url", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string;
      const sessionId = "default-user";
      
      // Try to get credentials from tenant config first
      let credentials: { clientId: string; clientSecret: string; tenantId: string } | null = null;
      
      if (tenantId) {
        const tenant = await storage.getTenant(tenantId);
        if (tenant?.config?.microsoft?.clientId && tenant?.config?.microsoft?.clientSecret) {
          credentials = {
            clientId: tenant.config.microsoft.clientId,
            clientSecret: tenant.config.microsoft.clientSecret,
            tenantId: tenant.config.microsoft.tenantId || "common",
          };
        }
      }
      
      // Fall back to environment variables
      if (!credentials) {
        credentials = microsoftGraph.getCredentials();
      }
      
      if (!credentials) {
        return res.status(400).json({ 
          error: "Microsoft 365 not configured",
          needsConfig: true,
          message: "Please configure your Microsoft 365 credentials"
        });
      }
      
      // Generate secure OAuth state with CSRF protection
      const state = microsoftGraph.generateOAuthState(sessionId, tenantId, credentials);
      const authUrl = microsoftGraph.getAuthUrl(state, credentials);
      res.json({ authUrl, state });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/microsoft/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      
      if (!code || typeof code !== "string") {
        return res.status(400).send("Missing authorization code");
      }
      
      if (!state || typeof state !== "string") {
        return res.status(400).send("Missing or invalid state parameter");
      }
      
      // Validate OAuth state to prevent CSRF attacks
      const stateValidation = microsoftGraph.validateOAuthState(state);
      if (!stateValidation.valid) {
        console.error("OAuth state validation failed");
        return res.redirect("/documents/files?microsoft=error&message=" + encodeURIComponent("OAuth state validation failed. Please try again."));
      }
      
      // Use credentials from state validation
      let credentials = stateValidation.credentials;
      
      if (!credentials) {
        // Try to get from tenant or env
        if (stateValidation.tenantId) {
          const tenant = await storage.getTenant(stateValidation.tenantId);
          if (tenant?.config?.microsoft) {
            credentials = {
              clientId: tenant.config.microsoft.clientId,
              clientSecret: tenant.config.microsoft.clientSecret,
              tenantId: tenant.config.microsoft.tenantId || "common",
            };
          }
        }
        if (!credentials) {
          credentials = microsoftGraph.getCredentials() || undefined;
        }
      }
      
      if (!credentials) {
        return res.redirect("/documents/files?microsoft=error&message=" + encodeURIComponent("No credentials available"));
      }
      
      const token = await microsoftGraph.exchangeCodeForToken(code, credentials);
      
      // Store token keyed by validated user ID from state
      const sessionId = stateValidation.userId || "default-user";
      microsoftGraph.storeToken(sessionId, token);
      
      // Store credentials for future use
      if (stateValidation.tenantId && credentials) {
        microsoftGraph.setStoredCredentials(stateValidation.tenantId, credentials);
      }
      
      // Redirect back to file manager with success
      res.redirect("/documents/files?microsoft=connected");
    } catch (error: any) {
      console.error("Microsoft OAuth callback error:", error);
      res.redirect("/documents/files?microsoft=error&message=" + encodeURIComponent(error.message));
    }
  });

  app.post("/api/microsoft/upload", async (req: Request, res: Response) => {
    try {
      const sessionId = "default-user";
      const tenantId = req.body.tenantId as string;
      
      // Get credentials for token refresh if needed
      let credentials = tenantId ? microsoftGraph.getStoredCredentials(tenantId) : undefined;
      if (!credentials) {
        credentials = microsoftGraph.getCredentials() || undefined;
      }
      
      const accessToken = await microsoftGraph.getValidToken(sessionId, credentials);
      
      if (!accessToken) {
        return res.status(401).json({ error: "Not authenticated with Microsoft" });
      }
      
      const { fileName, content, mimeType } = req.body;
      
      if (!fileName || !content) {
        return res.status(400).json({ error: "Missing fileName or content" });
      }
      
      // Validate file name for security
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      // Convert base64 content to buffer
      let fileBuffer: Buffer;
      try {
        if (content.startsWith("data:")) {
          const base64Data = content.split(",")[1];
          if (!base64Data) {
            return res.status(400).json({ error: "Invalid data URL format" });
          }
          fileBuffer = Buffer.from(base64Data, "base64");
        } else {
          fileBuffer = Buffer.from(content, "base64");
        }
      } catch (decodeError) {
        return res.status(400).json({ error: "Failed to decode file content" });
      }
      
      // Validate file size (max 50MB for simple upload)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (fileBuffer.length > maxSize) {
        return res.status(400).json({ error: "File size exceeds 50MB limit" });
      }
      
      const uploadResult = await microsoftGraph.uploadToOneDrive(
        accessToken,
        sanitizedFileName,
        fileBuffer,
        mimeType || "application/octet-stream"
      );
      
      // Get edit URL for the uploaded file
      const urls = await microsoftGraph.getOneDriveFileUrl(accessToken, uploadResult.id);
      
      res.json({
        ...uploadResult,
        editUrl: urls.editUrl,
      });
    } catch (error: any) {
      console.error("Microsoft upload error:", error);
      res.status(500).json({ 
        error: "Upload failed", 
        details: error.message 
      });
    }
  });

  app.get("/api/microsoft/edit-url/:fileId", async (req: Request, res: Response) => {
    try {
      const sessionId = "default-user";
      const accessToken = await microsoftGraph.getValidToken(sessionId);
      
      if (!accessToken) {
        return res.status(401).json({ error: "Not authenticated with Microsoft" });
      }
      
      const { fileId } = req.params;
      const urls = await microsoftGraph.getOneDriveFileUrl(accessToken, fileId);
      
      res.json(urls);
    } catch (error: any) {
      console.error("Microsoft get edit URL error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/microsoft/files", async (_req: Request, res: Response) => {
    try {
      const sessionId = "default-user";
      const accessToken = await microsoftGraph.getValidToken(sessionId);
      
      if (!accessToken) {
        return res.status(401).json({ error: "Not authenticated with Microsoft" });
      }
      
      const files = await microsoftGraph.listOneDriveFiles(accessToken);
      res.json(files);
    } catch (error: any) {
      console.error("Microsoft list files error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Sync document from OneDrive - downloads updated content and updates local document
  app.post("/api/microsoft/sync/:fileId", async (req: Request, res: Response) => {
    try {
      const sessionId = "default-user";
      const tenantId = req.body.tenantId as string;
      const documentId = req.body.documentId as string;
      
      // Get credentials for token refresh if needed
      let credentials = tenantId ? microsoftGraph.getStoredCredentials(tenantId) : undefined;
      if (!credentials) {
        credentials = microsoftGraph.getCredentials() || undefined;
      }
      
      const accessToken = await microsoftGraph.getValidToken(sessionId, credentials);
      
      if (!accessToken) {
        return res.status(401).json({ error: "Not authenticated with Microsoft" });
      }
      
      const { fileId } = req.params;
      
      if (!documentId) {
        return res.status(400).json({ error: "Missing documentId" });
      }
      
      // Download file from OneDrive
      const downloadResult = await microsoftGraph.downloadFromOneDrive(accessToken, fileId);
      
      // Update the document in our database with the new content
      const base64Content = downloadResult.content.toString('base64');
      
      const updatedDoc = await storage.updateDocument(documentId, {
        plainContent: base64Content,
        originalSizeBytes: downloadResult.content.length,
        updatedAt: new Date(),
      });
      
      res.json({
        success: true,
        name: downloadResult.name,
        size: downloadResult.content.length,
        lastModified: downloadResult.lastModified,
        message: "Document synced from OneDrive",
        document: updatedDoc
      });
    } catch (error: any) {
      console.error("Microsoft sync error:", error);
      res.status(500).json({ 
        error: "Sync failed", 
        details: error.message 
      });
    }
  });

  app.get("/api/microsoft/connected", async (req: Request, res: Response) => {
    const sessionId = "default-user";
    const tenantId = req.query.tenantId as string;
    
    // Check if configured via tenant config or env vars
    let isConfigured = false;
    let credentials: { clientId: string; clientSecret: string; tenantId: string } | undefined;
    
    if (tenantId) {
      try {
        const tenant = await storage.getTenant(tenantId);
        if (tenant?.config?.microsoft?.clientId && tenant?.config?.microsoft?.clientSecret) {
          isConfigured = true;
          credentials = {
            clientId: tenant.config.microsoft.clientId,
            clientSecret: tenant.config.microsoft.clientSecret,
            tenantId: tenant.config.microsoft.tenantId || "common",
          };
        }
      } catch {
        // Fall through to env var check
      }
    }
    
    if (!isConfigured) {
      const envCreds = microsoftGraph.getCredentials();
      if (envCreds) {
        isConfigured = true;
        credentials = envCreds;
      }
    }
    
    const accessToken = isConfigured ? await microsoftGraph.getValidToken(sessionId, credentials) : null;
    res.json({ 
      configured: isConfigured,
      connected: !!accessToken 
    });
  });

  return httpServer;
}
