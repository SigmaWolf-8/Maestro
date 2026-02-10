import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { getDefaultTenantId } from "./tenants";

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

export function createProjectsRouter(): Router {
  const router = Router();

  router.get("/api/projects", async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId query parameter is required" });
      }
      const projects = await storage.getProjects(tenantId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  router.get("/api/projects/:id", async (req, res) => {
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

  router.post("/api/projects", async (req, res) => {
    try {
      const tenantId = req.body.tenantId || (req.query.tenantId as string);
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId is required" });
      }
      const parsed = projectCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
      }
      const project = await storage.createProject({
        ...parsed.data,
        tenantId,
      });
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  router.patch("/api/projects/:id", validateBody(projectUpdateSchema), async (req, res) => {
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

  router.delete("/api/projects/:id", async (req, res) => {
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

  router.get("/api/wbs", async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId query parameter is required" });
      }
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

  router.get("/api/wbs/:id", async (req, res) => {
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

  router.post("/api/wbs", validateBody(wbsCreateSchema), async (req, res) => {
    try {
      const tenantId = req.body.tenantId || (req.query.tenantId as string);
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId query parameter is required" });
      }
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

  router.patch("/api/wbs/:id", validateBody(wbsUpdateSchema), async (req, res) => {
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

  router.delete("/api/wbs/:id", async (req, res) => {
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

  router.get("/api/wbs-templates", async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId query parameter is required" });
      }
      const templates = await storage.getWbsTemplates(tenantId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching WBS templates:", error);
      res.status(500).json({ error: "Failed to fetch WBS templates" });
    }
  });

  router.get("/api/wbs-templates/:id", async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId query parameter is required" });
      }
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

  router.post("/api/wbs-templates", validateBody(wbsTemplateCreateSchema), async (req, res) => {
    try {
      const { name, description, category, structure, tenantId: bodyTenantId } = req.body;
      const finalTenantId = bodyTenantId || (req.query.tenantId as string);
      if (!finalTenantId) {
        return res.status(400).json({ error: "tenantId query parameter is required" });
      }
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

  router.patch("/api/wbs-templates/:id", validateBody(wbsTemplateUpdateSchema), async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId query parameter is required" });
      }
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

  router.delete("/api/wbs-templates/:id", async (req, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId query parameter is required" });
      }
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

  router.get("/api/wbs-codes", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string;
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId query parameter is required" });
      }
      const dimensionType = req.query.dimensionType as string | undefined;
      const codes = await storage.getWbsMasterCodes(tenantId, dimensionType);
      res.json(codes);
    } catch (error) {
      console.error("Error fetching WBS codes:", error);
      res.status(500).json({ error: "Failed to fetch WBS codes" });
    }
  });

  router.get("/api/wbs-codes/:id", async (req: Request, res: Response) => {
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

  router.post("/api/wbs-codes", async (req: Request, res: Response) => {
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
      const tenantId = data.tenantId || (req.query.tenantId as string);
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId query parameter is required" });
      }
      
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

  router.patch("/api/wbs-codes/:id", async (req: Request, res: Response) => {
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

  router.delete("/api/wbs-codes/:id", async (req: Request, res: Response) => {
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

  router.post("/api/wbs-codes/seed/:tenantId", async (req: Request, res: Response) => {
    try {
      const tenantId = req.params.tenantId;
      
      const defaultCodes = [
        { dimensionType: "phase", code: "PRE", name: "Pre-Construction", sortOrder: 1 },
        { dimensionType: "phase", code: "CON", name: "Construction", sortOrder: 2 },
        { dimensionType: "phase", code: "CLO", name: "Close-Out", sortOrder: 3 },
        { dimensionType: "phase", code: "WAR", name: "Warranty", sortOrder: 4 },
        
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
        
        { dimensionType: "location", code: "SITE", name: "Site Work", sortOrder: 1 },
        { dimensionType: "location", code: "BLDG-A", name: "Building A", sortOrder: 2 },
        { dimensionType: "location", code: "BLDG-B", name: "Building B", sortOrder: 3 },
        { dimensionType: "location", code: "PARKING", name: "Parking Structure", sortOrder: 4 },
        
        { dimensionType: "building", code: "MAIN", name: "Main Building", sortOrder: 1 },
        { dimensionType: "building", code: "ANNEX", name: "Annex", sortOrder: 2 },
        { dimensionType: "building", code: "GARAGE", name: "Garage", sortOrder: 3 },
        
        { dimensionType: "level", code: "B1", name: "Basement Level 1", sortOrder: 1 },
        { dimensionType: "level", code: "L1", name: "Level 1 (Ground)", sortOrder: 2 },
        { dimensionType: "level", code: "L2", name: "Level 2", sortOrder: 3 },
        { dimensionType: "level", code: "L3", name: "Level 3", sortOrder: 4 },
        { dimensionType: "level", code: "ROOF", name: "Roof Level", sortOrder: 5 },
        
        { dimensionType: "zone", code: "Z-A", name: "Zone A (North)", sortOrder: 1 },
        { dimensionType: "zone", code: "Z-B", name: "Zone B (South)", sortOrder: 2 },
        { dimensionType: "zone", code: "Z-C", name: "Zone C (East)", sortOrder: 3 },
        { dimensionType: "zone", code: "Z-D", name: "Zone D (West)", sortOrder: 4 },
        
        { dimensionType: "system", code: "DWG", name: "Drawing", sortOrder: 0 },
        { dimensionType: "system", code: "SPEC", name: "Specification", sortOrder: 1 },
        { dimensionType: "system", code: "TMPL", name: "Template", sortOrder: 2 },
        { dimensionType: "system", code: "INVAP", name: "Invoice AP", sortOrder: 3 },
        { dimensionType: "system", code: "INVAR", name: "Invoice AR", sortOrder: 4 },
        { dimensionType: "system", code: "PO", name: "Purchase Order", sortOrder: 5 },
        { dimensionType: "system", code: "RPT", name: "Report", sortOrder: 6 },
        { dimensionType: "system", code: "CTR", name: "Contract", sortOrder: 7 },
        { dimensionType: "system", code: "COR", name: "Correspondence", sortOrder: 8 },
        { dimensionType: "system", code: "PHOTO", name: "Photo", sortOrder: 9 },
        
        { dimensionType: "subsystem", code: "LIGHT", name: "Lighting", sortOrder: 1 },
        { dimensionType: "subsystem", code: "POWER", name: "Power Distribution", sortOrder: 2 },
        { dimensionType: "subsystem", code: "CTRL", name: "Controls & Automation", sortOrder: 3 },
        { dimensionType: "subsystem", code: "DATA", name: "Data & Communications", sortOrder: 4 },
        
        { dimensionType: "element_type", code: "WALL", name: "Wall", sortOrder: 1 },
        { dimensionType: "element_type", code: "FLOOR", name: "Floor", sortOrder: 2 },
        { dimensionType: "element_type", code: "CEIL", name: "Ceiling", sortOrder: 3 },
        { dimensionType: "element_type", code: "DOOR", name: "Door", sortOrder: 4 },
        { dimensionType: "element_type", code: "WIN", name: "Window", sortOrder: 5 },
        { dimensionType: "element_type", code: "FIXT", name: "Fixture", sortOrder: 6 },
        
        { dimensionType: "material", code: "CONC", name: "Concrete", sortOrder: 1 },
        { dimensionType: "material", code: "STL", name: "Steel", sortOrder: 2 },
        { dimensionType: "material", code: "WOOD", name: "Wood", sortOrder: 3 },
        { dimensionType: "material", code: "GLS", name: "Glass", sortOrder: 4 },
        { dimensionType: "material", code: "ALUM", name: "Aluminum", sortOrder: 5 },
        
        { dimensionType: "work_package", code: "WP-001", name: "Foundation Package", sortOrder: 1 },
        { dimensionType: "work_package", code: "WP-002", name: "Framing Package", sortOrder: 2 },
        { dimensionType: "work_package", code: "WP-003", name: "MEP Rough-In", sortOrder: 3 },
        { dimensionType: "work_package", code: "WP-004", name: "Interior Finishes", sortOrder: 4 },
        
        { dimensionType: "cost_code", code: "CC-100", name: "General Conditions", sortOrder: 1 },
        { dimensionType: "cost_code", code: "CC-200", name: "Site Work", sortOrder: 2 },
        { dimensionType: "cost_code", code: "CC-300", name: "Structure", sortOrder: 3 },
        { dimensionType: "cost_code", code: "CC-400", name: "Exterior", sortOrder: 4 },
        { dimensionType: "cost_code", code: "CC-500", name: "Interior", sortOrder: 5 },
        
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

  router.post("/api/projects/:projectId/copy-master-wbs", async (req: Request, res: Response) => {
    try {
      const projectId = req.params.projectId;
      const tenantId = req.query.tenantId as string;
      
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId is required" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      if (project.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied: project does not belong to this tenant" });
      }
      
      const masterCodes = await storage.getWbsMasterCodes(tenantId);
      if (!masterCodes || masterCodes.length === 0) {
        return res.status(400).json({ error: "No master codes found. Please seed default codes first." });
      }
      
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

  return router;
}
