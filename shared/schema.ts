import { pgTable, text, varchar, boolean, integer, jsonb, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantUserSchema = createInsertSchema(tenantUsers).omit({ id: true, createdAt: true, lastLoginAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWbsNodeSchema = createInsertSchema(wbsNodes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNavigationItemSchema = createInsertSchema(navigationItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true });
export const insertWbsTemplateSchema = createInsertSchema(wbsTemplates).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type InsertTenantUser = z.infer<typeof insertTenantUserSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertWbsNode = z.infer<typeof insertWbsNodeSchema>;
export type InsertNavigationItem = z.infer<typeof insertNavigationItemSchema>;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type InsertWbsTemplate = z.infer<typeof insertWbsTemplateSchema>;

export type Tenant = typeof tenants.$inferSelect;
export type TenantUser = typeof tenantUsers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type WbsNode = typeof wbsNodes.$inferSelect;
export type NavigationItem = typeof navigationItems.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type WbsTemplate = typeof wbsTemplates.$inferSelect;

export interface TenantConfig {
  branding: {
    primaryColor: string;
    secondaryColor: string;
    sidebarColor?: string;
    fontStyle?: string;
    logoUrl: string | null;
    faviconUrl: string | null;
  };
  modules: {
    hrSync: boolean;
    advancedWbs: boolean;
    documentTemplating: boolean;
  };
  wbsDimensions: Array<{
    key: string;
    label: string;
    required: boolean;
  }>;
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
