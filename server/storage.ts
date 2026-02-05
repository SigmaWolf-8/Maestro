import { randomUUID } from "crypto";
import { eq, and, desc, sql, inArray, like, or } from "drizzle-orm";
import { db } from "./db";
import {
  tenants,
  tenantUsers,
  projects,
  wbsNodes,
  navigationItems,
  wbsTemplates,
  userGroups,
  userGroupMembers,
  groupPermissions,
  documents,
  wbsMasterCodes,
  documentMetaTags,
  customers,
  quotes,
  vendors,
  vendorContacts,
  type Tenant,
  type TenantUser,
  type Project,
  type WbsNode,
  type NavigationItem,
  type WbsTemplate,
  type UserGroup,
  type UserGroupMember,
  type GroupPermission,
  type Document,
  type WbsMasterCode,
  type DocumentMetaTag,
  type Customer,
  type Quote,
  type Vendor,
  type VendorContact,
  type InsertTenant,
  type InsertTenantUser,
  type InsertProject,
  type InsertWbsNode,
  type InsertNavigationItem,
  type InsertWbsTemplate,
  type InsertUserGroup,
  type InsertUserGroupMember,
  type InsertGroupPermission,
  type InsertDocument,
  type InsertWbsMasterCode,
  type InsertDocumentMetaTag,
  type InsertCustomer,
  type InsertQuote,
  type InsertVendor,
  type InsertVendorContact,
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
  
  getWbsTemplates(tenantId: string): Promise<WbsTemplate[]>;
  getWbsTemplate(id: string): Promise<WbsTemplate | undefined>;
  createWbsTemplate(template: InsertWbsTemplate): Promise<WbsTemplate>;
  updateWbsTemplate(id: string, updates: Partial<WbsTemplate>): Promise<WbsTemplate | undefined>;
  deleteWbsTemplate(id: string): Promise<boolean>;
  
  getDashboardStats(tenantId: string): Promise<DashboardStats>;
  
  // User Groups
  getUserGroups(tenantId: string): Promise<UserGroup[]>;
  getUserGroup(id: string): Promise<UserGroup | undefined>;
  createUserGroup(group: InsertUserGroup): Promise<UserGroup>;
  updateUserGroup(id: string, updates: Partial<UserGroup>): Promise<UserGroup | undefined>;
  deleteUserGroup(id: string): Promise<boolean>;
  
  // User Group Members
  getUserGroupMembers(groupId: string): Promise<UserGroupMember[]>;
  getUserGroupsForUser(userId: string): Promise<UserGroup[]>;
  addUserToGroup(member: InsertUserGroupMember): Promise<UserGroupMember>;
  removeUserFromGroup(groupId: string, userId: string): Promise<boolean>;
  
  // Group Permissions
  getGroupPermissions(groupId: string): Promise<GroupPermission[]>;
  getPermissionsForNavItem(tenantId: string, navigationItemId: string): Promise<GroupPermission[]>;
  setGroupPermission(permission: InsertGroupPermission): Promise<GroupPermission>;
  updateGroupPermission(id: string, updates: Partial<GroupPermission>): Promise<GroupPermission | undefined>;
  deleteGroupPermission(id: string): Promise<boolean>;
  
  // Documents
  getDocuments(tenantId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByProject(projectId: string): Promise<Document[]>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;
  
  // WBS Master Codes (13-Dimensional)
  getWbsMasterCodes(tenantId: string, dimensionType?: string): Promise<WbsMasterCode[]>;
  getWbsMasterCode(id: string): Promise<WbsMasterCode | undefined>;
  createWbsMasterCode(code: InsertWbsMasterCode): Promise<WbsMasterCode>;
  updateWbsMasterCode(id: string, updates: Partial<WbsMasterCode>): Promise<WbsMasterCode | undefined>;
  deleteWbsMasterCode(id: string): Promise<boolean>;
  
  // Document Meta Tags
  getDocumentMetaTags(documentId: string): Promise<DocumentMetaTag[]>;
  setDocumentMetaTags(documentId: string, tags: Omit<InsertDocumentMetaTag, 'documentId'>[]): Promise<DocumentMetaTag[]>;
  deleteDocumentMetaTags(documentId: string): Promise<boolean>;
  getDocumentsWithMetaTags(tenantId: string, filters: Record<string, string[]>): Promise<Document[]>;
  
  // Customers (from MS Access form)
  getCustomers(tenantId: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByJobNum(tenantId: string, jobNum: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined>;
  updateCustomerField(tenantId: string, jobNum: number, field: keyof Customer, value: any): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  
  // Quotes (from MS Access form)
  getQuotes(tenantId: string): Promise<Quote[]>;
  getQuote(id: string): Promise<Quote | undefined>;
  getQuoteByJobNum(tenantId: string, jobNum: number): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined>;
  updateQuoteField(tenantId: string, jobNum: number, field: keyof Quote, value: any): Promise<Quote | undefined>;
  deleteQuote(id: string): Promise<boolean>;
  
  // Vendors (from MS Access SalviVendors form)
  getVendors(tenantId: string): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  getVendorByCompany(tenantId: string, company: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | undefined>;
  updateVendorField(id: string, field: keyof Vendor, value: any): Promise<Vendor | undefined>;
  deleteVendor(id: string): Promise<boolean>;
  
  // Vendor Contacts (from MS Access SalviContacts form)
  getVendorContacts(vendorId: string): Promise<VendorContact[]>;
  getAllVendorContacts(tenantId: string): Promise<{ contact: VendorContact; vendorName: string }[]>;
  getVendorContact(id: string): Promise<VendorContact | undefined>;
  getPrimaryVendorContact(vendorId: string): Promise<VendorContact | undefined>;
  createVendorContact(contact: InsertVendorContact): Promise<VendorContact>;
  updateVendorContact(id: string, updates: Partial<VendorContact>): Promise<VendorContact | undefined>;
  deleteVendorContact(id: string): Promise<boolean>;
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

  async getWbsTemplates(tenantId: string): Promise<WbsTemplate[]> {
    return db.select().from(wbsTemplates).where(eq(wbsTemplates.tenantId, tenantId));
  }

  async getWbsTemplate(id: string): Promise<WbsTemplate | undefined> {
    const [template] = await db.select().from(wbsTemplates).where(eq(wbsTemplates.id, id));
    return template || undefined;
  }

  async createWbsTemplate(template: InsertWbsTemplate): Promise<WbsTemplate> {
    const id = randomUUID();
    const now = new Date();
    const [newTemplate] = await db.insert(wbsTemplates).values({
      id,
      tenantId: template.tenantId,
      name: template.name,
      description: template.description || null,
      category: template.category || null,
      structure: template.structure || [],
      isActive: template.isActive ?? true,
      createdBy: template.createdBy || null,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return newTemplate;
  }

  async updateWbsTemplate(id: string, updates: Partial<WbsTemplate>): Promise<WbsTemplate | undefined> {
    const [updated] = await db.update(wbsTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(wbsTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWbsTemplate(id: string): Promise<boolean> {
    const result = await db.delete(wbsTemplates).where(eq(wbsTemplates.id, id));
    return (result.rowCount ?? 0) > 0;
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

  // User Groups
  async getUserGroups(tenantId: string): Promise<UserGroup[]> {
    return db.select().from(userGroups).where(eq(userGroups.tenantId, tenantId)).orderBy(userGroups.name);
  }

  async getUserGroup(id: string): Promise<UserGroup | undefined> {
    const [group] = await db.select().from(userGroups).where(eq(userGroups.id, id));
    return group || undefined;
  }

  async createUserGroup(group: InsertUserGroup): Promise<UserGroup> {
    const id = randomUUID();
    const now = new Date();
    const [newGroup] = await db.insert(userGroups).values({
      id,
      ...group,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return newGroup;
  }

  async updateUserGroup(id: string, updates: Partial<UserGroup>): Promise<UserGroup | undefined> {
    const [updated] = await db.update(userGroups)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userGroups.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteUserGroup(id: string): Promise<boolean> {
    // First delete all group members and permissions
    await db.delete(userGroupMembers).where(eq(userGroupMembers.groupId, id));
    await db.delete(groupPermissions).where(eq(groupPermissions.groupId, id));
    const result = await db.delete(userGroups).where(eq(userGroups.id, id));
    return true;
  }

  // User Group Members
  async getUserGroupMembers(groupId: string): Promise<UserGroupMember[]> {
    return db.select().from(userGroupMembers).where(eq(userGroupMembers.groupId, groupId));
  }

  async getUserGroupsForUser(userId: string): Promise<UserGroup[]> {
    const memberships = await db.select().from(userGroupMembers).where(eq(userGroupMembers.userId, userId));
    const groupIds = memberships.map(m => m.groupId);
    if (groupIds.length === 0) return [];
    
    const groups = await db.select().from(userGroups);
    return groups.filter(g => groupIds.includes(g.id));
  }

  async addUserToGroup(member: InsertUserGroupMember): Promise<UserGroupMember> {
    const id = randomUUID();
    const [newMember] = await db.insert(userGroupMembers).values({
      id,
      ...member,
      createdAt: new Date(),
    }).returning();
    return newMember;
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<boolean> {
    await db.delete(userGroupMembers).where(
      and(eq(userGroupMembers.groupId, groupId), eq(userGroupMembers.userId, userId))
    );
    return true;
  }

  // Group Permissions
  async getGroupPermissions(groupId: string): Promise<GroupPermission[]> {
    return db.select().from(groupPermissions).where(eq(groupPermissions.groupId, groupId));
  }

  async getPermissionsForNavItem(tenantId: string, navigationItemId: string): Promise<GroupPermission[]> {
    return db.select().from(groupPermissions).where(
      and(eq(groupPermissions.tenantId, tenantId), eq(groupPermissions.navigationItemId, navigationItemId))
    );
  }

  async setGroupPermission(permission: InsertGroupPermission): Promise<GroupPermission> {
    // Check if permission already exists for this group + navigation item
    const [existing] = await db.select().from(groupPermissions).where(
      and(
        eq(groupPermissions.groupId, permission.groupId),
        eq(groupPermissions.navigationItemId, permission.navigationItemId)
      )
    );
    
    if (existing) {
      // Update existing permission
      const [updated] = await db.update(groupPermissions)
        .set({
          canView: permission.canView,
          canCreate: permission.canCreate,
          canEdit: permission.canEdit,
          canDelete: permission.canDelete,
          inheritToChildren: permission.inheritToChildren,
          updatedAt: new Date(),
        })
        .where(eq(groupPermissions.id, existing.id))
        .returning();
      return updated;
    }
    
    // Insert new permission
    const id = randomUUID();
    const now = new Date();
    const [newPerm] = await db.insert(groupPermissions).values({
      id,
      ...permission,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return newPerm;
  }

  async updateGroupPermission(id: string, updates: Partial<GroupPermission>): Promise<GroupPermission | undefined> {
    const [updated] = await db.update(groupPermissions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(groupPermissions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteGroupPermission(id: string): Promise<boolean> {
    await db.delete(groupPermissions).where(eq(groupPermissions.id, id));
    return true;
  }

  // Documents
  async getDocuments(tenantId: string): Promise<Document[]> {
    return db.select().from(documents)
      .where(eq(documents.tenantId, tenantId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc || undefined;
  }

  async getDocumentsByProject(projectId: string): Promise<Document[]> {
    return db.select().from(documents)
      .where(eq(documents.projectId, projectId))
      .orderBy(desc(documents.createdAt));
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const now = new Date();
    const [newDoc] = await db.insert(documents).values({
      id,
      tenantId: doc.tenantId,
      projectId: doc.projectId || null,
      name: doc.name,
      description: doc.description || null,
      category: doc.category || "general",
      status: doc.status || "draft",
      originalFilename: doc.originalFilename || null,
      mimeType: doc.mimeType || null,
      originalSizeBytes: doc.originalSizeBytes || null,
      compressedSizeBytes: doc.compressedSizeBytes || null,
      isEncrypted: doc.isEncrypted ?? false,
      encryptionMode: doc.encryptionMode || null,
      encryptedContent: doc.encryptedContent || null,
      plainContent: doc.plainContent || null,
      checksum: doc.checksum || null,
      kongTimestamp: doc.kongTimestamp || null,
      savingsPercent: doc.savingsPercent || null,
      uploadedBy: doc.uploadedBy || null,
      metadata: doc.metadata || {},
      createdAt: now,
      updatedAt: now,
    }).returning();
    return newDoc;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
    const [updated] = await db.update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteDocument(id: string): Promise<boolean> {
    // Also delete associated meta tags
    await db.delete(documentMetaTags).where(eq(documentMetaTags.documentId, id));
    const result = await db.delete(documents).where(eq(documents.id, id)).returning();
    return result.length > 0;
  }

  // WBS Master Codes (13-Dimensional)
  async getWbsMasterCodes(tenantId: string, dimensionType?: string): Promise<WbsMasterCode[]> {
    if (dimensionType) {
      return db.select().from(wbsMasterCodes)
        .where(and(
          eq(wbsMasterCodes.tenantId, tenantId),
          eq(wbsMasterCodes.dimensionType, dimensionType),
          eq(wbsMasterCodes.isActive, true)
        ))
        .orderBy(wbsMasterCodes.sortOrder);
    }
    return db.select().from(wbsMasterCodes)
      .where(and(eq(wbsMasterCodes.tenantId, tenantId), eq(wbsMasterCodes.isActive, true)))
      .orderBy(wbsMasterCodes.dimensionType, wbsMasterCodes.sortOrder);
  }

  async getWbsMasterCode(id: string): Promise<WbsMasterCode | undefined> {
    const [code] = await db.select().from(wbsMasterCodes).where(eq(wbsMasterCodes.id, id));
    return code || undefined;
  }

  async createWbsMasterCode(code: InsertWbsMasterCode): Promise<WbsMasterCode> {
    const id = randomUUID();
    const now = new Date();
    const [newCode] = await db.insert(wbsMasterCodes).values({
      id,
      tenantId: code.tenantId,
      dimensionType: code.dimensionType,
      code: code.code,
      name: code.name,
      description: code.description || null,
      parentCodeId: code.parentCodeId || null,
      sortOrder: code.sortOrder ?? 0,
      isActive: code.isActive ?? true,
      metadata: code.metadata || {},
      createdAt: now,
      updatedAt: now,
    }).returning();
    return newCode;
  }

  async updateWbsMasterCode(id: string, updates: Partial<WbsMasterCode>): Promise<WbsMasterCode | undefined> {
    const [updated] = await db.update(wbsMasterCodes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(wbsMasterCodes.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteWbsMasterCode(id: string): Promise<boolean> {
    // Soft delete by setting isActive to false
    const result = await db.update(wbsMasterCodes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(wbsMasterCodes.id, id))
      .returning();
    return result.length > 0;
  }

  // Document Meta Tags
  async getDocumentMetaTags(documentId: string): Promise<DocumentMetaTag[]> {
    return db.select().from(documentMetaTags)
      .where(eq(documentMetaTags.documentId, documentId));
  }

  async setDocumentMetaTags(documentId: string, tags: Omit<InsertDocumentMetaTag, 'documentId'>[]): Promise<DocumentMetaTag[]> {
    // Delete existing tags for this document
    await db.delete(documentMetaTags).where(eq(documentMetaTags.documentId, documentId));
    
    if (tags.length === 0) return [];
    
    // Insert new tags
    const now = new Date();
    const tagsToInsert = tags.map(tag => ({
      id: randomUUID(),
      documentId,
      dimensionType: tag.dimensionType,
      wbsCodeId: tag.wbsCodeId || null,
      customValue: tag.customValue || null,
      createdAt: now,
    }));
    
    return db.insert(documentMetaTags).values(tagsToInsert).returning();
  }

  async deleteDocumentMetaTags(documentId: string): Promise<boolean> {
    await db.delete(documentMetaTags).where(eq(documentMetaTags.documentId, documentId));
    return true;
  }

  async getDocumentsWithMetaTags(tenantId: string, filters: Record<string, string[]>): Promise<Document[]> {
    // If no filters, return all documents for tenant
    if (Object.keys(filters).length === 0) {
      return this.getDocuments(tenantId);
    }
    
    // Get all documents for tenant first
    const allDocs = await this.getDocuments(tenantId);
    
    // For each document, check if it matches all filters
    const matchedDocs: Document[] = [];
    for (const doc of allDocs) {
      const docTags = await this.getDocumentMetaTags(doc.id);
      
      let matchesAllFilters = true;
      for (const [dimensionType, values] of Object.entries(filters)) {
        if (values.length === 0) continue;
        
        const tagForDimension = docTags.find(t => t.dimensionType === dimensionType);
        if (!tagForDimension) {
          matchesAllFilters = false;
          break;
        }
        
        // Check if tag value matches any of the filter values
        const tagValue = tagForDimension.wbsCodeId || tagForDimension.customValue;
        if (!tagValue || !values.includes(tagValue)) {
          matchesAllFilters = false;
          break;
        }
      }
      
      if (matchesAllFilters) {
        matchedDocs.push(doc);
      }
    }
    
    return matchedDocs;
  }

  // Customers (from MS Access form)
  async getCustomers(tenantId: string): Promise<Customer[]> {
    return db.select().from(customers).where(eq(customers.tenantId, tenantId)).orderBy(customers.jobNum);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async getCustomerByJobNum(tenantId: string, jobNum: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.jobNum, jobNum)));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const [created] = await db.insert(customers).values({ ...customer, id }).returning();
    return created;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updated || undefined;
  }

  async updateCustomerField(tenantId: string, jobNum: number, field: keyof Customer, value: any): Promise<Customer | undefined> {
    const customer = await this.getCustomerByJobNum(tenantId, jobNum);
    if (!customer) return undefined;
    
    const [updated] = await db.update(customers)
      .set({ [field]: value, updatedAt: new Date() })
      .where(eq(customers.id, customer.id))
      .returning();
    return updated || undefined;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id));
    return true;
  }

  // Quotes (from MS Access form)
  async getQuotes(tenantId: string): Promise<Quote[]> {
    return db.select().from(quotes).where(eq(quotes.tenantId, tenantId)).orderBy(quotes.jobNum);
  }

  async getQuote(id: string): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
    return quote || undefined;
  }

  async getQuoteByJobNum(tenantId: string, jobNum: number): Promise<Quote | undefined> {
    const [quote] = await db.select().from(quotes)
      .where(and(eq(quotes.tenantId, tenantId), eq(quotes.jobNum, jobNum)));
    return quote || undefined;
  }

  async createQuote(quote: InsertQuote): Promise<Quote> {
    const id = randomUUID();
    const [created] = await db.insert(quotes).values({ ...quote, id }).returning();
    return created;
  }

  async updateQuote(id: string, updates: Partial<Quote>): Promise<Quote | undefined> {
    const [updated] = await db.update(quotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(quotes.id, id))
      .returning();
    return updated || undefined;
  }

  async updateQuoteField(tenantId: string, jobNum: number, field: keyof Quote, value: any): Promise<Quote | undefined> {
    const quote = await this.getQuoteByJobNum(tenantId, jobNum);
    if (!quote) return undefined;
    
    const [updated] = await db.update(quotes)
      .set({ [field]: value, updatedAt: new Date() })
      .where(eq(quotes.id, quote.id))
      .returning();
    return updated || undefined;
  }

  async deleteQuote(id: string): Promise<boolean> {
    const result = await db.delete(quotes).where(eq(quotes.id, id));
    return true;
  }

  // Vendors implementation
  async getVendors(tenantId: string): Promise<Vendor[]> {
    return db.select().from(vendors).where(eq(vendors.tenantId, tenantId)).orderBy(vendors.company);
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor || undefined;
  }

  async getVendorByCompany(tenantId: string, company: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(
      and(eq(vendors.tenantId, tenantId), eq(vendors.company, company))
    );
    return vendor || undefined;
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    const id = randomUUID();
    const [created] = await db.insert(vendors).values({ ...vendor, id }).returning();
    return created;
  }

  async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | undefined> {
    const [updated] = await db.update(vendors).set({ ...updates, updatedAt: new Date() }).where(eq(vendors.id, id)).returning();
    return updated || undefined;
  }

  async updateVendorField(id: string, field: keyof Vendor, value: any): Promise<Vendor | undefined> {
    const updateData: any = { [field]: value, updatedAt: new Date() };
    const [updated] = await db.update(vendors).set(updateData).where(eq(vendors.id, id)).returning();
    return updated || undefined;
  }

  async deleteVendor(id: string): Promise<boolean> {
    await db.delete(vendorContacts).where(eq(vendorContacts.vendorId, id));
    await db.delete(vendors).where(eq(vendors.id, id));
    return true;
  }

  // Vendor Contacts implementation
  async getVendorContacts(vendorId: string): Promise<VendorContact[]> {
    return db.select().from(vendorContacts).where(eq(vendorContacts.vendorId, vendorId));
  }

  async getAllVendorContacts(tenantId: string): Promise<{ contact: VendorContact; vendorName: string }[]> {
    const results = await db
      .select({
        contact: vendorContacts,
        vendorName: vendors.company,
      })
      .from(vendorContacts)
      .innerJoin(vendors, eq(vendorContacts.vendorId, vendors.id))
      .where(eq(vendorContacts.tenantId, tenantId));
    return results;
  }

  async getVendorContact(id: string): Promise<VendorContact | undefined> {
    const [contact] = await db.select().from(vendorContacts).where(eq(vendorContacts.id, id));
    return contact || undefined;
  }

  async getPrimaryVendorContact(vendorId: string): Promise<VendorContact | undefined> {
    const [contact] = await db.select().from(vendorContacts).where(
      and(eq(vendorContacts.vendorId, vendorId), eq(vendorContacts.isPrimary, true))
    );
    return contact || undefined;
  }

  async createVendorContact(contact: InsertVendorContact): Promise<VendorContact> {
    const id = randomUUID();
    const [created] = await db.insert(vendorContacts).values({ ...contact, id }).returning();
    return created;
  }

  async updateVendorContact(id: string, updates: Partial<VendorContact>): Promise<VendorContact | undefined> {
    const [updated] = await db.update(vendorContacts).set({ ...updates, updatedAt: new Date() }).where(eq(vendorContacts.id, id)).returning();
    return updated || undefined;
  }

  async deleteVendorContact(id: string): Promise<boolean> {
    await db.delete(vendorContacts).where(eq(vendorContacts.id, id));
    return true;
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

  // Seed Navigation Items for all tenants
  const allTenantIds = [tenantId, tenant2Id, tenant3Id];
  for (const tid of allTenantIds) {
    await seedNavigationForTenant(tid);
  }

  console.log("Database seeded successfully with sample data and navigation structure");
}

export async function seedNavigationForTenant(tenantId: string) {
  const navDashboardId = randomUUID();
  const navProjectsId = randomUUID();
  const navPeopleId = randomUUID();
  const navFinanceId = randomUUID();
  const navDocumentsId = randomUUID();

  // Top-level navigation items (5 sections)
  await db.insert(navigationItems).values([
    {
      id: navDashboardId,
      tenantId,
      parentId: null,
      itemOrder: 10,
      itemType: "menu",
      title: "Dashboard",
      iconName: "LayoutDashboard",
      path: "/",
      component: "Dashboard",
      uiSlot: "sidebar",
      maxChildrenDisplay: 3,
      isCollapsible: true,
      minRoleRequired: "viewer",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: navProjectsId,
      tenantId,
      parentId: null,
      itemOrder: 20,
      itemType: "menu",
      title: "Projects",
      iconName: "FolderKanban",
      path: null,
      component: null,
      uiSlot: "sidebar",
      maxChildrenDisplay: 5,
      isCollapsible: true,
      minRoleRequired: "viewer",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: navPeopleId,
      tenantId,
      parentId: null,
      itemOrder: 30,
      itemType: "menu",
      title: "People",
      iconName: "Users",
      path: null,
      component: null,
      uiSlot: "sidebar",
      maxChildrenDisplay: 5,
      isCollapsible: true,
      minRoleRequired: "viewer",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: navFinanceId,
      tenantId,
      parentId: null,
      itemOrder: 40,
      itemType: "menu",
      title: "Finance",
      iconName: "Landmark",
      path: null,
      component: null,
      uiSlot: "sidebar",
      maxChildrenDisplay: 5,
      isCollapsible: true,
      minRoleRequired: "accountant",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: navDocumentsId,
      tenantId,
      parentId: null,
      itemOrder: 50,
      itemType: "menu",
      title: "Documents",
      iconName: "FolderArchive",
      path: null,
      component: null,
      uiSlot: "sidebar",
      maxChildrenDisplay: 5,
      isCollapsible: true,
      minRoleRequired: "viewer",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // Dashboard sub-items (3 items max)
  await db.insert(navigationItems).values([
    { id: randomUUID(), tenantId, parentId: navDashboardId, itemOrder: 1, itemType: "action", title: "Overview", iconName: "Home", path: "/", minRoleRequired: "viewer", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navDashboardId, itemOrder: 2, itemType: "action", title: "My Tasks", iconName: "CheckSquare", path: "/tasks", minRoleRequired: "viewer", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navDashboardId, itemOrder: 3, itemType: "action", title: "Alerts", iconName: "Bell", path: "/alerts", minRoleRequired: "viewer", createdAt: new Date(), updatedAt: new Date() },
  ]);

  // Projects sub-items (5 items max)
  await db.insert(navigationItems).values([
    { id: randomUUID(), tenantId, parentId: navProjectsId, itemOrder: 1, itemType: "action", title: "All Projects", iconName: "Folder", path: "/projects", minRoleRequired: "viewer", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navProjectsId, itemOrder: 2, itemType: "action", title: "WBS Builder", iconName: "GitBranch", path: "/wbs", minRoleRequired: "project_manager", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navProjectsId, itemOrder: 3, itemType: "action", title: "Schedule", iconName: "Calendar", path: "/schedule", minRoleRequired: "viewer", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navProjectsId, itemOrder: 4, itemType: "action", title: "Specifications", iconName: "FileText", path: "/specifications", minRoleRequired: "viewer", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navProjectsId, itemOrder: 5, itemType: "action", title: "Photos", iconName: "Camera", path: "/photos", minRoleRequired: "viewer", createdAt: new Date(), updatedAt: new Date() },
  ]);

  // People & Contacts sub-items (5 items max)
  await db.insert(navigationItems).values([
    { id: randomUUID(), tenantId, parentId: navPeopleId, itemOrder: 1, itemType: "action", title: "Customers", iconName: "Building", path: "/people/customers", minRoleRequired: "project_manager", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navPeopleId, itemOrder: 2, itemType: "action", title: "Vendors & Pricing", iconName: "Truck", path: "/people/vendors", minRoleRequired: "project_manager", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navPeopleId, itemOrder: 3, itemType: "action", title: "Employees", iconName: "User", path: "/people/employees", minRoleRequired: "project_manager", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navPeopleId, itemOrder: 4, itemType: "action", title: "Subcontractors", iconName: "HardHat", path: "/people/subcontractors", minRoleRequired: "project_manager", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navPeopleId, itemOrder: 5, itemType: "action", title: "Contacts Directory", iconName: "Contact", path: "/people/directory", minRoleRequired: "viewer", createdAt: new Date(), updatedAt: new Date() },
  ]);

  // Finance sub-items (5 items max)
  await db.insert(navigationItems).values([
    { id: randomUUID(), tenantId, parentId: navFinanceId, itemOrder: 1, itemType: "action", title: "Estimating", iconName: "Calculator", path: "/finance/estimating", minRoleRequired: "project_manager", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navFinanceId, itemOrder: 2, itemType: "action", title: "Purchase Orders", iconName: "ClipboardList", path: "/finance/purchase-orders", minRoleRequired: "project_manager", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navFinanceId, itemOrder: 3, itemType: "action", title: "Invoicing", iconName: "Receipt", path: "/finance/invoicing", minRoleRequired: "accountant", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navFinanceId, itemOrder: 4, itemType: "action", title: "Expenses", iconName: "CreditCard", path: "/finance/expenses", minRoleRequired: "accountant", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navFinanceId, itemOrder: 5, itemType: "action", title: "Reports & GL", iconName: "BarChart", path: "/finance/reports", minRoleRequired: "accountant", createdAt: new Date(), updatedAt: new Date() },
  ]);

  // Documents sub-items (5 items max)
  await db.insert(navigationItems).values([
    { id: randomUUID(), tenantId, parentId: navDocumentsId, itemOrder: 1, itemType: "action", title: "File Manager", iconName: "Files", path: "/documents/files", minRoleRequired: "viewer", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navDocumentsId, itemOrder: 2, itemType: "action", title: "Plan Room", iconName: "Map", path: "/documents/plans", minRoleRequired: "viewer", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navDocumentsId, itemOrder: 3, itemType: "action", title: "Templates", iconName: "FileCode", path: "/documents/templates", minRoleRequired: "project_manager", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navDocumentsId, itemOrder: 4, itemType: "action", title: "Reports", iconName: "FileBarChart", path: "/documents/reports", minRoleRequired: "viewer", createdAt: new Date(), updatedAt: new Date() },
    { id: randomUUID(), tenantId, parentId: navDocumentsId, itemOrder: 5, itemType: "action", title: "Archives", iconName: "Archive", path: "/documents/archives", minRoleRequired: "viewer", createdAt: new Date(), updatedAt: new Date() },
  ]);
}
