import { pgTable, text, varchar, boolean, integer, jsonb, timestamp, decimal, serial, numeric, bigint, date } from "drizzle-orm/pg-core";
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

// Customers table - matches MS Access Customers table from VBA form
export const customers = pgTable("customers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  jobNum: integer("job_num").notNull(),
  address: text("address"),
  city: text("city"),
  stateProvince: text("state_province"),
  zipPostalCode: text("zip_postal_code"),
  countryRegion: text("country_region"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  webPage: text("web_page"),
  homePhone: text("home_phone"),
  workPhone: text("work_phone"),
  mobilePhone2: text("mobile_phone_2"),
  mobilePhone: text("mobile_phone"),
  email1: text("email1"),
  email2: text("email2"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Quotes table - matches MS Access Quotes table from VBA form
export const quotes = pgTable("quotes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  jobNum: integer("job_num").notNull(),
  qNum: text("q_num"),
  customer: text("customer"),
  dateOfQuote: timestamp("date_of_quote"),
  division: text("division"),
  model: text("model"),
  projectAddress: text("project_address"),
  lot: text("lot"),
  block: text("block"),
  plan: text("plan"),
  main: decimal("main", { precision: 10, scale: 2 }),
  upper: decimal("upper", { precision: 10, scale: 2 }),
  low: decimal("low", { precision: 10, scale: 2 }),
  gar: decimal("gar", { precision: 10, scale: 2 }),
  dp: decimal("dp", { precision: 10, scale: 2 }),
  bp: decimal("bp", { precision: 10, scale: 2 }),
  dgbp: decimal("dgbp", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

// Combined view type for the Customers Form (joins customer and quote data)
export interface CustomerWithQuote {
  customer: Customer;
  quote: Quote | null;
}

// Vendors table - matches MS Access SalviVendors table from VBA form
export const vendors = pgTable("vendors", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  vendorId: text("vendor_id"),
  company: text("company").notNull(),
  address: text("address"),
  city: text("city"),
  stateProvince: text("state_province"),
  zipPostalCode: text("zip_postal_code"),
  countryRegion: text("country_region"),
  insurance: text("insurance"),
  insuranceProofDate: timestamp("insurance_proof_date"),
  wcbNum: text("wcb_num"),
  wcbExemption: boolean("wcb_exemption").default(false),
  wcbComplianceDate: timestamp("wcb_compliance_date"),
  insuranceExpiryDate: timestamp("insurance_expiry_date"),
  holdPayments: boolean("hold_payments").default(false),
  gstNum: text("gst_num"),
  apTerms: text("ap_terms"),
  arTerms: text("ar_terms"),
  includeInPayroll: boolean("include_in_payroll").default(false),
  matVendor: boolean("mat_vendor").default(false),
  subtrade: boolean("subtrade").default(false),
  rateReliability: integer("rate_reliability"),
  rateQuality: integer("rate_quality"),
  rateSpeed: integer("rate_speed"),
  ratePricing: integer("rate_pricing"),
  rateCongeniality: integer("rate_congeniality"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// Vendor Contacts table - matches MS Access SalviContacts table from VBA form
export const vendorContacts = pgTable("vendor_contacts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  vendorId: varchar("vendor_id", { length: 36 }).notNull().references(() => vendors.id),
  firstName: text("first_name"),
  lastName: text("last_name"),
  jobTitle: text("job_title"),
  businessPhone: text("business_phone"),
  mobilePhone: text("mobile_phone"),
  faxNumber: text("fax_number"),
  emailAddress: text("email_address"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertVendorContactSchema = createInsertSchema(vendorContacts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVendorContact = z.infer<typeof insertVendorContactSchema>;
export type VendorContact = typeof vendorContacts.$inferSelect;

// Combined view type for Vendors Form
export interface VendorWithContacts {
  vendor: Vendor;
  contacts: VendorContact[];
  primaryContact: VendorContact | null;
}

export const documentLocks = pgTable("document_locks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fileId: varchar("file_id", { length: 36 }).notNull().references(() => documents.id),
  lockId: text("lock_id").notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => tenantUsers.id),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  lockedAt: timestamp("locked_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  lockType: text("lock_type").notNull().default("exclusive"),
  isActive: boolean("is_active").default(true)
});

export const documentAuditLogs = pgTable("document_audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id),
  userId: varchar("user_id", { length: 36 }).references(() => tenantUsers.id),
  action: text("action").notNull(),
  details: jsonb("details").default({}),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  securityMode: text("security_mode").default("one"),
  createdAt: timestamp("created_at").defaultNow()
});

export const wopiSessions = pgTable("wopi_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id),
  userId: varchar("user_id", { length: 36 }).references(() => tenantUsers.id),
  accessToken: text("access_token").notNull(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  sessionType: text("session_type").notNull().default("edit"),
  isActive: boolean("is_active").default(true),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

export const msGraphTokens = pgTable("ms_graph_tokens", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  userId: varchar("user_id", { length: 36 }).references(() => tenantUsers.id),
  tokenType: text("token_type").notNull().default("user_delegated"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at").notNull(),
  scopes: text("scopes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertDocumentLockSchema = createInsertSchema(documentLocks).omit({ id: true, lockedAt: true });
export const insertDocumentAuditLogSchema = createInsertSchema(documentAuditLogs).omit({ id: true, createdAt: true });
export const insertWopiSessionSchema = createInsertSchema(wopiSessions).omit({ id: true, createdAt: true, lastAccessedAt: true });
export const insertMsGraphTokenSchema = createInsertSchema(msGraphTokens).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertDocumentLock = z.infer<typeof insertDocumentLockSchema>;
export type InsertDocumentAuditLog = z.infer<typeof insertDocumentAuditLogSchema>;
export type InsertWopiSession = z.infer<typeof insertWopiSessionSchema>;
export type InsertMsGraphToken = z.infer<typeof insertMsGraphTokenSchema>;

export type DocumentLock = typeof documentLocks.$inferSelect;
export type DocumentAuditLog = typeof documentAuditLogs.$inferSelect;
export type WopiSession = typeof wopiSessions.$inferSelect;
export type MsGraphToken = typeof msGraphTokens.$inferSelect;

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  basePriceMonthlyCents: integer("base_price_monthly_cents"),
  basePriceYearlyCents: integer("base_price_yearly_cents"),
  perUserPriceCents: integer("per_user_price_cents"),
  annualDiscountBps: integer("annual_discount_bps").default(1667),
  currency: varchar("currency", { length: 3 }).default("CAD"),
  plenumnetEnabled: boolean("plenumnet_enabled").default(false),
  securityMode: varchar("security_mode", { length: 20 }).default("zero"),
  phaseSyncRequired: boolean("phase_sync_required").default(false),
  femtosecondTiming: boolean("femtosecond_timing").default(false),
  ledgerWitnessingEnabled: boolean("ledger_witnessing_enabled").default(false),
  ledgerProvider: varchar("ledger_provider", { length: 20 }).default("algorand"),
  features: jsonb("features").notNull().default({}),
  maxUsers: integer("max_users"),
  maxProjects: integer("max_projects"),
  storageGb: integer("storage_gb"),
  apiCallsPerMonth: integer("api_calls_per_month"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tenantSubscriptions = pgTable("tenant_subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id, { onDelete: "cascade" }),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  lockedBasePriceCents: integer("locked_base_price_cents"),
  lockedPerUserPriceCents: integer("locked_per_user_price_cents"),
  billingInterval: varchar("billing_interval", { length: 20 }).default("monthly"),
  tatWalletAddress: varchar("tat_wallet_address", { length: 255 }),
  tatBalance: numeric("tat_balance", { precision: 20, scale: 8 }).default("0"),
  algorandAccountAddress: varchar("algorand_account_address", { length: 255 }),
  algorandAppId: bigint("algorand_app_id", { mode: "number" }),
  hederaAccountId: varchar("hedera_account_id", { length: 50 }),
  hederaTopicId: varchar("hedera_topic_id", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull().default("trialing"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  trialEndsAt: timestamp("trial_ends_at"),
  userSeats: integer("user_seats").default(1),
  currentProjects: integer("current_projects").default(0),
  storageUsedGb: numeric("storage_used_gb", { precision: 10, scale: 2 }).default("0"),
  apiCallsThisMonth: integer("api_calls_this_month").default(0),
  securityMode: varchar("security_mode", { length: 20 }).default("zero"),
  phaseSyncEnabled: boolean("phase_sync_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: serial("id").primaryKey(),
  tenantSubscriptionId: integer("tenant_subscription_id").references(() => tenantSubscriptions.id),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
  amountDueCents: integer("amount_due_cents"),
  amountPaidCents: integer("amount_paid_cents"),
  taxAmountCents: integer("tax_amount_cents"),
  currency: varchar("currency", { length: 3 }).default("CAD"),
  status: varchar("status", { length: 50 }),
  pdfUrl: text("pdf_url"),
  tatPaymentAmount: numeric("tat_payment_amount", { precision: 20, scale: 8 }),
  tatTransactionId: varchar("tat_transaction_id", { length: 255 }),
  algorandTxId: varchar("algorand_tx_id", { length: 255 }),
  algorandRound: bigint("algorand_round", { mode: "number" }),
  hederaTxId: varchar("hedera_tx_id", { length: 255 }),
  hederaConsensusTimestamp: varchar("hedera_consensus_timestamp", { length: 50 }),
  lineItems: jsonb("line_items").default([]),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  province: varchar("province", { length: 2 }),
  taxBreakdown: jsonb("tax_breakdown").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usageMetrics = pgTable("usage_metrics", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  metricDate: date("metric_date").notNull(),
  activeUsers: integer("active_users").default(0),
  apiCalls: integer("api_calls").default(0),
  storageBytes: bigint("storage_bytes", { mode: "number" }).default(0),
  networkBytes: bigint("network_bytes", { mode: "number" }).default(0),
  ternaryOperations: bigint("ternary_operations", { mode: "number" }).default(0),
  phaseSyncEvents: integer("phase_sync_events").default(0),
  femtosecondTimingEvents: integer("femtosecond_timing_events").default(0),
  algorandWitnessEvents: integer("algorand_witness_events").default(0),
  hederaWitnessEvents: integer("hedera_witness_events").default(0),
  avgResponseTimeMs: numeric("avg_response_time_ms", { precision: 10, scale: 2 }),
  phaseAlignmentEfficiency: numeric("phase_alignment_efficiency", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pricingConfig = pgTable("pricing_config", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  valueType: varchar("value_type", { length: 20 }).notNull().default("string"),
  visibility: varchar("visibility", { length: 10 }).notNull().default("PRIVATE"),
  description: text("description"),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const stripeSync = pgTable("stripe_sync", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").references(() => subscriptionPlans.id),
  stripeProductId: varchar("stripe_product_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  stripePriceIdYearly: varchar("stripe_price_id_yearly", { length: 255 }),
  syncAction: varchar("sync_action", { length: 50 }).notNull(),
  syncStatus: varchar("sync_status", { length: 20 }).notNull().default("pending"),
  previousPriceId: varchar("previous_price_id", { length: 255 }),
  previousPriceIdYearly: varchar("previous_price_id_yearly", { length: 255 }),
  errorMessage: text("error_message"),
  syncedAt: timestamp("synced_at"),
  syncedBy: varchar("synced_by", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantSubscriptionSchema = createInsertSchema(tenantSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubscriptionInvoiceSchema = createInsertSchema(subscriptionInvoices).omit({ id: true, createdAt: true });
export const insertUsageMetricSchema = createInsertSchema(usageMetrics).omit({ id: true, createdAt: true });
export const insertPricingConfigSchema = createInsertSchema(pricingConfig).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStripeSyncSchema = createInsertSchema(stripeSync).omit({ id: true, createdAt: true });

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type InsertTenantSubscription = z.infer<typeof insertTenantSubscriptionSchema>;
export type SubscriptionInvoice = typeof subscriptionInvoices.$inferSelect;
export type InsertSubscriptionInvoice = z.infer<typeof insertSubscriptionInvoiceSchema>;
export type UsageMetric = typeof usageMetrics.$inferSelect;
export type InsertUsageMetric = z.infer<typeof insertUsageMetricSchema>;
export type PricingConfig = typeof pricingConfig.$inferSelect;
export type InsertPricingConfig = z.infer<typeof insertPricingConfigSchema>;
export type StripeSync = typeof stripeSync.$inferSelect;
export type InsertStripeSync = z.infer<typeof insertStripeSyncSchema>;
