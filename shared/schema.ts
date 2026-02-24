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

export const tenantApplications = pgTable("tenant_applications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  name: text("name").notNull(),
  url: text("url").notNull(),
  iconName: text("icon_name"),
  category: text("category").default("custom"),
  itemOrder: integer("item_order").notNull().default(0),
  isDefault: boolean("is_default").default(false),
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
  ternEnabled: boolean("tern_enabled").default(false),
  ternEncrypted: boolean("tern_encrypted").default(false),
  ternHeader: jsonb("tern_header"),
  ternData: text("tern_data"),
  ternShardIndex: integer("tern_shard_index"),
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
export const insertTenantApplicationSchema = createInsertSchema(tenantApplications).omit({ id: true, createdAt: true, updatedAt: true });
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
export type InsertTenantApplication = z.infer<typeof insertTenantApplicationSchema>;
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
export type TenantApplication = typeof tenantApplications.$inferSelect;
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
  { key: "system", label: "Document Type", icon: "FileText", description: "Document classification type" },
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
    hidden?: boolean;
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

export const customerContacts = pgTable("customer_contacts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  customerId: varchar("customer_id", { length: 36 }).notNull().references(() => customers.id),
  firstName: text("first_name"),
  lastName: text("last_name"),
  jobTitle: text("job_title"),
  businessPhone: text("business_phone"),
  mobilePhone: text("mobile_phone"),
  faxNumber: text("fax_number"),
  emailAddress: text("email_address"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCustomerContactSchema = createInsertSchema(customerContacts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCustomerContact = z.infer<typeof insertCustomerContactSchema>;
export type CustomerContact = typeof customerContacts.$inferSelect;

export interface CustomerWithContacts {
  customer: Customer;
  quote: Quote | null;
  contacts: CustomerContact[];
  primaryContact: CustomerContact | null;
}

export const employeeRoles = pgTable("employee_roles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  roleName: text("role_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmployeeRoleSchema = createInsertSchema(employeeRoles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmployeeRole = z.infer<typeof insertEmployeeRoleSchema>;
export type EmployeeRole = typeof employeeRoles.$inferSelect;

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
  name: text("name").notNull(),
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

export const constructionStages = [
  "pre_construction", "excavation", "foundation", "framing", "roofing",
  "plumbing", "electrical", "hvac", "insulation", "drywall",
  "trim", "cabinets", "flooring", "paint", "exterior", "final", "closeout"
] as const;
export type ConstructionStage = typeof constructionStages[number];

export const scheduleTaskTemplates = pgTable("schedule_task_templates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  taskNumber: integer("task_number").notNull(),
  taskName: text("task_name").notNull(),
  stage: text("stage").notNull().default("pre_construction"),
  supplierTrade: text("supplier_trade"),
  responsibility: text("responsibility"),
  whosTask: text("whos_task"),
  supervisor: text("supervisor"),
  finListNumber: integer("fin_list_number"),
  ref: text("ref"),
  poRefNum: text("po_ref_num"),
  ktFlag: boolean("kt_flag").default(false),
  ktSort: integer("kt_sort"),
  moneyCode: text("money_code"),
  taskLenDays: integer("task_len_days"),
  offsetDays: integer("offset_days").default(0),
  prereqTemplateId: text("prereq_template_id"),
  sqftDay: decimal("sqft_day", { precision: 10, scale: 2 }),
  moneyDay: decimal("money_day", { precision: 10, scale: 2 }),
  memo: text("memo"),
  orderIndex: integer("order_index").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scheduleTasks = pgTable("schedule_tasks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id),
  templateId: varchar("template_id", { length: 36 }),
  taskNumber: integer("task_number").notNull(),
  taskName: text("task_name").notNull(),
  stage: text("stage").notNull().default("pre_construction"),
  supplierTrade: text("supplier_trade"),
  responsibility: text("responsibility"),
  whosTask: text("whos_task"),
  supervisor: text("supervisor"),
  finListNumber: integer("fin_list_number"),
  ref: text("ref"),
  poRefNum: text("po_ref_num"),
  ktFlag: boolean("kt_flag").default(false),
  ktSort: integer("kt_sort"),
  moneyCode: text("money_code"),
  taskLenDays: integer("task_len_days"),
  offsetDays: integer("offset_days").default(0),
  prereqTaskId: varchar("prereq_task_id", { length: 36 }),
  sqftDay: decimal("sqft_day", { precision: 10, scale: 2 }),
  moneyDay: decimal("money_day", { precision: 10, scale: 2 }),
  ordered: boolean("ordered").default(false),
  orderedDate: timestamp("ordered_date"),
  completed: boolean("completed").default(false),
  completedDate: timestamp("completed_date"),
  projectedStart: timestamp("projected_start"),
  projectedFinish: timestamp("projected_finish"),
  actualStart: timestamp("actual_start"),
  actualFinish: timestamp("actual_finish"),
  poNumber: text("po_number"),
  naFlag: boolean("na_flag").default(false),
  memo: text("memo"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertScheduleTaskTemplateSchema = createInsertSchema(scheduleTaskTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertScheduleTaskSchema = createInsertSchema(scheduleTasks).omit({ id: true, createdAt: true, updatedAt: true });

export type ScheduleTaskTemplate = typeof scheduleTaskTemplates.$inferSelect;
export type InsertScheduleTaskTemplate = z.infer<typeof insertScheduleTaskTemplateSchema>;
export type ScheduleTask = typeof scheduleTasks.$inferSelect;
export type InsertScheduleTask = z.infer<typeof insertScheduleTaskSchema>;

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

export const pmItems = pgTable("pm_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  title: text("title"),
  sortNum: integer("sort_num").default(0),
  ps: text("ps").notNull(),
  productNum: text("product_num"),
  sku: text("sku"),
  oldPrice: decimal("old_price", { precision: 15, scale: 2 }),
  oldPriceEffective: timestamp("old_price_effective"),
  price: decimal("price", { precision: 15, scale: 2 }).default("0"),
  mu: decimal("mu", { precision: 6, scale: 4 }).default("1"),
  lastUpdate: timestamp("last_update"),
  newUpdate: decimal("new_update", { precision: 15, scale: 2 }),
  effective: timestamp("effective"),
  comments: text("comments"),
  vendor: text("vendor").notNull(),
  category: text("category"),
  pup: boolean("pup").default(false),
  pmCompile: boolean("pm_compile").default(false),
  sellPrice: decimal("sell_price", { precision: 15, scale: 2 }),
  wbsCode: text("wbs_code"),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pmCompileItems = pgTable("pm_compile_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  title: text("title"),
  sortNum: integer("sort_num").default(0),
  ps: text("ps").notNull(),
  psSub: text("ps_sub").notNull(),
  vendor: text("vendor"),
  subVendor: text("sub_vendor"),
  quantity: decimal("quantity", { precision: 15, scale: 4 }).default("1"),
  qNotes: text("q_notes"),
  expressionValue: text("expression_value"),
  price: decimal("price", { precision: 15, scale: 2 }).default("0"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }),
  expressionValue2: text("expression_value_2"),
  quantity2: decimal("quantity_2", { precision: 15, scale: 4 }),
  qNotes2: text("q_notes_2"),
  subtotal2: decimal("subtotal_2", { precision: 15, scale: 2 }),
  expressionValue3: text("expression_value_3"),
  quantity3: decimal("quantity_3", { precision: 15, scale: 4 }),
  qNotes3: text("q_notes_3"),
  lineTotal: decimal("line_total", { precision: 15, scale: 2 }),
  pup: boolean("pup").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPmItemSchema = createInsertSchema(pmItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPmCompileItemSchema = createInsertSchema(pmCompileItems).omit({ id: true, createdAt: true, updatedAt: true });

export type PmItem = typeof pmItems.$inferSelect;
export type InsertPmItem = z.infer<typeof insertPmItemSchema>;
export type PmCompileItem = typeof pmCompileItems.$inferSelect;
export type InsertPmCompileItem = z.infer<typeof insertPmCompileItemSchema>;

// ============================================================================
// PQTI-Integrated Document Lifecycle Subsystems
// ============================================================================

// ---------------------------------------------------------------------------
// 1. Unified Event Bus (EB)
// ---------------------------------------------------------------------------

export const documentEventTypes = [
  "document.captured", "document.classified", "document.uploaded",
  "document.staged", "document.reviewed", "document.approved",
  "document.version_locked", "document.archived", "document.signed", "document.shared"
] as const;
export type DocumentEventType = typeof documentEventTypes[number];

export const documentEvents = pgTable("document_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id),
  documentId: varchar("document_id", { length: 36 }).references(() => documents.id),
  eventType: text("event_type").notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => tenantUsers.id),
  wbsNodeId: varchar("wbs_node_id", { length: 36 }).references(() => wbsNodes.id),
  payload: jsonb("payload").default({}),
  metadata: jsonb("metadata").default({}),
  correlationId: varchar("correlation_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow()
});

export const eventSubscribers = pgTable("event_subscribers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  eventType: text("event_type").notNull(),
  subscriberName: text("subscriber_name").notNull(),
  handlerPath: text("handler_path").notNull(),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0),
  filterConditions: jsonb("filter_conditions").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const eventDeadLetters = pgTable("event_dead_letters", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  eventId: varchar("event_id", { length: 36 }).notNull().references(() => documentEvents.id),
  subscriberId: varchar("subscriber_id", { length: 36 }).notNull().references(() => eventSubscribers.id),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  lastRetryAt: timestamp("last_retry_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertDocumentEventSchema = createInsertSchema(documentEvents).omit({ id: true, createdAt: true });
export const insertEventSubscriberSchema = createInsertSchema(eventSubscribers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventDeadLetterSchema = createInsertSchema(eventDeadLetters).omit({ id: true, createdAt: true });

export type InsertDocumentEvent = z.infer<typeof insertDocumentEventSchema>;
export type InsertEventSubscriber = z.infer<typeof insertEventSubscriberSchema>;
export type InsertEventDeadLetter = z.infer<typeof insertEventDeadLetterSchema>;

export type DocumentEvent = typeof documentEvents.$inferSelect;
export type EventSubscriber = typeof eventSubscribers.$inferSelect;
export type EventDeadLetter = typeof eventDeadLetters.$inferSelect;

// ---------------------------------------------------------------------------
// 2. WBS Classification Engine (CE)
// ---------------------------------------------------------------------------

export const classificationStatuses = ["pending", "processing", "completed", "failed", "needs_review"] as const;
export type ClassificationStatus = typeof classificationStatuses[number];

export const classificationJobs = pgTable("classification_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id),
  status: text("status").notNull().default("pending"),
  intakePath: text("intake_path").notNull(),
  ocrText: text("ocr_text"),
  pageCount: integer("page_count"),
  processingTimeMs: integer("processing_time_ms"),
  assignedWbsNodeId: varchar("assigned_wbs_node_id", { length: 36 }).references(() => wbsNodes.id),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 4 }),
  classificationRuleset: jsonb("classification_ruleset").default({}),
  userProvidedWbsNodeId: varchar("user_provided_wbs_node_id", { length: 36 }),
  reclassified: boolean("reclassified").default(false),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const classificationEntities = pgTable("classification_entities", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  classificationJobId: varchar("classification_job_id", { length: 36 }).notNull().references(() => classificationJobs.id),
  entityType: text("entity_type").notNull(),
  entityValue: text("entity_value").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  pageNumber: integer("page_number"),
  position: jsonb("position"),
  createdAt: timestamp("created_at").defaultNow()
});

export const classificationCorrections = pgTable("classification_corrections", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  classificationJobId: varchar("classification_job_id", { length: 36 }).notNull().references(() => classificationJobs.id),
  originalWbsNodeId: varchar("original_wbs_node_id", { length: 36 }).references(() => wbsNodes.id),
  correctedWbsNodeId: varchar("corrected_wbs_node_id", { length: 36 }).notNull().references(() => wbsNodes.id),
  correctedBy: varchar("corrected_by", { length: 36 }).notNull().references(() => tenantUsers.id),
  reason: text("reason"),
  weight: decimal("weight", { precision: 3, scale: 2 }).default("1.00"),
  createdAt: timestamp("created_at").defaultNow()
});

export const documentSearchIndex = pgTable("document_search_index", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id),
  wbsNodeId: varchar("wbs_node_id", { length: 36 }).references(() => wbsNodes.id),
  wbsPath: text("wbs_path"),
  documentType: text("document_type"),
  fullText: text("full_text").notNull(),
  extractedEntities: jsonb("extracted_entities").default({}),
  fileType: text("file_type"),
  pageCount: integer("page_count"),
  uploadSource: text("upload_source"),
  sha3Hash: text("sha3_hash"),
  hptpTimestamp: text("hptp_timestamp"),
  revisionChainId: varchar("revision_chain_id", { length: 36 }),
  spatialRefs: jsonb("spatial_refs").default({}),
  reviewStatus: text("review_status"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertClassificationJobSchema = createInsertSchema(classificationJobs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClassificationEntitySchema = createInsertSchema(classificationEntities).omit({ id: true, createdAt: true });
export const insertClassificationCorrectionSchema = createInsertSchema(classificationCorrections).omit({ id: true, createdAt: true });
export const insertDocumentSearchIndexSchema = createInsertSchema(documentSearchIndex).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertClassificationJob = z.infer<typeof insertClassificationJobSchema>;
export type InsertClassificationEntity = z.infer<typeof insertClassificationEntitySchema>;
export type InsertClassificationCorrection = z.infer<typeof insertClassificationCorrectionSchema>;
export type InsertDocumentSearchIndex = z.infer<typeof insertDocumentSearchIndexSchema>;

export type ClassificationJob = typeof classificationJobs.$inferSelect;
export type ClassificationEntity = typeof classificationEntities.$inferSelect;
export type ClassificationCorrection = typeof classificationCorrections.$inferSelect;
export type DocumentSearchIndex = typeof documentSearchIndex.$inferSelect;

// ---------------------------------------------------------------------------
// 3. ONLYOFFICE Document Review Pipeline (OO)
// ---------------------------------------------------------------------------

export const reviewStatuses = ["staged", "in_review", "approved", "approved_with_comments", "revise_resubmit", "rejected", "version_locked"] as const;
export type ReviewStatus = typeof reviewStatuses[number];

export const reviewSessions = pgTable("review_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id),
  wbsNodeId: varchar("wbs_node_id", { length: 36 }).references(() => wbsNodes.id),
  status: text("status").notNull().default("staged"),
  revisionNumber: integer("revision_number").default(1),
  onlyofficeSessionKey: text("onlyoffice_session_key"),
  reviewWindowHours: integer("review_window_hours"),
  reviewDeadline: timestamp("review_deadline"),
  escalatedAt: timestamp("escalated_at"),
  hptpSessionStart: text("hptp_session_start"),
  hptpSessionEnd: text("hptp_session_end"),
  previousSessionId: varchar("previous_session_id", { length: 36 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const reviewerAssignments = pgTable("reviewer_assignments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  reviewSessionId: varchar("review_session_id", { length: 36 }).notNull().references(() => reviewSessions.id),
  reviewerId: varchar("reviewer_id", { length: 36 }).notNull().references(() => tenantUsers.id),
  role: text("role").default("reviewer"),
  decision: text("decision"),
  comments: text("comments"),
  hptpDecisionTimestamp: text("hptp_decision_timestamp"),
  decidedAt: timestamp("decided_at"),
  notifiedAt: timestamp("notified_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const wbsReviewerConfig = pgTable("wbs_reviewer_config", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  wbsNodeId: varchar("wbs_node_id", { length: 36 }).notNull().references(() => wbsNodes.id),
  reviewerUserId: varchar("reviewer_user_id", { length: 36 }).references(() => tenantUsers.id),
  reviewerRole: text("reviewer_role"),
  reviewerGroupId: varchar("reviewer_group_id", { length: 36 }).references(() => userGroups.id),
  isRequired: boolean("is_required").default(true),
  reviewWindowHours: integer("review_window_hours").default(72),
  autoEscalateHours: integer("auto_escalate_hours"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const versionLocks = pgTable("version_locks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id),
  reviewSessionId: varchar("review_session_id", { length: 36 }).notNull().references(() => reviewSessions.id),
  lockedVersion: integer("locked_version").notNull(),
  sha3Hash: text("sha3_hash").notNull(),
  hptpLockTimestamp: text("hptp_lock_timestamp"),
  tldsaSignature: text("tldsa_signature"),
  tldsaKeyId: text("tldsa_key_id"),
  tldsaSecurityLevel: text("tldsa_security_level"),
  signedAt: timestamp("signed_at"),
  lockedBy: varchar("locked_by", { length: 36 }).notNull().references(() => tenantUsers.id),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertReviewSessionSchema = createInsertSchema(reviewSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReviewerAssignmentSchema = createInsertSchema(reviewerAssignments).omit({ id: true, createdAt: true });
export const insertWbsReviewerConfigSchema = createInsertSchema(wbsReviewerConfig).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVersionLockSchema = createInsertSchema(versionLocks).omit({ id: true, createdAt: true });

export type InsertReviewSession = z.infer<typeof insertReviewSessionSchema>;
export type InsertReviewerAssignment = z.infer<typeof insertReviewerAssignmentSchema>;
export type InsertWbsReviewerConfig = z.infer<typeof insertWbsReviewerConfigSchema>;
export type InsertVersionLock = z.infer<typeof insertVersionLockSchema>;

export type ReviewSession = typeof reviewSessions.$inferSelect;
export type ReviewerAssignment = typeof reviewerAssignments.$inferSelect;
export type WbsReviewerConfig = typeof wbsReviewerConfig.$inferSelect;
export type VersionLock = typeof versionLocks.$inferSelect;

// ---------------------------------------------------------------------------
// 4. Archive Assembly Engine (AR)
// ---------------------------------------------------------------------------

export const archiveStatuses = ["pending", "assembling", "signing", "sealed", "failed"] as const;
export type ArchiveStatus = typeof archiveStatuses[number];

export const archiveJobs = pgTable("archive_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  projectId: varchar("project_id", { length: 36 }).notNull().references(() => projects.id),
  status: text("status").notNull().default("pending"),
  archiveType: text("archive_type").default("closeout"),
  wbsLevelsTraversed: integer("wbs_levels_traversed").default(13),
  totalDocuments: integer("total_documents").default(0),
  totalVersionLocked: integer("total_version_locked").default(0),
  totalDrafts: integer("total_drafts").default(0),
  manifestJson: jsonb("manifest_json"),
  manifestPdfUrl: text("manifest_pdf_url"),
  hptpSealTimestamp: text("hptp_seal_timestamp"),
  tldsaManifestSignature: text("tldsa_manifest_signature"),
  tldsaManifestKeyId: text("tldsa_manifest_key_id"),
  tldsaSecurityLevel: text("tldsa_security_level").default("TL-DSA-87"),
  interopBridgeExport: jsonb("interop_bridge_export"),
  tlkemEncapsulation: jsonb("tlkem_encapsulation"),
  archiveUrl: text("archive_url"),
  archiveSizeBytes: integer("archive_size_bytes"),
  errorMessage: text("error_message"),
  assembledBy: varchar("assembled_by", { length: 36 }).references(() => tenantUsers.id),
  sealedAt: timestamp("sealed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const archiveItems = pgTable("archive_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  archiveJobId: varchar("archive_job_id", { length: 36 }).notNull().references(() => archiveJobs.id),
  documentId: varchar("document_id", { length: 36 }).notNull().references(() => documents.id),
  wbsPath: text("wbs_path").notNull(),
  documentType: text("document_type"),
  versionNumber: integer("version_number").default(1),
  isDraft: boolean("is_draft").default(false),
  sha3Hash: text("sha3_hash"),
  tldsaSignature: text("tldsa_signature"),
  tldsaKeyId: text("tldsa_key_id"),
  fileSizeBytes: integer("file_size_bytes"),
  classificationConfidence: decimal("classification_confidence", { precision: 5, scale: 4 }),
  reviewHistory: jsonb("review_history").default([]),
  versionLockTimestamp: text("version_lock_timestamp"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertArchiveJobSchema = createInsertSchema(archiveJobs).omit({ id: true, createdAt: true, updatedAt: true });
export const insertArchiveItemSchema = createInsertSchema(archiveItems).omit({ id: true, createdAt: true });

export type InsertArchiveJob = z.infer<typeof insertArchiveJobSchema>;
export type InsertArchiveItem = z.infer<typeof insertArchiveItemSchema>;

export type ArchiveJob = typeof archiveJobs.$inferSelect;
export type ArchiveItem = typeof archiveItems.$inferSelect;

// ---------------------------------------------------------------------------
// 5. Offline Field Upload Queue (FQ)
// ---------------------------------------------------------------------------

export const uploadStatuses = ["queued", "uploading", "uploaded", "verifying", "classified", "staged_for_review", "failed"] as const;
export type UploadStatus = typeof uploadStatuses[number];

export const uploadQueue = pgTable("upload_queue", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => tenantUsers.id),
  documentId: varchar("document_id", { length: 36 }).references(() => documents.id),
  status: text("status").notNull().default("queued"),
  fileName: text("file_name").notNull(),
  fileType: text("file_type"),
  fileSizeBytes: integer("file_size_bytes"),
  wbsDestinationPath: text("wbs_destination_path"),
  wbsNodeId: varchar("wbs_node_id", { length: 36 }).references(() => wbsNodes.id),
  sha3Hash: text("sha3_hash"),
  hptpCaptureTimestamp: text("hptp_capture_timestamp"),
  deviceCaptureTime: timestamp("device_capture_time"),
  hptpAttestedTime: text("hptp_attested_time"),
  deltaMs: integer("delta_ms"),
  tldsaSignature: text("tldsa_signature"),
  tldsaKeyId: text("tldsa_key_id"),
  signatureVerified: boolean("signature_verified"),
  chunkCount: integer("chunk_count").default(1),
  chunksUploaded: integer("chunks_uploaded").default(0),
  priority: text("priority").default("general"),
  retryCount: integer("retry_count").default(0),
  lastRetryAt: timestamp("last_retry_at"),
  errorMessage: text("error_message"),
  classifiedAt: timestamp("classified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const uploadChunks = pgTable("upload_chunks", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tenantId: varchar("tenant_id", { length: 36 }).notNull().references(() => tenants.id),
  uploadQueueId: varchar("upload_queue_id", { length: 36 }).notNull().references(() => uploadQueue.id),
  chunkIndex: integer("chunk_index").notNull(),
  chunkSizeBytes: integer("chunk_size_bytes"),
  sha3Hash: text("sha3_hash"),
  uploaded: boolean("uploaded").default(false),
  uploadedAt: timestamp("uploaded_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertUploadQueueSchema = createInsertSchema(uploadQueue).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUploadChunkSchema = createInsertSchema(uploadChunks).omit({ id: true, createdAt: true });

export type InsertUploadQueue = z.infer<typeof insertUploadQueueSchema>;
export type InsertUploadChunk = z.infer<typeof insertUploadChunkSchema>;

export type UploadQueueItem = typeof uploadQueue.$inferSelect;
export type UploadChunk = typeof uploadChunks.$inferSelect;
