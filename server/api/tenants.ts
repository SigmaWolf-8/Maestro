import { Router, Request, Response } from "express";
import { storage, seedNavigationForTenant, seedNavigationForCompanyType } from "../storage";
import { z } from "zod";

let cachedTenantId: string | null = null;
export async function getDefaultTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;
  const tenant = await storage.getTenantBySubdomain("acme");
  cachedTenantId = tenant?.id || "";
  return cachedTenantId;
}

const propagateSchema = z.object({
  oldKey: z.string().min(1),
  newKey: z.string().min(1),
  applyTo: z.enum(["all", "specific", "forward"]),
  projectIds: z.array(z.string()).optional(),
});

export function createTenantsRouter(): Router {
  const router = Router();

  router.get("/api/tenants", async (req, res) => {
    try {
      const tenants = await storage.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  router.get("/api/tenants/:id", async (req, res) => {
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

  router.patch("/api/tenants/:id", async (req, res) => {
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

  router.post("/api/tenants", async (req, res) => {
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

  router.post("/api/tenants/:id/seed-navigation", async (req, res) => {
    try {
      const tenantId = req.params.id;
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      
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

  router.post("/api/tenants/:id/apply-company-type", async (req, res) => {
    try {
      const tenantId = req.params.id;
      const { companyType } = req.body;
      const validCompanyTypes = ["construction", "land_development", "holding_company", "payroll_company", "retail", "tech", "consulting", "manufacturing", "healthcare", "real_estate", "general"];
      if (!companyType || typeof companyType !== "string" || !validCompanyTypes.includes(companyType)) {
        return res.status(400).json({ error: "Invalid companyType. Must be one of: " + validCompanyTypes.join(", ") });
      }
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const updatedConfig = { ...(tenant.config || {}), companyType };
      await storage.updateTenant(tenantId, { config: updatedConfig });
      await seedNavigationForCompanyType(tenantId, companyType);
      const newNav = await storage.getNavigationItems(tenantId);
      res.json({ message: "Company type applied successfully", companyType, navCount: newNav.length });
    } catch (error) {
      console.error("Error applying company type:", error);
      res.status(500).json({ error: "Failed to apply company type" });
    }
  });

  router.get("/api/navigation", async (req, res) => {
    try {
      const tenantId = (req.query.tenantId as string) || await getDefaultTenantId();
      const items = await storage.getNavigationItems(tenantId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching navigation items:", error);
      res.status(500).json({ error: "Failed to fetch navigation items" });
    }
  });

  router.get("/api/dashboard/stats", async (req, res) => {
    try {
      const tenantId = await getDefaultTenantId();
      const stats = await storage.getDashboardStats(tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  router.get("/api/tenant", async (req, res) => {
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

  router.post("/api/dimensions/propagate", async (req, res) => {
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

  return router;
}
