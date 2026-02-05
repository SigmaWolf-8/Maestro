import { pgTable, text, varchar, boolean, integer, jsonb, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const userRoles = ["admin", "project_manager", "accountant", "viewer"] as const;
export type UserRole = typeof userRoles[number];

export const projectStatuses = ["not_started", "in_progress", "on_hold", "completed", "cancelled"] as const;
export type ProjectStatus = typeof projectStatuses[number];

export const wbsNodeStatuses = ["not_started", "in_progress", "on_hold", "completed", "cancelled"] as const;
export type WbsNodeStatus = typeof wbsNodeStatuses[number];

export const navItemTypes = ["menu", "action", "divider", "header"] as const;
export type NavItemType = typeof navItemTypes[number];

export const uiSlots = ["sidebar", "topbar", "dashboard", "toolbar"] as const;
export type UiSlot = typeof uiSlots[number];

export const tenants = pgTable("tenants", {
  id: varchar("id", { length: 36 }).primaryKey(),
  subdomain: text("subdomain").notNull().unique(),
  companyName: text("company_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  config: jsonb("config").notNull().default({
    branding: {
      primaryColor: "0 0% 25%",
      secondaryColor: "0 0% 45%",
      sidebarColor: "0 0% 8%",
      fontStyle: "elegant",
      logoUrl: null,
      faviconUrl: null
    },
    modules: {
      hrSync: false,
      advancedWbs: true,
      documentTemplating: false
    },
    wbsDimensions: [
      { key: "phase", label: "Project Phase", required: true },
      { key: "trade", label: "Trade", required: true },
      { key: "location", label: "Unit/Location", required: false }
    ]
  }),
  storageMode: text("storage_mode").notNull().default("cloud"),
  onboardingComplete: boolean("onboarding_complete").default(false),
  instanceStatus: text("instance_status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const tenantUsers = pgTable("tenant_users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  email: text("email").notNull(),
  role: text("role").notNull().default("viewer"),
  profile: jsonb("profile").notNull().default({
    firstName: null,
    lastName: null,
    jobTitle: null,
    department: null,
    avatarUrl: null
  }),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const projects = pgTable("projects", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("not_started"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  managerId: varchar("manager_id", { length: 36 }).references(() => tenantUsers.id),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const wbsNodes = pgTable("wbs_nodes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id),
  parentId: varchar("parent_id", { length: 36 }),
  codePath: text("code_path").notNull(),
  codeDisplay: text("code_display"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("not_started"),
  dimensions: jsonb("dimensions").notNull().default({}),
  estimatedHours: decimal("estimated_hours", { precision: 10, scale: 2 }),
  estimatedCost: decimal("estimated_cost", { precision: 15, scale: 2 }),
  actualHours: decimal("actual_hours", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 15, scale: 2 }),
  assignedTo: varchar("assigned_to", { length: 36 }).references(() => tenantUsers.id),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const navigationItems = pgTable("navigation_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  parentId: varchar("parent_id", { length: 36 }),
  itemOrder: integer("item_order").notNull().default(0),
  itemType: text("item_type").notNull().default("menu"),
  title: text("title").notNull(),
  iconName: text("icon_name"),
  path: text("path"),
  component: text("component"),
  uiSlot: text("ui_slot").default("sidebar"),
  maxChildrenDisplay: integer("max_children_display").default(5),
  isCollapsible: boolean("is_collapsible").default(true),
  minRoleRequired: text("min_role_required").default("viewer"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  navigationItemId: varchar("navigation_item_id", { length: 36 }).notNull().references(() => navigationItems.id),
  userRole: text("user_role").notNull(),
  canView: boolean("can_view").default(true),
  canAccess: boolean("can_access").default(true),
  canAction: boolean("can_action").default(false),
  inheritFromParent: boolean("inherit_from_parent").default(true)
});

export const wbsTemplates = pgTable("wbs_templates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  structure: jsonb("structure").notNull().default([]),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by", { length: 36 }).references(() => tenantUsers.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// User Groups for security module
export const userGroups = pgTable("user_groups", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// User Group Memberships
export const userGroupMembers = pgTable("user_group_members", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  groupId: varchar("group_id", { length: 36 }).notNull().references(() => userGroups.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => tenantUsers.id),
  createdAt: timestamp("created_at").defaultNow()
});

// Group Permissions - what forms/navigation items each group can access
export const groupPermissions = pgTable("group_permissions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  groupId: varchar("group_id", { length: 36 }).notNull().references(() => userGroups.id),
  navigationItemId: varchar("navigation_item_id", { length: 36 }).notNull().references(() => navigationItems.id),
  canView: boolean("can_view").default(false),
  canCreate: boolean("can_create").default(false),
  canEdit: boolean("can_edit").default(false),
  canDelete: boolean("can_delete").default(false),
  inheritToChildren: boolean("inherit_to_children").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const documentStatuses = ["draft", "pending_review", "approved", "archived", "encrypted"] as const;
export type DocumentStatus = typeof documentStatuses[number];

export const encryptionModes = ["high_security", "balanced", "performance", "adaptive"] as const;
export type EncryptionMode = typeof encryptionModes[number];

export const documents = pgTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  status: text("status").notNull().default("draft"),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  originalSizeBytes: integer("original_size_bytes"),
  compressedSizeBytes: integer("compressed_size_bytes"),
  isEncrypted: boolean("is_encrypted").default(false),
  encryptionMode: text("encryption_mode"),
  encryptedContent: text("encrypted_content"),
  plainContent: text("plain_content"),
  checksum: text("checksum"),
  kongTimestamp: text("kong_timestamp"),
  savingsPercent: decimal("savings_percent", { precision: 5, scale: 2 }),
  uploadedBy: varchar("uploaded_by", { length: 36 }).references(() => tenantUsers.id),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantUserSchema = createInsertSchema(tenantUsers).omit({ id: true, createdAt: true, lastLoginAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWbsNodeSchema = createInsertSchema(wbsNodes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNavigationItemSchema = createInsertSchema(navigationItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true });
export const insertWbsTemplateSchema = createInsertSchema(wbsTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserGroupSchema = createInsertSchema(userGroups).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserGroupMemberSchema = createInsertSchema(userGroupMembers).omit({ id: true, createdAt: true });
export const insertGroupPermissionSchema = createInsertSchema(groupPermissions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });

// 13-Dimensional WBS Master Codes Table
export const wbsDimensionTypes = [
  "phase",           // 1. Project Phase (Pre-construction, Construction, Close-out)
  "trade",           // 2. Trade/CSI Division (Electrical, Plumbing, HVAC)
  "location",        // 3. Location/Area (Site, Building A, Parking)
  "building",        // 4. Building/Structure identifier
  "level",           // 5. Level/Floor (L1, L2, Basement)
  "zone",            // 6. Zone within floor (Zone A, Zone B)
  "system",          // 7. Building System (Mechanical, Electrical, Fire)
  "subsystem",       // 8. Subsystem (Lighting, Power, HVAC Controls)
  "element_type",    // 9. Element Type (Wall, Door, Window, Fixture)
  "material",        // 10. Material Type (Concrete, Steel, Wood)
  "work_package",    // 11. Work Package identifier
  "cost_code",       // 12. Cost Accounting Code
  "responsibility",  // 13. Responsible Party/Department
] as const;
export type WbsDimensionType = typeof wbsDimensionTypes[number];

// Master WBS Codes table - stores all possible code values for each dimension
export const wbsMasterCodes = pgTable("wbs_master_codes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  dimensionType: text("dimension_type").notNull(), // One of the 13 dimensions
  code: text("code").notNull(), // Short code (e.g., "01", "A1", "ELEC")
  name: text("name").notNull(), // Full name (e.g., "Electrical", "Phase 1")
  description: text("description"),
  parentCodeId: varchar("parent_code_id", { length: 36 }), // For hierarchical codes
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata").default({}), // Additional properties
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Document Meta Tags - links documents to WBS dimension codes
export const documentMetaTags = pgTable("document_meta_tags", {
  id: varchar("id", { length: 36 }).primaryKey(),
  documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id),
  dimensionType: text("dimension_type").notNull(), // One of the 13 dimensions
  wbsCodeId: varchar("wbs_code_id", { length: 36 }).references(() => wbsMasterCodes.id), // Link to master code
  customValue: text("custom_value"), // For free-form values if no master code
  createdAt: timestamp("created_at").defaultNow()
});

// Insert schemas for new tables
export const insertWbsMasterCodeSchema = createInsertSchema(wbsMasterCodes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentMetaTagSchema = createInsertSchema(documentMetaTags).omit({ id: true, createdAt: true });

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type InsertTenantUser = z.infer<typeof insertTenantUserSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertWbsNode = z.infer<typeof insertWbsNodeSchema>;
export type InsertNavigationItem = z.infer<typeof insertNavigationItemSchema>;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type InsertWbsTemplate = z.infer<typeof insertWbsTemplateSchema>;
export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;
export type InsertUserGroupMember = z.infer<typeof insertUserGroupMemberSchema>;
export type InsertGroupPermission = z.infer<typeof insertGroupPermissionSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertWbsMasterCode = z.infer<typeof insertWbsMasterCodeSchema>;
export type InsertDocumentMetaTag = z.infer<typeof insertDocumentMetaTagSchema>;

export type Tenant = typeof tenants.$inferSelect;
export type TenantUser = typeof tenantUsers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type WbsNode = typeof wbsNodes.$inferSelect;
export type NavigationItem = typeof navigationItems.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type WbsTemplate = typeof wbsTemplates.$inferSelect;
export type UserGroup = typeof userGroups.$inferSelect;
export type UserGroupMember = typeof userGroupMembers.$inferSelect;
export type GroupPermission = typeof groupPermissions.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type WbsMasterCode = typeof wbsMasterCodes.$inferSelect;
export type DocumentMetaTag = typeof documentMetaTags.$inferSelect;

// 13 WBS Dimension definitions with metadata
export const wbsDimensionDefinitions = [
  { key: "phase", label: "Project Phase", icon: "Calendar", description: "Lifecycle phase of the project" },
  { key: "trade", label: "Trade/CSI Division", icon: "Hammer", description: "Construction trade or CSI division" },
  { key: "location", label: "Location/Area", icon: "MapPin", description: "Physical location or area" },
  { key: "building", label: "Building/Structure", icon: "Building2", description: "Building or structure identifier" },
  { key: "level", label: "Level/Floor", icon: "Layers", description: "Floor or level designation" },
  { key: "zone", label: "Zone", icon: "Grid3x3", description: "Zone within a floor or area" },
  { key: "system", label: "Building System", icon: "Cog", description: "Building system category" },
  { key: "subsystem", label: "Subsystem", icon: "Settings2", description: "Subsystem breakdown" },
  { key: "element_type", label: "Element Type", icon: "Box", description: "Type of construction element" },
  { key: "material", label: "Material", icon: "Layers3", description: "Material type or specification" },
  { key: "work_package", label: "Work Package", icon: "Package", description: "Work package identifier" },
  { key: "cost_code", label: "Cost Code", icon: "DollarSign", description: "Cost accounting code" },
  { key: "responsibility", label: "Responsibility", icon: "Users", description: "Responsible party or department" },
] as const;

export interface MicrosoftConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export interface TenantConfig {
  branding: {
    primaryColor: string;
    secondaryColor: string;
    sidebarColor?: string;
    fontStyle?: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    companyUrl?: string;
  };
  modules: {
    hrSync: boolean;
    advancedWbs: boolean;
    documentTemplating: boolean;
  };
  wbsDimensions: Array<{
    key: string;
    label: string;
    description?: string;
    sortOrder?: number;
    required?: boolean;
  }>;
  microsoft?: MicrosoftConfig;
}

export interface UserProfile {
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  department: string | null;
  avatarUrl: string | null;
}

export interface WbsDimensions {
  [key: string]: string | number | boolean | null;
}

export interface NavigationTree extends NavigationItem {
  children: NavigationTree[];
  isMoreAction?: boolean;
  hiddenChildren?: NavigationTree[];
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalWbsNodes: number;
  completedWbsNodes: number;
  teamMembers: number;
  budgetTotal: number;
  budgetUsed: number;
}

export interface WbsTemplateNode {
  title: string;
  description?: string;
  codePath: string;
  codeDisplay: string;
  dimensions?: WbsDimensions;
  estimatedHours?: number;
  children?: WbsTemplateNode[];
}
