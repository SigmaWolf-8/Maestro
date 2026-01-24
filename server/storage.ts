import { randomUUID } from "crypto";
import type {
  Tenant,
  TenantUser,
  Project,
  WbsNode,
  NavigationItem,
  InsertTenant,
  InsertTenantUser,
  InsertProject,
  InsertWbsNode,
  InsertNavigationItem,
  DashboardStats,
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

export class MemStorage implements IStorage {
  private tenants: Map<string, Tenant>;
  private tenantUsers: Map<string, TenantUser>;
  private projects: Map<string, Project>;
  private wbsNodes: Map<string, WbsNode>;
  private navigationItems: Map<string, NavigationItem>;

  constructor() {
    this.tenants = new Map();
    this.tenantUsers = new Map();
    this.projects = new Map();
    this.wbsNodes = new Map();
    this.navigationItems = new Map();
    
    this.seedData();
  }

  private seedData() {
    const tenantId = randomUUID();
    const defaultTenant: Tenant = {
      id: tenantId,
      subdomain: "acme",
      companyName: "Acme Construction Co.",
      contactEmail: "admin@acme.com",
      config: {
        branding: {
          primaryColor: "168 76% 36%",
          secondaryColor: "28 85% 52%",
          sidebarColor: "175 35% 15%",
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
    };
    this.tenants.set(tenantId, defaultTenant);

    const tenant2Id = randomUUID();
    const navyTenant: Tenant = {
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
    };
    this.tenants.set(tenant2Id, navyTenant);

    const tenant3Id = randomUUID();
    const forestTenant: Tenant = {
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
    };
    this.tenants.set(tenant3Id, forestTenant);

    const adminUser: TenantUser = {
      id: randomUUID(),
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
    };
    this.tenantUsers.set(adminUser.id, adminUser);

    const pmUser: TenantUser = {
      id: randomUUID(),
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
    };
    this.tenantUsers.set(pmUser.id, pmUser);

    const viewerUser: TenantUser = {
      id: randomUUID(),
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
      lastLoginAt: null,
      createdAt: new Date(),
    };
    this.tenantUsers.set(viewerUser.id, viewerUser);

    const projects = [
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

    projects.forEach((p) => {
      const project: Project = {
        id: randomUUID(),
        tenantId,
        name: p.name,
        description: p.description,
        status: p.status,
        startDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000),
        budget: p.budget,
        managerId: pmUser.id,
        metadata: {},
        createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      };
      this.projects.set(project.id, project);

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
      wbsData.forEach((w) => {
        const nodeId = randomUUID();
        nodeIdMap.set(w.code, nodeId);
        
        const node: WbsNode = {
          id: nodeId,
          tenantId,
          projectId: project.id,
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
        };
        this.wbsNodes.set(nodeId, node);
      });
    });
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async getTenantBySubdomain(subdomain: string): Promise<Tenant | undefined> {
    return Array.from(this.tenants.values()).find((t) => t.subdomain === subdomain);
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const id = randomUUID();
    const now = new Date();
    const newTenant: Tenant = {
      id,
      subdomain: tenant.subdomain,
      companyName: tenant.companyName,
      contactEmail: tenant.contactEmail,
      config: tenant.config || {
        branding: { primaryColor: "#0f766e", secondaryColor: "#f97316", logoUrl: null, faviconUrl: null },
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
    };
    this.tenants.set(id, newTenant);
    return newTenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return Array.from(this.tenants.values()).sort((a, b) => 
      a.companyName.localeCompare(b.companyName)
    );
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant | undefined> {
    const tenant = this.tenants.get(id);
    if (!tenant) return undefined;
    const updatedTenant = { ...tenant, ...updates, updatedAt: new Date() };
    this.tenants.set(id, updatedTenant);
    return updatedTenant;
  }

  async getTenantUser(id: string): Promise<TenantUser | undefined> {
    return this.tenantUsers.get(id);
  }

  async getTenantUserByEmail(tenantId: string, email: string): Promise<TenantUser | undefined> {
    return Array.from(this.tenantUsers.values()).find(
      (u) => u.tenantId === tenantId && u.email === email
    );
  }

  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    return Array.from(this.tenantUsers.values()).filter((u) => u.tenantId === tenantId);
  }

  async createTenantUser(user: InsertTenantUser): Promise<TenantUser> {
    const id = randomUUID();
    const newUser: TenantUser = {
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
      lastLoginAt: null,
      createdAt: new Date(),
    };
    this.tenantUsers.set(id, newUser);
    return newUser;
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjects(tenantId: string): Promise<Project[]> {
    return Array.from(this.projects.values())
      .filter((p) => p.tenantId === tenantId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = randomUUID();
    const now = new Date();
    const newProject: Project = {
      id,
      tenantId: project.tenantId,
      name: project.name,
      description: project.description || null,
      status: project.status || "not_started",
      startDate: project.startDate ? new Date(project.startDate) : null,
      endDate: project.endDate ? new Date(project.endDate) : null,
      budget: project.budget || null,
      managerId: project.managerId || null,
      metadata: project.metadata || {},
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    const updated = { ...project, ...updates, updatedAt: new Date() };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    const deleted = this.projects.delete(id);
    if (deleted) {
      Array.from(this.wbsNodes.values())
        .filter((n) => n.projectId === id)
        .forEach((n) => this.wbsNodes.delete(n.id));
    }
    return deleted;
  }

  async getWbsNode(id: string): Promise<WbsNode | undefined> {
    return this.wbsNodes.get(id);
  }

  async getWbsNodes(tenantId: string): Promise<WbsNode[]> {
    return Array.from(this.wbsNodes.values())
      .filter((n) => n.tenantId === tenantId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }

  async getWbsNodesByProject(projectId: string): Promise<WbsNode[]> {
    return Array.from(this.wbsNodes.values())
      .filter((n) => n.projectId === projectId)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
  }

  async createWbsNode(node: InsertWbsNode): Promise<WbsNode> {
    const id = randomUUID();
    const now = new Date();
    
    let codeDisplay = "1";
    const siblings = Array.from(this.wbsNodes.values()).filter(
      (n) => n.projectId === node.projectId && n.parentId === (node.parentId || null)
    );
    
    if (node.parentId) {
      const parent = this.wbsNodes.get(node.parentId);
      if (parent) {
        const childCount = siblings.length + 1;
        codeDisplay = `${parent.codeDisplay}.${childCount}`;
      }
    } else {
      codeDisplay = `${siblings.length + 1}`;
    }
    
    const newNode: WbsNode = {
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
    };
    this.wbsNodes.set(id, newNode);
    return newNode;
  }

  async updateWbsNode(id: string, updates: Partial<WbsNode>): Promise<WbsNode | undefined> {
    const node = this.wbsNodes.get(id);
    if (!node) return undefined;
    const updated = { ...node, ...updates, updatedAt: new Date() };
    this.wbsNodes.set(id, updated);
    return updated;
  }

  async deleteWbsNode(id: string): Promise<boolean> {
    const deleteRecursive = (nodeId: string) => {
      const children = Array.from(this.wbsNodes.values()).filter((n) => n.parentId === nodeId);
      children.forEach((c) => deleteRecursive(c.id));
      this.wbsNodes.delete(nodeId);
    };
    
    if (this.wbsNodes.has(id)) {
      deleteRecursive(id);
      return true;
    }
    return false;
  }

  async getNavigationItems(tenantId: string): Promise<NavigationItem[]> {
    return Array.from(this.navigationItems.values())
      .filter((n) => n.tenantId === tenantId)
      .sort((a, b) => a.itemOrder - b.itemOrder);
  }

  async createNavigationItem(item: InsertNavigationItem): Promise<NavigationItem> {
    const id = randomUUID();
    const now = new Date();
    const newItem: NavigationItem = {
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
    };
    this.navigationItems.set(id, newItem);
    return newItem;
  }

  async getDashboardStats(tenantId: string): Promise<DashboardStats> {
    const projects = Array.from(this.projects.values()).filter((p) => p.tenantId === tenantId);
    const wbsNodes = Array.from(this.wbsNodes.values()).filter((n) => n.tenantId === tenantId);
    const users = Array.from(this.tenantUsers.values()).filter((u) => u.tenantId === tenantId);

    const activeProjects = projects.filter((p) => p.status === "in_progress").length;
    const completedProjects = projects.filter((p) => p.status === "completed").length;
    const completedNodes = wbsNodes.filter((n) => n.status === "completed").length;
    
    const budgetTotal = projects.reduce((sum, p) => sum + parseFloat(p.budget || "0"), 0);
    const budgetUsed = budgetTotal * 0.45;

    return {
      totalProjects: projects.length,
      activeProjects,
      completedProjects,
      totalWbsNodes: wbsNodes.length,
      completedWbsNodes: completedNodes,
      teamMembers: users.length,
      budgetTotal,
      budgetUsed,
    };
  }
}

export const storage = new MemStorage();
