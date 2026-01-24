import { randomUUID } from "crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import {
  tenants,
  tenantUsers,
  projects,
  wbsNodes,
  navigationItems,
  type Tenant,
  type TenantUser,
  type Project,
  type WbsNode,
  type NavigationItem,
  type InsertTenant,
  type InsertTenantUser,
  type InsertProject,
  type InsertWbsNode,
  type InsertNavigationItem,
  type DashboardStats,
} from "@shared/schema";

export interface IStorage {
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | undefined>;
  
  getTenantUser(id: string): Promise<TenantUser | undefined>;
  getTenantUserByEmail(tenantId: string, email: string): Promise<TenantUser | undefined>;
  getTenantUsers(tenantId: string): Promise<TenantUser[]>;
  createTenantUser(user: InsertTenantUser): Promise<TenantUser>;
  
  getProject(id: string): Promise<Project | undefined>;
  getProjects(tenantId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  getWbsNode(id: string): Promise<WbsNode | undefined>;
  getWbsNodes(tenantId: string): Promise<WbsNode[]>;
  getWbsNodesByProject(projectId: string): Promise<WbsNode[]>;
  createWbsNode(node: InsertWbsNode): Promise<WbsNode>;
  updateWbsNode(id: string, updates: Partial<WbsNode>): Promise<WbsNode | undefined>;
  deleteWbsNode(id: string): Promise<boolean>;
  
  getNavigationItems(tenantId: string): Promise<NavigationItem[]>;
  createNavigationItem(item: InsertNavigationItem): Promise<NavigationItem>;
  
  getDashboardStats(tenantId: string): Promise<DashboardStats>;
}

export class DatabaseStorage implements IStorage {
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain));
    return tenant || undefined;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return db.select().from(tenants).orderBy(tenants.companyName);
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const id = randomUUID();
    const now = new Date();
    const [newTenant] = await db.insert(tenants).values({
      id,
      subdomain: tenant.subdomain,
      companyName: tenant.companyName,
      contactEmail: tenant.contactEmail,
      config: tenant.config || {
        branding: {
          primaryColor: "0 0% 25%",
          secondaryColor: "0 0% 45%",
          sidebarColor: "0 0% 8%",
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
      storageMode: tenant.storageMode || "cloud",
      onboardingComplete: tenant.onboardingComplete ?? false,
      instanceStatus: tenant.instanceStatus || "active",
      createdAt: now,
      updatedAt: now,
    }).returning();
    return newTenant;
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updated || undefined;
  }

  async getTenantUser(id: string): Promise<TenantUser | undefined> {
    const [user] = await db.select().from(tenantUsers).where(eq(tenantUsers.id, id));
    return user || undefined;
  }

  async getTenantUserByEmail(tenantId: string, email: string): Promise<TenantUser | undefined> {
    const [user] = await db.select().from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.email, email)));
    return user || undefined;
  }

  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    return db.select().from(tenantUsers).where(eq(tenantUsers.tenantId, tenantId));
  }

  async createTenantUser(user: InsertTenantUser): Promise<TenantUser> {
    const id = randomUUID();
    const [newUser] = await db.insert(tenantUsers).values({
      id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role || "viewer",
      profile: user.profile || {
        firstName: null,
        lastName: null,
        jobTitle: null,
        department: null,
        avatarUrl: null,
      },
      isActive: user.isActive ?? true,
      createdAt: new Date(),
    }).returning();
    return newUser;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjects(tenantId: string): Promise<Project[]> {
    return db.select().from(projects)
      .where(eq(projects.tenantId, tenantId))
      .orderBy(desc(projects.createdAt));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = randomUUID();
    const now = new Date();
    const [newProject] = await db.insert(projects).values({
      id,
      tenantId: project.tenantId,
      name: project.name,
      description: project.description || null,
      status: project.status || "not_started",
      startDate: project.startDate ? new Date(project.startDate as string | Date) : null,
      endDate: project.endDate ? new Date(project.endDate as string | Date) : null,
      budget: project.budget || null,
      managerId: project.managerId || null,
      metadata: project.metadata || {},
      createdAt: now,
      updatedAt: now,
    }).returning();
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [updated] = await db.update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    await db.delete(wbsNodes).where(eq(wbsNodes.projectId, id));
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }

  async getWbsNode(id: string): Promise<WbsNode | undefined> {
    const [node] = await db.select().from(wbsNodes).where(eq(wbsNodes.id, id));
    return node || undefined;
  }

  async getWbsNodes(tenantId: string): Promise<WbsNode[]> {
    return db.select().from(wbsNodes)
      .where(eq(wbsNodes.tenantId, tenantId))
      .orderBy(wbsNodes.orderIndex);
  }

  async getWbsNodesByProject(projectId: string): Promise<WbsNode[]> {
    return db.select().from(wbsNodes)
      .where(eq(wbsNodes.projectId, projectId))
      .orderBy(wbsNodes.orderIndex);
  }

  async createWbsNode(node: InsertWbsNode): Promise<WbsNode> {
    const id = randomUUID();
    const now = new Date();
    
    const siblings = await db.select().from(wbsNodes)
      .where(and(
        eq(wbsNodes.projectId, node.projectId),
        node.parentId ? eq(wbsNodes.parentId, node.parentId) : sql`${wbsNodes.parentId} IS NULL`
      ));
    
    let codeDisplay = "1";
    if (node.parentId) {
      const [parent] = await db.select().from(wbsNodes).where(eq(wbsNodes.id, node.parentId));
      if (parent) {
        codeDisplay = `${parent.codeDisplay}.${siblings.length + 1}`;
      }
    } else {
      codeDisplay = `${siblings.length + 1}`;
    }
    
    const [newNode] = await db.insert(wbsNodes).values({
      id,
      tenantId: node.tenantId,
      projectId: node.projectId,
      parentId: node.parentId || null,
      codePath: codeDisplay.replace(/\./g, "_"),
      codeDisplay,
      title: node.title,
      description: node.description || null,
      status: node.status || "not_started",
      dimensions: node.dimensions || {},
      estimatedHours: node.estimatedHours || null,
      estimatedCost: node.estimatedCost || null,
      actualHours: node.actualHours || null,
      actualCost: node.actualCost || null,
      assignedTo: node.assignedTo || null,
      orderIndex: siblings.length,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return newNode;
  }

  async updateWbsNode(id: string, updates: Partial<WbsNode>): Promise<WbsNode | undefined> {
    const [updated] = await db.update(wbsNodes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(wbsNodes.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWbsNode(id: string): Promise<boolean> {
    const deleteRecursive = async (nodeId: string) => {
      const children = await db.select().from(wbsNodes).where(eq(wbsNodes.parentId, nodeId));
      for (const child of children) {
        await deleteRecursive(child.id);
      }
      await db.delete(wbsNodes).where(eq(wbsNodes.id, nodeId));
    };
    
    const [node] = await db.select().from(wbsNodes).where(eq(wbsNodes.id, id));
    if (node) {
      await deleteRecursive(id);
      return true;
    }
    return false;
  }

  async getNavigationItems(tenantId: string): Promise<NavigationItem[]> {
    return db.select().from(navigationItems)
      .where(eq(navigationItems.tenantId, tenantId))
      .orderBy(navigationItems.itemOrder);
  }

  async createNavigationItem(item: InsertNavigationItem): Promise<NavigationItem> {
    const id = randomUUID();
    const now = new Date();
    const [newItem] = await db.insert(navigationItems).values({
      id,
      tenantId: item.tenantId,
      parentId: item.parentId || null,
      itemOrder: item.itemOrder || 0,
      itemType: item.itemType || "menu",
      title: item.title,
      iconName: item.iconName || null,
      path: item.path || null,
      component: item.component || null,
      uiSlot: item.uiSlot || "sidebar",
      maxChildrenDisplay: item.maxChildrenDisplay || 5,
      isCollapsible: item.isCollapsible ?? true,
      minRoleRequired: item.minRoleRequired || "viewer",
      createdAt: now,
      updatedAt: now,
    }).returning();
    return newItem;
  }

  async getDashboardStats(tenantId: string): Promise<DashboardStats> {
    const projectList = await db.select().from(projects).where(eq(projects.tenantId, tenantId));
    const wbsNodeList = await db.select().from(wbsNodes).where(eq(wbsNodes.tenantId, tenantId));
    const userList = await db.select().from(tenantUsers).where(eq(tenantUsers.tenantId, tenantId));

    const activeProjects = projectList.filter((p) => p.status === "in_progress").length;
    const completedProjects = projectList.filter((p) => p.status === "completed").length;
    const completedNodes = wbsNodeList.filter((n) => n.status === "completed").length;
    
    const budgetTotal = projectList.reduce((sum, p) => sum + parseFloat(p.budget || "0"), 0);
    const budgetUsed = budgetTotal * 0.45;

    return {
      totalProjects: projectList.length,
      activeProjects,
      completedProjects,
      totalWbsNodes: wbsNodeList.length,
      completedWbsNodes: completedNodes,
      teamMembers: userList.length,
      budgetTotal,
      budgetUsed,
    };
  }
}

export const storage = new DatabaseStorage();

export async function seedDatabase() {
  const existingTenants = await db.select().from(tenants);
  if (existingTenants.length > 0) {
    return;
  }

  const tenantId = randomUUID();
  const tenant2Id = randomUUID();
  const tenant3Id = randomUUID();

  await db.insert(tenants).values([
    {
      id: tenantId,
      subdomain: "acme",
      companyName: "Acme Construction Co.",
      contactEmail: "admin@acme.com",
      config: {
        branding: {
          primaryColor: "0 0% 25%",
          secondaryColor: "0 0% 45%",
          sidebarColor: "0 0% 8%",
          fontStyle: "elegant",
          logoUrl: null,
          faviconUrl: null,
        },
        modules: {
          hrSync: false,
          advancedWbs: true,
          documentTemplating: false,
        },
        wbsDimensions: [
          { key: "phase", label: "Project Phase", required: true },
          { key: "trade", label: "Trade", required: true },
          { key: "location", label: "Unit/Location", required: false },
        ],
      },
      storageMode: "cloud",
      onboardingComplete: true,
      instanceStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: tenant2Id,
      subdomain: "summit",
      companyName: "Summit Builders LLC",
      contactEmail: "info@summit.com",
      config: {
        branding: {
          primaryColor: "220 70% 40%",
          secondaryColor: "35 90% 50%",
          sidebarColor: "220 40% 12%",
          fontStyle: "classic",
          logoUrl: null,
          faviconUrl: null,
        },
        modules: {
          hrSync: true,
          advancedWbs: true,
          documentTemplating: true,
        },
        wbsDimensions: [
          { key: "phase", label: "Project Phase", required: true },
          { key: "trade", label: "Trade", required: true },
        ],
      },
      storageMode: "cloud",
      onboardingComplete: true,
      instanceStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: tenant3Id,
      subdomain: "greenfield",
      companyName: "Greenfield Development",
      contactEmail: "contact@greenfield.com",
      config: {
        branding: {
          primaryColor: "142 60% 35%",
          secondaryColor: "38 92% 50%",
          sidebarColor: "142 35% 12%",
          fontStyle: "modern",
          logoUrl: null,
          faviconUrl: null,
        },
        modules: {
          hrSync: false,
          advancedWbs: true,
          documentTemplating: false,
        },
        wbsDimensions: [
          { key: "phase", label: "Project Phase", required: true },
          { key: "trade", label: "Trade", required: true },
          { key: "location", label: "Unit/Location", required: false },
        ],
      },
      storageMode: "cloud",
      onboardingComplete: true,
      instanceStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const adminUserId = randomUUID();
  const pmUserId = randomUUID();
  const viewerUserId = randomUUID();

  await db.insert(tenantUsers).values([
    {
      id: adminUserId,
      tenantId,
      email: "admin@acme.com",
      role: "admin",
      profile: {
        firstName: "John",
        lastName: "Builder",
        jobTitle: "Construction Manager",
        department: "Operations",
        avatarUrl: null,
      },
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
    },
    {
      id: pmUserId,
      tenantId,
      email: "pm@acme.com",
      role: "project_manager",
      profile: {
        firstName: "Sarah",
        lastName: "Projects",
        jobTitle: "Senior Project Manager",
        department: "Project Management",
        avatarUrl: null,
      },
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
    },
    {
      id: viewerUserId,
      tenantId,
      email: "viewer@acme.com",
      role: "viewer",
      profile: {
        firstName: "Mike",
        lastName: "Observer",
        jobTitle: "Site Inspector",
        department: "Quality Assurance",
        avatarUrl: null,
      },
      isActive: true,
      createdAt: new Date(),
    },
  ]);

  const projectsData = [
    {
      name: "Downtown Office Complex",
      description: "25-story mixed-use commercial building with underground parking",
      status: "in_progress",
      budget: "15000000",
    },
    {
      name: "Riverside Condominiums",
      description: "Luxury waterfront residential development with 120 units",
      status: "in_progress",
      budget: "8500000",
    },
    {
      name: "Central Park Renovation",
      description: "Major park infrastructure update including trails and pavilions",
      status: "not_started",
      budget: "2200000",
    },
    {
      name: "Industrial Warehouse B",
      description: "Distribution center with modern logistics capabilities",
      status: "completed",
      budget: "4500000",
    },
    {
      name: "Hillside Residential",
      description: "Custom home development on challenging terrain",
      status: "on_hold",
      budget: "1800000",
    },
  ];

  for (const p of projectsData) {
    const projectId = randomUUID();
    await db.insert(projects).values({
      id: projectId,
      tenantId,
      name: p.name,
      description: p.description,
      status: p.status,
      startDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
      budget: p.budget,
      managerId: pmUserId,
      metadata: {},
      createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    const wbsData = [
      { code: "1", title: "Site Preparation", status: "completed", hours: "80" },
      { code: "1.1", title: "Clearing and Grading", status: "completed", hours: "40", parent: "1" },
      { code: "1.2", title: "Utility Connection", status: "completed", hours: "40", parent: "1" },
      { code: "2", title: "Foundation", status: "in_progress", hours: "120" },
      { code: "2.1", title: "Excavation", status: "completed", hours: "30", parent: "2" },
      { code: "2.2", title: "Concrete Pour", status: "in_progress", hours: "60", parent: "2" },
      { code: "2.3", title: "Curing", status: "not_started", hours: "30", parent: "2" },
      { code: "3", title: "Framing", status: "not_started", hours: "200" },
    ];

    const nodeIdMap = new Map<string, string>();
    for (const w of wbsData) {
      const nodeId = randomUUID();
      nodeIdMap.set(w.code, nodeId);
      
      await db.insert(wbsNodes).values({
        id: nodeId,
        tenantId,
        projectId,
        parentId: w.parent ? nodeIdMap.get(w.parent) || null : null,
        codePath: w.code.replace(/\./g, "_"),
        codeDisplay: w.code,
        title: w.title,
        description: null,
        status: w.status,
        dimensions: { phase: "Construction", trade: "General" },
        estimatedHours: w.hours,
        estimatedCost: null,
        actualHours: null,
        actualCost: null,
        assignedTo: null,
        orderIndex: parseInt(w.code.split(".").pop() || "0"),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  console.log("Database seeded successfully with sample data");
}
