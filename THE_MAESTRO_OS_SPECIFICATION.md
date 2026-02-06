# The Maestro ERP - Full Stack Specification for PlenumNET Ternary OS GUI

## Document Purpose

This document provides a complete architectural and functional specification of **The Maestro**, a modular, multi-tenant Enterprise Resource Planning (ERP) system for residential construction and land development firms. The intent is to provide sufficient detail for an AI agent (DeepSeek) to create an extensive, fully-functional Operating System GUI that runs natively on the **PlenumNET Ternary Platform**, modeled after The Maestro's design, navigation patterns, data architecture, and security framework.

**Architecture Version:** 3.3.0
**Date:** February 6, 2026
**Target Platform:** PlenumNET Ternary OS (base-3 computing substrate)

---

## 1. System Overview

The Maestro is a SaaS-delivered, multi-company ERP platform that serves residential construction builders, land developers, holding companies, and related trades. It provides:

- A modern, responsive web GUI with a collapsible sidebar navigation
- Multi-tenant isolation with per-company branding, theming, and configuration
- A 13-dimensional Work Breakdown Structure (WBS) engine for granular project cost tracking
- Role-based access control (RBAC) with four hierarchical user roles
- Real-time dashboard with hero image branding, statistics cards, and activity feeds
- Document management with WOPI protocol integration for inline Office editing
- AI-powered analytics and report generation
- SaaS billing with Stripe payment processing and distributed ledger witnessing
- Post-quantum security via the PlenumNET/Salvi Framework with ternary operations

---

## 2. Technology Stack

### 2.1 Frontend
| Technology | Purpose |
|---|---|
| React 18 | Component-based UI framework |
| TypeScript | Type-safe development |
| Vite | Build tool and dev server |
| Tailwind CSS | Utility-first styling with dark mode support |
| shadcn/ui | Pre-built accessible component library |
| wouter | Lightweight client-side routing |
| TanStack Query v5 | Server state management and caching |
| Zod | Runtime schema validation |
| Lucide React | Icon library |
| Recharts | Data visualization and charting |

### 2.2 Backend
| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| Express.js | HTTP server framework |
| TypeScript | Type-safe server code |
| Drizzle ORM | Type-safe database queries and schema management |
| PostgreSQL | Primary relational database |
| express-rate-limit | API rate limiting |
| Stripe SDK | Payment processing |

### 2.3 Security & Integrations
| Technology | Purpose |
|---|---|
| PlenumNET/libternary | Ternary (base-3) cryptographic operations |
| Kong Gateway | API security proxy with encryption and compression |
| Azure AD | Production SSO via OAuth2/OIDC |
| Algorand | Primary distributed ledger for transaction witnessing |
| Hedera | Fallback distributed ledger via Consensus Service |
| Microsoft Graph API | Office 365 integration (email, files, SSO) |

---

## 3. Navigation Architecture

### 3.1 Sidebar Structure

The application uses a **collapsible sidebar** built on shadcn's Sidebar primitives. Navigation items are **database-driven** and **tenant-specific**, meaning each company can have a customized menu structure.

The sidebar consists of:
1. **Company Switcher** (top) - Logo and company name with dropdown to switch tenants
2. **Dynamic Navigation Tree** (middle) - Hierarchical menu items with icons, collapsible sections
3. **Fixed Footer Links** (bottom) - PlenumNET Security Dashboard, Settings
4. **User Profile Card** (bottom) - Avatar, name, role badge

### 3.2 Navigation Data Model

Navigation items are stored in a database table with hierarchical parent-child relationships:

```
navigation_items {
  id: varchar(36) PK
  tenant_id: varchar(36) FK -> tenants.id
  parent_id: varchar(36) (nullable, self-referencing for hierarchy)
  item_order: integer (sort order within parent group)
  item_type: text (default: "menu")
  title: text (display label)
  icon_name: text (maps to Lucide icon component name)
  path: text (client-side route path)
  component: text (optional component reference)
  ui_slot: text (default: "sidebar")
  max_children_display: integer (default: 5, limits visible sub-items)
  is_collapsible: boolean (default: true)
  min_role_required: text (default: "viewer")
  created_at: timestamp
  updated_at: timestamp
}
```

### 3.3 Navigation Tree Construction

The navigation tree is built through three processing stages:

1. **Build Tree** - Convert flat item list into hierarchical tree using `parentId` references
2. **Role Filtering** - Remove items the user's role cannot access (based on `minRoleRequired`)
3. **Choice Constraint** - Limit visible children per parent to `maxChildrenDisplay` (default 5)

### 3.4 Complete Menu Structure

```
SIDEBAR NAVIGATION
==================

Dashboard                    [LayoutDashboard]   /                     viewer
Projects                     [FolderKanban]      /projects             viewer
  |-- Project WBS            [Home]              /wbs                  viewer
  |     |-- Master WBS Codes [FolderArchive]     /wbs/master-codes     viewer
  |     |-- WBS Dimensions   [Folder]            /wbs/dimensions       viewer
  |-- Schedule               [Calendar]          /schedule             viewer
  |-- Specifications         [FileText]          /specifications       viewer
  |-- Photos                 [Camera]            /photos               viewer
People                       [Users]             (group header)        viewer
  |-- Customers              [User]              /people/customers     viewer
  |-- Vendors & Pricing      [Landmark]          /people/vendors       accountant
  |-- Employees              [Contact]           /people/employees     project_manager
  |-- Subcontractors         [Truck]             /people/subcontractors project_manager
  |-- Contacts Directory     [HardHat]           /people/directory     viewer
Finance                      [DollarSign]        (group header)        accountant
  |-- Estimating             [Calculator]        /finance/estimating   accountant
  |-- Purchase Orders        [ClipboardList]     /finance/purchase-orders accountant
  |-- Invoicing              [Receipt]           /finance/invoicing    accountant
  |-- Expenses               [CreditCard]        /finance/expenses     accountant
  |-- Reports & GL           [BarChart]          /finance/reports      accountant
Documents                    [Files]             /documents            viewer
  |-- File Manager           [FolderArchive]     /documents/files      viewer
  |-- Plan Room              [Map]               /documents/plans      viewer
  |-- Templates              [FileCode]          /documents/templates  viewer
  |-- Reports                [FileBarChart]      /documents/reports    viewer
  |-- Archives               [Archive]           /documents/archives   viewer
Team                         [TrendingUp]        /team                 project_manager
Notifications                [Bell]              /alerts               viewer

FIXED FOOTER LINKS (always visible)
====================================
PlenumNET Security           [Shield]            /security/dashboard
Settings                     [Settings]          /settings

HIDDEN / DEVELOPER PAGES (accessible via direct URL)
======================================================
Maestro Dev Console          [Sparkles]          /maestro
  |-- Billing > Subscriptions                    /billing/subscriptions
  |-- Billing > Invoices                         /billing/invoices
  |-- Billing > Admin Pricing                    /admin/pricing
AI Reports                   [Sparkles]          /ai/reports
Smart Inbox                  [Mail]              /documents/smart-inbox
Profile                      [User]              /profile
User Groups                  [Users]             /settings/user-groups
Group Permissions            [Shield]            /settings/permissions
```

### 3.5 Icon Map

The following Lucide React icons are used throughout the navigation:

```
LayoutDashboard, FolderKanban, Users, Settings, Building2, Landmark,
FolderArchive, Home, CheckSquare, Bell, Folder, GitBranch, Calendar,
FileText, Map, Camera, Building, Truck, User, HardHat, Contact,
Calculator, ClipboardList, Receipt, CreditCard, BarChart, Files,
FileCode, FileBarChart, Archive, TrendingUp, Megaphone, Target,
Handshake, FileSpreadsheet, Share2, Presentation, Mail, Globe,
Palette, Sparkles, BarChart3, DollarSign, Wallet, Shield
```

---

## 4. Role-Based Access Control (RBAC)

### 4.1 User Roles (Hierarchical)

| Role | Level | Description |
|---|---|---|
| `viewer` | 0 | Read-only access to basic project information |
| `accountant` | 1 | Financial data access (invoicing, expenses, purchase orders) |
| `project_manager` | 2 | Full project management (team, scheduling, employees) |
| `admin` | 3 | Full system access including settings, user management, billing |

Higher-level roles inherit all permissions of lower-level roles.

### 4.2 Permission Model

Permissions are defined at two levels:

**Role-Based Permissions** (per navigation item):
```
role_permissions {
  id, tenant_id, navigation_item_id, user_role,
  can_view: boolean,
  can_access: boolean,
  can_action: boolean,
  inherit_from_parent: boolean
}
```

**Group-Based Permissions** (granular form-level control):
```
group_permissions {
  id, tenant_id, group_id, navigation_item_id,
  can_view, can_create, can_edit, can_delete,
  inherit_to_children: boolean
}
```

### 4.3 User Groups

Users can be organized into groups for fine-grained access control:

```
user_groups { id, tenant_id, name, description, is_active }
user_group_members { id, tenant_id, group_id, user_id }
```

---

## 5. Multi-Tenant Architecture

### 5.1 Tenant Data Model

```
tenants {
  id: varchar(36) PK (UUID)
  subdomain: text UNIQUE
  company_name: text
  contact_email: text
  config: jsonb {
    branding: {
      primaryColor: string     (HSL format: "H S% L%")
      secondaryColor: string
      sidebarColor: string
      fontStyle: string        ("elegant" | "modern" | "classic")
      logoUrl: string|null     (base64 data URL or external URL)
      faviconUrl: string|null
      heroImageUrl: string|null (base64 data URL for dashboard hero)
    },
    modules: {
      hrSync: boolean,
      advancedWbs: boolean,
      documentTemplating: boolean
    },
    wbsDimensions: WbsDimension[]
  }
  storage_mode: text ("cloud" | "local")
  onboarding_complete: boolean
  instance_status: text ("active" | "suspended" | "provisioning")
  created_at: timestamp
  updated_at: timestamp
}
```

### 5.2 Tenant-Specific Features
- **Custom Branding**: Each company has its own color scheme, logo, font style, and hero image
- **Independent Navigation**: Each tenant gets its own set of navigation items seeded on creation
- **Isolated Data**: All data tables include `tenant_id` for complete data isolation
- **Company Type Templates**: Pre-configured module settings for different business types (construction, land_development, holding_company, payroll_company, retail, tech, consulting, manufacturing, healthcare, real_estate, general)

### 5.3 Company Switching

The application supports instant company switching via a dropdown in the sidebar header. Switching companies:
1. Updates the active tenant context
2. Reloads navigation items for the new tenant
3. Applies the tenant's branding (colors, logo, hero image)
4. Filters all data queries to the new tenant scope

---

## 6. Dashboard Page Specification

### 6.1 Layout Structure

```
+----------------------------------------------------------------------+
|  HERO IMAGE SECTION (h-48 md:h-64)                                    |
|  +------------------------------------------------------------------+ |
|  |  [Tenant Hero Image or Default]                                   | |
|  |  Gradient overlay: bg-gradient-to-l from-black/60 via-black/30    | |
|  |                                                                    | |
|  |  "Welcome to [Company Name]"          [Digital Clock]             | |
|  |  "[Current Date]"                      HH:MM:SS                   | |
|  +------------------------------------------------------------------+ |
|                                                                        |
|  STATISTICS ROW (4 columns on lg, 2 on md)                            |
|  +---------------+ +---------------+ +---------------+ +-----------+  |
|  | Total Projects | | Active Projs  | | WBS Tasks     | | Team Mem  |  |
|  | [count]       | | [count]       | | [count]       | | [count]   |  |
|  | +2 this month | | X completed   | | X completed   | | X active  |  |
|  +---------------+ +---------------+ +---------------+ +-----------+  |
|                                                                        |
|  MIDDLE ROW (2 columns on lg)                                         |
|  +-------------------------------+ +---------------------------------+ |
|  | Budget Overview               | | Quick Actions                   | |
|  | $XXX,XXX / $XXX,XXX          | | [View Projects] [View WBS]     | |
|  | [===== Progress Bar ====]     | | [View Team]                    | |
|  | XX% utilized                  | |                                 | |
|  +-------------------------------+ +---------------------------------+ |
|                                                                        |
|  BOTTOM ROW (2 columns on lg)                                        |
|  +-------------------------------+ +---------------------------------+ |
|  | Recent Projects               | | Recent WBS Activities           | |
|  | - Project Name [Status Badge] | | - Task Title [Status Badge]     | |
|  | - Project Name [Status Badge] | | - Task Title [Status Badge]     | |
|  | - Project Name [Status Badge] | | - Task Title [Status Badge]     | |
|  +-------------------------------+ +---------------------------------+ |
+----------------------------------------------------------------------+
```

### 6.2 Status Badges

| Status | Variant | Label |
|---|---|---|
| `not_started` | secondary | Not Started |
| `in_progress` | default (primary) | In Progress |
| `on_hold` | outline | On Hold |
| `completed` | default (primary) | Completed |
| `cancelled` | destructive | Cancelled |

### 6.3 Hero Image System

- Hero images are stored as base64 data URLs in the tenant's `config.branding.heroImageUrl`
- Maximum size: ~5MB per image
- Falls back to a default bundled image when no custom hero is set
- A dark gradient wash is applied over the image for text readability
- The hero section includes a real-time digital clock and welcome text

---

## 7. Complete Page Specifications

### 7.1 Page Registry

| Route | Page Component | Description |
|---|---|---|
| `/` | Dashboard | Main overview with stats, hero, activities |
| `/tasks` | TasksPage | Task management and tracking |
| `/alerts` | AlertsPage | Notification center |
| `/projects` | Projects | Project CRUD with status and budget tracking |
| `/wbs` | WBS | Work Breakdown Structure node management |
| `/wbs/master-codes` | MasterWbsCodes | WBS dimension master code library |
| `/wbs/dimensions` | WbsDimensions | 13-dimensional WBS configuration |
| `/schedule` | SchedulePage | Project scheduling |
| `/specifications` | SpecificationsPage | Project specifications |
| `/photos` | PhotosPage | Project photo management |
| `/people/customers` | CustomersPage | Customer CRUD (MS Access VBA form recreation) |
| `/people/vendors` | VendorsPage | Vendor & pricing management (MS Access recreation) |
| `/people/employees` | EmployeesPage | Employee management |
| `/people/subcontractors` | SubcontractorsPage | Subcontractor management |
| `/people/directory` | ContactsDirectoryPage | Unified contacts directory |
| `/finance/estimating` | EstimatingPage | Cost estimation |
| `/finance/purchase-orders` | PurchaseOrdersPage | Purchase order management |
| `/finance/invoicing` | InvoicingPage | Invoice management |
| `/finance/expenses` | ExpensesPage | Expense tracking |
| `/finance/reports` | FinanceReportsPage | Financial reports and GL |
| `/sales/leads` | LeadsPage | Sales lead tracking |
| `/sales/proposals` | ProposalsPage | Proposal management |
| `/sales/contracts` | ContractsPage | Contract management |
| `/sales/crm` | CRMPage | Customer relationship management |
| `/sales/pipeline` | SalesPipelinePage | Sales pipeline visualization |
| `/marketing/campaigns` | CampaignsPage | Marketing campaigns |
| `/marketing/referrals` | ReferralsPage | Referral tracking |
| `/marketing/social` | SocialMediaPage | Social media management |
| `/marketing/branding` | BrandingPage | Brand management |
| `/marketing/analytics` | MarketingAnalyticsPage | Marketing analytics |
| `/documents` | FileManagerPage | Document management hub |
| `/documents/files` | FileManagerPage | File browser with upload/download |
| `/documents/plans` | PlanRoomPage | Construction plan viewer |
| `/documents/templates` | WbsTemplatesPage | WBS template management |
| `/documents/reports` | DocumentReportsPage | Document reports |
| `/documents/archives` | ArchivesPage | Document archive |
| `/documents/smart-inbox` | SmartInboxPage | AI-tagged email inbox |
| `/ai/reports` | AIReportsPage | AI-powered analytics chat |
| `/billing/subscriptions` | SubscriptionManagement | Plan selection and management |
| `/billing/invoices` | BillingDashboard | Invoice viewing and payment |
| `/admin/pricing` | AdminPricing | Pricing configuration admin |
| `/security/dashboard` | SecurityDashboard | PlenumNET security console |
| `/team` | Team | Team member management |
| `/settings` | Settings | Company settings and branding |
| `/settings/user-groups` | UserGroupsPage | User group management |
| `/settings/permissions` | GroupPermissionsPage | Permission matrix editor |
| `/profile` | Profile | User profile and email config |
| `/maestro` | MaestroDevPage | Developer console with billing tabs |

---

## 8. Database Schema (Complete)

### 8.1 Core Entity Tables

#### tenants
Primary multi-tenant isolation table. Every data table references this.
```sql
id              varchar(36) PK
subdomain       text UNIQUE NOT NULL
company_name    text NOT NULL
contact_email   text NOT NULL
config          jsonb NOT NULL DEFAULT (branding, modules, wbsDimensions)
storage_mode    text NOT NULL DEFAULT 'cloud'
onboarding_complete boolean DEFAULT false
instance_status text NOT NULL DEFAULT 'provisioning'
created_at      timestamp DEFAULT now()
updated_at      timestamp DEFAULT now()
```

#### users (authentication)
```sql
id                varchar PK DEFAULT gen_random_uuid()
email             varchar UNIQUE
first_name        varchar
last_name         varchar
profile_image_url varchar
config            jsonb DEFAULT {}
created_at        timestamp DEFAULT now()
updated_at        timestamp DEFAULT now()
```

#### tenant_users
Maps users to tenants with roles. A user can belong to multiple tenants.
```sql
id          varchar(36) PK
tenant_id   varchar(36) FK -> tenants.id NOT NULL
email       text NOT NULL
role        text NOT NULL DEFAULT 'viewer' -- viewer|accountant|project_manager|admin
profile     jsonb NOT NULL DEFAULT {firstName, lastName, jobTitle, department, avatarUrl}
is_active   boolean DEFAULT true
last_login_at timestamp
created_at  timestamp DEFAULT now()
```

#### sessions
```sql
sid     varchar PK
sess    jsonb NOT NULL
expire  timestamp NOT NULL
```

### 8.2 Project & WBS Tables

#### projects
```sql
id          varchar(36) PK
tenant_id   varchar(36) FK -> tenants.id NOT NULL
name        text NOT NULL
description text
status      text NOT NULL DEFAULT 'not_started'
start_date  timestamp
end_date    timestamp
budget      decimal(15,2)
manager_id  varchar(36) FK -> tenant_users.id
metadata    jsonb DEFAULT {}
created_at  timestamp DEFAULT now()
updated_at  timestamp DEFAULT now()
```

#### wbs_nodes
The core of the 13-dimensional WBS engine. Each node carries a `dimensions` JSONB field.
```sql
id              varchar(36) PK
tenant_id       varchar(36) FK -> tenants.id NOT NULL
project_id      varchar(36) FK -> projects.id NOT NULL
parent_id       varchar(36) (self-referencing hierarchy)
code_path       text NOT NULL (e.g., "1.2.3.4")
code_display    text
title           text NOT NULL
description     text
status          text NOT NULL DEFAULT 'not_started'
dimensions      jsonb NOT NULL DEFAULT {} -- 13-dimensional tagging
estimated_hours decimal(10,2)
estimated_cost  decimal(15,2)
actual_hours    decimal(10,2)
actual_cost     decimal(15,2)
assigned_to     varchar(36) FK -> tenant_users.id
order_index     integer DEFAULT 0
created_at      timestamp DEFAULT now()
updated_at      timestamp DEFAULT now()
```

#### wbs_templates
```sql
id          varchar(36) PK
tenant_id   varchar(36) FK -> tenants.id NOT NULL
name        text NOT NULL
description text
category    text
structure   jsonb NOT NULL DEFAULT []
is_active   boolean DEFAULT true
created_by  varchar(36) FK -> tenant_users.id
created_at  timestamp DEFAULT now()
updated_at  timestamp DEFAULT now()
```

#### wbs_master_codes
Master code library for each WBS dimension type.
```sql
id              varchar(36) PK
tenant_id       varchar(36) FK -> tenants.id NOT NULL
dimension_type  text NOT NULL
code            text NOT NULL
name            text NOT NULL
description     text
parent_code_id  varchar(36)
sort_order      integer DEFAULT 0
is_active       boolean DEFAULT true
metadata        jsonb DEFAULT {}
created_at      timestamp DEFAULT now()
updated_at      timestamp DEFAULT now()
```

### 8.3 People Tables

#### customers
MS Access VBA form recreation with detailed customer fields.
```sql
id, tenant_id, job_num, address, city, state_province, zip_postal_code,
country_region, first_name, last_name, web_page, home_phone, work_phone,
mobile_phone2, mobile_phone, email1, email2, created_at, updated_at
```

#### vendors
Vendor management with compliance tracking and performance ratings.
```sql
id, tenant_id, vendor_id, company, address, city, state_province,
zip_postal_code, country_region, insurance, insurance_proof_date,
wcb_num, wcb_exemption, wcb_compliance_date, insurance_expiry_date,
hold_payments, gst_num, ap_terms, ar_terms, include_in_payroll,
mat_vendor, subtrade, rate_reliability, rate_quality, rate_speed,
rate_pricing, rate_congeniality, created_at, updated_at
```

#### vendor_contacts
```sql
id, tenant_id, vendor_id FK -> vendors.id, first_name, last_name,
job_title, business_phone, mobile_phone, fax_number, email_address,
is_primary, created_at, updated_at
```

#### quotes
```sql
id, tenant_id, job_num, q_num, customer, date_of_quote, division,
model, project_address, lot, block, plan, main, upper, low, gar,
dp, bp, dgbp, created_at, updated_at
```

### 8.4 Document & WOPI Tables

#### documents
```sql
id, tenant_id, project_id FK -> projects.id, name, description,
category, status, original_filename, mime_type, original_size_bytes,
compressed_size_bytes, is_encrypted, encryption_mode, encrypted_content,
plain_content, checksum, kong_timestamp, savings_percent,
uploaded_by FK -> tenant_users.id, metadata jsonb, created_at, updated_at
```

#### document_locks
30-minute expiry lock lifecycle for WOPI editing.
```sql
id, file_id FK -> documents.id, lock_id, user_id FK -> tenant_users.id,
tenant_id, locked_at, expires_at, lock_type DEFAULT 'exclusive', is_active
```

#### document_meta_tags
Links documents to WBS dimension codes for 13-dimensional filtering.
```sql
id, document_id FK -> documents.id, dimension_type, wbs_code_id FK -> wbs_master_codes.id,
custom_value, created_at
```

#### document_audit_logs
```sql
id, tenant_id, document_id FK -> documents.id, user_id FK -> tenant_users.id,
action, details jsonb, ip_address, user_agent, security_mode, created_at
```

#### wopi_sessions
```sql
id, tenant_id, document_id FK -> documents.id, user_id FK -> tenant_users.id,
access_token, token_expires_at, session_type DEFAULT 'view', is_active,
last_accessed_at, created_at
```

#### ms_graph_tokens
```sql
id, tenant_id, user_id FK -> tenant_users.id, token_type DEFAULT 'bearer',
access_token, refresh_token, expires_at, scopes, is_active, created_at, updated_at
```

### 8.5 Billing & Subscription Tables

#### subscription_plans
```sql
id                      serial PK
name                    varchar(100) NOT NULL
code                    varchar(50) UNIQUE NOT NULL
base_price_monthly_cents integer
base_price_yearly_cents integer
per_user_price_cents    integer
annual_discount_bps     integer DEFAULT 0
currency                varchar(3) DEFAULT 'CAD'
plenumnet_enabled       boolean DEFAULT false
security_mode           varchar(20) DEFAULT 'zero'
phase_sync_required     boolean DEFAULT false
femtosecond_timing      boolean DEFAULT false
ledger_witnessing_enabled boolean DEFAULT false
ledger_provider         varchar(20) DEFAULT 'algorand'
features                jsonb NOT NULL DEFAULT {}
max_users               integer
max_projects            integer
storage_gb              integer
api_calls_per_month     integer
is_active               boolean DEFAULT true
created_at              timestamp DEFAULT now()
updated_at              timestamp DEFAULT now()
```

#### Subscription Plan Tiers

| Plan | Code | Users | Projects | Storage | API Calls/mo | PlenumNET | Security Mode | Ledger |
|---|---|---|---|---|---|---|---|---|
| Essentials | `essentials` | 5 | 10 | 10 GB | 50,000 | No | zero | algorand |
| Professional | `professional` | 10 | 50 | 100 GB | 250,000 | Yes | one | algorand |
| Enterprise | `enterprise` | 50 | Unlimited | 1 TB | 1,000,000 | Yes | phi | algorand |
| Quantum Enterprise | `quantum-enterprise` | 500 | Unlimited | 5 TB | Unlimited | Yes | phi-plus | algorand |

**Feature Matrix per Plan:**

| Feature | Essentials | Professional | Enterprise | Quantum |
|---|---|---|---|---|
| WBS Management | Yes | Yes | Yes | Yes |
| Document Management | Yes | Yes | Yes | Yes |
| Basic Reporting | Yes | Yes | Yes | Yes |
| Advanced Reporting | No | Yes | Yes | Yes |
| AI Analytics | No | Yes | Yes | Yes |
| Smart Inbox | No | No | Yes | Yes |
| Office Online Integration | No | Yes | Yes | Yes |
| Kong Security Gateway | No | No | Yes | Yes |
| PlenumNET Encryption | No | No | Yes | Yes |
| Custom Integrations | No | No | Yes | Yes |
| Dedicated PlenumNET Node | No | No | No | Yes |
| Quantum-Resistant All Ops | No | No | No | Yes |

#### tenant_subscriptions
```sql
id                      serial PK
tenant_id               varchar(36) FK -> tenants.id ON DELETE CASCADE
plan_id                 integer FK -> subscription_plans.id
stripe_customer_id      varchar(255)
stripe_subscription_id  varchar(255)
locked_base_price_cents integer
locked_per_user_price_cents integer
billing_interval        varchar(20) DEFAULT 'monthly'
tat_wallet_address      varchar(255)
tat_balance             numeric(20,8) DEFAULT 0
algorand_account_address varchar(255)
algorand_app_id         bigint
hedera_account_id       varchar(50)
hedera_topic_id         varchar(50)
status                  varchar(50) NOT NULL DEFAULT 'provisioning'
current_period_start    timestamp
current_period_end      timestamp
cancel_at_period_end    boolean DEFAULT false
trial_ends_at           timestamp
user_seats              integer DEFAULT 1
current_projects        integer DEFAULT 0
storage_used_gb         numeric(10,2) DEFAULT 0
api_calls_this_month    integer DEFAULT 0
security_mode           varchar(20) DEFAULT 'zero'
phase_sync_enabled      boolean DEFAULT false
created_at              timestamp DEFAULT now()
updated_at              timestamp DEFAULT now()
```

#### subscription_invoices
```sql
id, tenant_subscription_id FK, tenant_id, stripe_invoice_id,
amount_due_cents, amount_paid_cents, tax_amount_cents, currency,
status, pdf_url, tat_payment_amount, tat_transaction_id,
algorand_tx_id, algorand_round, hedera_tx_id, hedera_consensus_timestamp,
line_items jsonb, period_start, period_end, province, tax_breakdown jsonb,
created_at
```

#### usage_metrics
Daily usage tracking for metering and billing.
```sql
id, tenant_id, metric_date, active_users, api_calls, storage_bytes,
network_bytes, ternary_operations, phase_sync_events,
femtosecond_timing_events, algorand_witness_events, hedera_witness_events,
avg_response_time_ms, phase_alignment_efficiency, created_at
```

#### pricing_config
Key-value pricing configuration store.
```sql
id serial PK, key varchar(100) UNIQUE, value text, value_type varchar(20),
visibility varchar(10) DEFAULT 'PUBLIC', description text, updated_by, created_at, updated_at
```

#### stripe_sync
Tracks Stripe product/price synchronization.
```sql
id, plan_id FK, stripe_product_id, stripe_price_id, stripe_price_id_yearly,
sync_action, sync_status, previous_price_id, previous_price_id_yearly,
error_message, synced_at, synced_by, created_at
```

### 8.6 Security & Permission Tables

#### navigation_items
(See Section 3.2)

#### role_permissions
(See Section 4.2)

#### user_groups, user_group_members, group_permissions
(See Section 4.3)

---

## 9. Backend API Architecture

### 9.1 Modular Router Pattern

The backend uses a factory function pattern where each domain module exports a `create*Router()` function that returns an Express Router:

```typescript
// Example: server/api/tenants.ts
export function createTenantsRouter(): Router {
  const router = Router();
  // Define routes...
  return router;
}
```

### 9.2 Router Registry (13 Routers, 55+ Endpoints)

| Router | Prefix | Endpoints | Description |
|---|---|---|---|
| `tenants` | `/api/tenants` | ~15 | Tenant CRUD, navigation, dashboard stats, dimensions |
| `projects` | `/api/projects` | ~12 | Projects, WBS nodes/templates/master codes |
| `people` | `/api/people` | ~18 | Team, customers, quotes, vendors, contacts |
| `documents` | `/api/documents` | ~16 | Documents CRUD, user groups, permissions, meta tags |
| `microsoft` | `/api/microsoft` | ~10 | MS Graph OAuth, file ops, email, SMTP config |
| `wopi` | `/api/wopi` | 12 | Complete WOPI host protocol |
| `intelligence` | `/api/intelligence` | ~8 | AI reports, quick prompts, Smart Inbox |
| `subscriptions` | `/api/subscriptions` | 16 | Plans, current subscription, billing, provinces |
| `billing` | `/api/billing` | 7 | Invoice CRUD, generation, ledger witnessing |
| `admin-pricing` | `/api/admin` | 7 | Pricing config, plan management, Stripe sync |
| `plenumnet` | `/api/plenumnet` | 15 | Ternary ops, phase encryption, timing, demos |
| `stripe` | `/api/stripe` | 8 | Stripe integration, customers, webhooks |
| `system` | `/api/system` | 5 | System status, health check, Azure AD auth |

### 9.3 Middleware Stack

Applied in this order:

1. **Request Logger** - Correlation ID generation, structured JSON logging
2. **Global API Rate Limiter** - 200 requests/minute per user
3. **Auth Rate Limiter** - 20 requests/15 minutes for login endpoints
4. **PlenumNET Rate Limiter** - 300 requests/minute per tenant
5. **Webhook Rate Limiter** - 100 requests/minute for Stripe webhooks
6. **Authentication** (Replit OIDC / Azure AD)
7. **Domain Routers** (13 routers)
8. **Error Handler** - Standardized error responses with correlation IDs

### 9.4 Rate Limiting by Plan Tier

| Plan | Requests/Minute |
|---|---|
| Essentials | 100 |
| Professional | 500 |
| Enterprise | 2,000 |
| Quantum Enterprise | 10,000 |
| Default (unauthenticated) | 200 |

### 9.5 Request Logging Format

```json
{
  "correlationId": "uuid-v4",
  "method": "GET",
  "path": "/api/projects",
  "tenantId": "uuid-v4",
  "userId": "uuid-v4",
  "statusCode": 200,
  "durationMs": 45,
  "timestamp": "2026-02-06T12:00:00.000Z",
  "errorClass": null
}
```

Error classes: `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`

### 9.6 System Status Endpoint

`GET /api/system/status` returns:

```json
{
  "version": "3.3.0",
  "environment": "development",
  "auth": { "provider": "replit", "configured": true },
  "stripe": { "configured": true, "webhookConfigured": true },
  "ledger": {
    "algorand": { "configured": false, "mode": "development" },
    "hedera": { "configured": false, "mode": "development" }
  },
  "features": {
    "rateLimiting": true,
    "structuredLogging": true,
    "correlationIds": true,
    "migrationTooling": true
  }
}
```

---

## 10. Backend Services

### 10.1 Service Layer Architecture

12 domain services under `server/services/`:

| Service | Responsibility |
|---|---|
| `document-service` | Document orchestration, Kong encryption, WOPI tokens, audit |
| `tax-service` | Canadian tax calculations for 13 provinces (GST/HST/PST/QST) |
| `pricing-config-service` | DB-driven key-value pricing with PUBLIC/PRIVATE visibility |
| `subscription-service` | Plan management, subscription CRUD, billing calculations |
| `billing-service` | Invoice generation with line items, tax breakdown, payments |
| `usage-tracking-service` | Usage metrics recording, limit checking, aggregation |
| `ledger-witness-service` | Adapter-pattern ledger witnessing with ternary hashing |
| `tenant-onboarding-service` | Automated tenant provisioning with default subscription |
| `stripe-service` | Full Stripe lifecycle (see Section 11) |
| `ai-report-service` | Pattern-based AI report generation |
| `wopi-host-service` | WOPI protocol host service |
| `plenumnet-core-client` | Local libternary engine interface |

---

## 11. Stripe Payment Integration

### 11.1 Service Methods

| Method | Description |
|---|---|
| `createCustomer(tenantId, email, name)` | Creates Stripe customer linked to tenant |
| `syncProductsAndPrices()` | Syncs internal plans to Stripe products/prices |
| `createSubscription(tenantId, planCode, interval)` | Creates Stripe subscription |
| `cancelSubscription(tenantId, atPeriodEnd)` | Cancels subscription |
| `handleWebhook(payload, signature)` | Processes Stripe webhook events |

### 11.2 Webhook Events Handled

| Event | Handler |
|---|---|
| `invoice.paid` | Updates invoice status, activates subscription, witnesses on ledger |
| `invoice.payment_failed` | Sets subscription status to `past_due` |
| `customer.subscription.updated` | Syncs status (active, past_due, canceled, trialing, incomplete) |
| `customer.subscription.deleted` | Marks subscription canceled, witnesses on ledger |

### 11.3 Environment Variables

```
STRIPE_SECRET_KEY       - Stripe API secret key
STRIPE_WEBHOOK_SECRET   - Stripe webhook signing secret
```

---

## 12. Distributed Ledger Integration

### 12.1 Adapter Pattern

The ledger system uses a pluggable adapter pattern with a unified `LedgerAdapter` interface:

```typescript
interface LedgerAdapter {
  readonly name: string;
  readonly isConfigured: boolean;
  witness(payloadHash: string, metadata: Record<string, unknown>): Promise<LedgerWitnessResult>;
  verify(transactionId: string): Promise<{ valid: boolean; details?: Record<string, unknown> }>;
}

interface LedgerWitnessResult {
  transactionId: string;
  confirmed: boolean;
  blockHeight?: number;
  consensusTimestamp?: string;
  sequenceNumber?: number;
  networkId?: string;
  mode: "development" | "live";
}
```

### 12.2 Algorand Adapter

- **Live Mode**: Constructs application call transactions via Algorand REST API
- **Dev Mode Fallback**: Returns simulated confirmed transaction when `ALGORAND_APP_ID` or `ALGORAND_API_TOKEN` not set
- **Verification**: Queries Algorand pending transactions API or mirror node
- **Transaction IDs**: `algo_dev_*` (development) or `algo_live_*` (production)

**Environment Variables:**
```
ALGORAND_APP_ID          - Algorand application ID
ALGORAND_API_TOKEN       - Algorand API token
ALGORAND_SERVER          - API server (default: mainnet algonode)
ALGORAND_SENDER_ADDRESS  - Sender address for transactions
```

### 12.3 Hedera Adapter

- **Live Mode**: Prepares JSON messages for Hedera Consensus Service topic submission
- **Dev Mode Fallback**: Returns simulated confirmed transaction when credentials not set
- **Verification**: Queries Hedera mirror node for topic messages
- **Transaction IDs**: `hedera_dev_*` (development) or `hedera_live_*` (production)

**Environment Variables:**
```
HEDERA_TOPIC_ID       - Hedera topic ID for consensus messages
HEDERA_OPERATOR_ID    - Hedera operator account ID
HEDERA_OPERATOR_KEY   - Hedera operator private key
HEDERA_NETWORK        - Network (default: mainnet)
```

### 12.4 Witness Payload Format

```json
{
  "app": "maestro-erp",
  "version": "3.3",
  "hash": "<payloadHash>",
  "ts": "2026-02-06T12:00:00.000Z",
  "type": "stripe_invoice_paid",
  "tenantId": "uuid",
  "amount": 29900,
  "currency": "CAD"
}
```

---

## 13. PlenumNET Ternary Security Framework

### 13.1 Overview

PlenumNET is a post-quantum security framework based on **ternary (base-3) computing**. Unlike binary systems (0,1), ternary uses three states: **{-1, 0, 1}** (balanced ternary, Representation A). The framework provides:

- Ternary arithmetic operations (constant-time)
- Binary-to-ternary encoding and decoding
- Phase-rotation encryption (multi-phase data splitting)
- Femtosecond-precision timing anchored to the Salvi Epoch
- Ternary hashing for ledger witnessing payloads

### 13.2 Ternary Operations (libternary)

All operations run in **constant time** to prevent timing-based side-channel attacks.

```typescript
type TritA = -1 | 0 | 1;  // Balanced ternary representation

// Core Operations:
ternaryAdd(a: TritA, b: TritA): OperationResult
ternaryMultiply(a: TritA, b: TritA): OperationResult
ternaryRotate(a: TritA, positions: number): OperationResult
ternaryXor(a: TritA, b: TritA): OperationResult
ternaryNot(a: TritA): OperationResult
```

**Ternary XOR Truth Table:**
| A | B | Result |
|---|---|---|
| 0 | 0 | 0 |
| 0 | 1 | 1 |
| 0 | -1 | -1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |
| 1 | -1 | 0 |
| -1 | 0 | -1 |
| -1 | 1 | 0 |
| -1 | -1 | 0 |

### 13.3 Ternary Encoding

Binary data is converted to ternary by extracting base-3 digits from each byte:

```
Binary byte (0-255) -> 5 trits (each 0-2)
Example: byte 42 -> [0, 2, 1, 1, 0] (42 = 0*1 + 2*3 + 1*9 + 1*27 + 0*81)
```

The trits are then packed for efficient storage and transmission.

### 13.4 Phase-Rotation Encryption

Data is split into **phases** that must be recombined to recover the original:

```typescript
interface PhaseConfig {
  mode: EncryptionMode;      // Security/performance tradeoff
  primaryPhase: number;       // Primary phase rotation angle
  secondaryOffset: number;    // Secondary phase offset
  guardianEnabled: boolean;   // Enable integrity check phase
  guardianOffset: number;     // Guardian phase offset
}

interface EncryptedPhaseData {
  primaryPhase: {
    data: string;
    phase: number;
    timestamp: FemtosecondTimestamp;
  };
  secondaryPhase: {
    data: string;
    phase: number;
    timestamp: FemtosecondTimestamp;
  };
  guardianPhase?: {           // Optional integrity verification
    hash: string;
    phase: number;
    timestamp: FemtosecondTimestamp;
  };
  config: PhaseConfig;
  splitRatio: number;         // How data is divided between phases
}
```

### 13.5 Femtosecond Timing

High-precision timestamps anchored to the **Salvi Epoch** (April 1, 2025 00:00:00.000 UTC):

```typescript
interface FemtosecondTimestamp {
  seconds: number;          // Seconds since Salvi Epoch
  femtoseconds: bigint;     // Sub-second precision (10^-15 seconds)
  epoch: string;            // "salvi" (reference identifier)
}
```

The femtosecond timing system is used for:
- Phase encryption timestamp validation
- Recombination window enforcement
- Ledger witnessing timestamp anchoring
- Audit log precision

### 13.6 Security Modes

| Mode | Description | Plan |
|---|---|---|
| `zero` | No PlenumNET encryption | Essentials |
| `one` | Basic ternary encoding | Professional |
| `phi` | Full phase encryption with guardian | Enterprise |
| `phi-plus` | Quantum-resistant with dedicated node | Quantum Enterprise |

### 13.7 PlenumNET API Endpoints (15)

```
GET  /api/plenumnet/status          - Engine status and capabilities
POST /api/plenumnet/encode          - Binary-to-ternary encoding
POST /api/plenumnet/decode          - Ternary-to-binary decoding
POST /api/plenumnet/encrypt         - Phase-rotation encryption
POST /api/plenumnet/decrypt         - Phase recombination decryption
POST /api/plenumnet/hash            - Ternary hashing
POST /api/plenumnet/operations      - Execute ternary operations
GET  /api/plenumnet/timing          - Current femtosecond timestamp
POST /api/plenumnet/timing/validate - Validate timing window
GET  /api/plenumnet/demo/operations - Interactive operations demo
GET  /api/plenumnet/demo/encryption - Interactive encryption demo
GET  /api/plenumnet/demo/timing     - Interactive timing demo
POST /api/plenumnet/witness         - Ledger witnessing with ternary hash
GET  /api/plenumnet/health          - Health check
GET  /api/plenumnet/metrics         - Usage metrics
```

---

## 14. WOPI Protocol Integration

### 14.1 Overview

The Web Application Open Platform Interface (WOPI) enables inline editing of Office documents (Word, Excel, PowerPoint) directly within the browser using Microsoft Office Online.

### 14.2 Endpoints (12 Complete)

| Endpoint | Method | Description |
|---|---|---|
| `CheckFileInfo` | GET | Returns file metadata and permissions |
| `GetFile` | GET | Downloads file content |
| `PutFile` | POST | Uploads/saves file content |
| `Lock` | POST | Acquires exclusive edit lock |
| `Unlock` | POST | Releases edit lock |
| `RefreshLock` | POST | Extends lock expiry |
| `UnlockAndRelock` | POST | Atomic unlock and relock |
| `GetLock` | POST | Returns current lock ID |
| `DeleteFile` | POST | Deletes file |
| `RenameFile` | POST | Renames file |
| `PutRelativeFile` | POST | Creates new file in same container |
| `CheckFolderInfo` | GET | Returns folder metadata |

### 14.3 Lock Lifecycle
- Locks expire after **30 minutes**
- Lock ID is a unique string per editing session
- All file mutation operations validate the lock before proceeding
- Lock conflicts return HTTP 409 with current lock info

---

## 15. UI/UX Design System

### 15.1 Design Principles

- **Professional Construction Theme**: Default teal/dark palette appropriate for construction industry
- **Full Dark Mode Support**: Toggle between light and dark themes
- **Per-Tenant Branding**: Custom colors, fonts, logos, and hero images per company
- **Responsive Design**: Mobile-first with grid layouts adapting from 1 to 4 columns
- **Consistent Spacing**: Three levels (small, medium, large) used throughout
- **Flat Design with Subtle Elevation**: Minimal drop shadows, subtle borders

### 15.2 Component Library

Built on shadcn/ui with these key components:

| Component | Usage |
|---|---|
| `Card` | Content containers with header/content/footer sections |
| `Button` | Actions with variants: default, secondary, ghost, outline, destructive |
| `Badge` | Status indicators, tags, counts |
| `Input` | Text inputs with icon adornments |
| `Select` | Dropdown selection |
| `Dialog` | Modal overlays for forms and confirmations |
| `Table` | Data tables with sorting and filtering |
| `Sidebar` | Collapsible navigation sidebar |
| `Avatar` | User profile images with fallback initials |
| `Progress` | Progress bars for budget utilization |
| `Skeleton` | Loading placeholders |
| `Tabs` | Content organization (e.g., billing sub-sections) |
| `Switch` | Toggle controls |
| `Checkbox` | Multi-select controls |
| `RadioGroup` | Single-select controls |
| `Textarea` | Multi-line text input |
| `Tooltip` | Hover information |
| `Toaster` | Toast notifications for success/error feedback |
| `Collapsible` | Expandable/collapsible sections |

### 15.3 Color System (HSL Format)

Colors are defined in CSS custom properties using HSL space-separated format (`H S% L%`):

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --primary: 168 76% 36%;      /* Teal - construction theme */
  --primary-foreground: 0 0% 100%;
  --secondary: 28 85% 52%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --accent: 210 40% 96%;
  --destructive: 0 84% 60%;
  --border: 214 32% 91%;
  --sidebar-background: 175 35% 15%;
}
```

### 15.4 Typography

Font styles configurable per tenant:
- `elegant` - Serif-based professional typography
- `modern` - Clean sans-serif
- `classic` - Traditional construction-industry appropriate

### 15.5 Interaction Patterns

- **hover-elevate**: Subtle background elevation on hover (built into utility class)
- **active-elevate-2**: More dramatic elevation on press/active state
- **toggle-elevate / toggle-elevated**: Toggle state indication
- All `Button` and `Badge` components have built-in hover/active states

---

## 16. Authentication Architecture

### 16.1 Development: Replit OIDC

In development, authentication is handled via Replit's built-in OIDC provider:
- Session-based with `connect-pg-simple` session store
- Sessions stored in PostgreSQL `sessions` table
- User profile synced on each login

### 16.2 Production: Azure AD SSO (Scaffolded)

```typescript
// OAuth2 Authorization Code Flow
GET  /api/auth/azure/login    -> Redirect to Azure AD
GET  /api/auth/azure/callback -> Exchange code for tokens
POST /api/auth/azure/token    -> Token refresh

// Azure AD Configuration
AZURE_AD_TENANT_ID
AZURE_AD_CLIENT_ID
AZURE_AD_CLIENT_SECRET
AZURE_AD_REDIRECT_URI
```

The Azure AD middleware supports:
- Multi-tenant Azure AD applications
- JWT token parsing and validation
- Profile fetching via Microsoft Graph API
- Automatic user provisioning on first login

---

## 17. Data Flow Architecture

### 17.1 Frontend Data Fetching Pattern

```
Component
  -> useQuery({ queryKey: ["/api/resource"] })
    -> Default queryFn fetches from backend
      -> Express route handler
        -> Storage interface method
          -> Drizzle ORM query
            -> PostgreSQL
```

### 17.2 Mutation Pattern

```
Component
  -> useMutation({ mutationFn: () => apiRequest("POST", "/api/resource", data) })
    -> On success: queryClient.invalidateQueries({ queryKey: ["/api/resource"] })
```

### 17.3 Settings/Branding Flow

```
Settings Page
  -> updateTenantBranding(brandingConfig)
    -> PATCH /api/tenants/:id { config: { branding: {...} } }
      -> Updates tenant config JSONB
        -> SettingsProvider context re-fetches
          -> All components re-render with new branding
```

---

## 18. CI/CD Pipeline

### 18.1 GitHub Actions Workflows

| Workflow | Trigger | Steps |
|---|---|---|
| `ci.yml` | Push/PR to main/develop | TypeScript type-check, Vite build, schema validation |
| `deploy.yml` | Push to main | Pre-deploy validation, Replit deployment trigger |
| `db-migration.yml` | Push with schema changes | Schema diff detection, new table detection, barrel export validation |
| `security.yml` | Weekly schedule | Dependency audit, secret leak scanning |

### 18.2 Migration Tooling

```bash
# Generate migration
./scripts/generate-migration.sh

# Validate schema
./scripts/validate-schema.sh
```

---

## 19. Kong Security Gateway

Declarative configuration for API security:

```yaml
services:
  - name: api-service
    url: http://localhost:5000
    routes:
      - name: api-route
        paths: ["/api"]
    plugins:
      - name: rate-limiting
      - name: key-auth
      - name: cors
      - name: request-transformer

  - name: wopi-service
    url: http://localhost:5000
    routes:
      - name: wopi-route
        paths: ["/wopi"]
    plugins:
      - name: custom-plenumnet-encryption
      - name: request-size-limiting
```

---

## 20. Key Architectural Patterns

### 20.1 Multi-Tenant Data Isolation
Every database query is scoped by `tenant_id`. The storage interface enforces this pattern across all CRUD operations.

### 20.2 Factory Router Pattern
Each API domain exports a `create*Router()` factory function, enabling clean dependency injection and testability.

### 20.3 Adapter Pattern (Ledger)
The `LedgerAdapter` interface allows swapping between Algorand and Hedera without changing business logic.

### 20.4 Dev-Mode Gating
All external integrations (Stripe, Algorand, Hedera, Azure AD) gracefully degrade to development mode when credentials are not configured, using simulated responses.

### 20.5 Embedded Component Pattern
Components like `BillingDashboard`, `SubscriptionManagement`, and `AdminPricing` accept an `embedded` prop to control their layout when used as standalone pages vs. embedded in tab containers.

### 20.6 Settings Provider Context
A React context (`SettingsProvider`) provides global access to the active tenant, its branding configuration, and methods to update branding. All components can access tenant-specific theming via the `useSettings()` hook.

---

## 21. PlenumNET OS GUI Translation Guide

### 21.1 From Web App to OS GUI

When translating The Maestro's web interface to a PlenumNET Ternary OS native GUI:

| Web Concept | OS GUI Equivalent |
|---|---|
| Browser window | OS window manager / desktop environment |
| Sidebar navigation | OS application dock or start menu panel |
| React components | Native ternary UI widgets |
| REST API calls | Inter-process communication (IPC) or system calls |
| PostgreSQL | Ternary-native database engine |
| WebSocket | Kernel message bus |
| Session cookies | OS-level user session tokens |
| CSS/Tailwind | Ternary UI theme engine |
| localStorage | User-space configuration files |
| File uploads | Ternary filesystem I/O |
| Hero images | Desktop wallpaper / window backgrounds |

### 21.2 Ternary-Native Considerations

1. **Data Storage**: All data should be stored in balanced ternary format using the encoding scheme from Section 13.3
2. **Memory Addressing**: Use ternary addressing (base-3 memory pages)
3. **Process Scheduling**: Leverage the three-state trit for process states: {sleeping, ready, running}
4. **File System**: Design a ternary file system with phase-encrypted file storage
5. **Security**: All data at rest should use phase-rotation encryption
6. **Timing**: All system timestamps should use femtosecond precision anchored to the Salvi Epoch
7. **Network**: All network communications should include ternary-hashed integrity verification
8. **Window Manager**: Support per-application theming (equivalent to per-tenant branding)
9. **User Permissions**: Implement the 4-tier role hierarchy at the OS kernel level
10. **Ledger Integration**: Built-in distributed ledger witnessing for all system-critical operations

### 21.3 Required OS Subsystems

1. **Kernel**: Ternary instruction processing, memory management, process scheduling
2. **Window Manager**: Multi-window GUI with sidebar dock, taskbar, notification area
3. **File Manager**: Drag-and-drop file operations with 13-dimensional metadata tagging
4. **Settings Application**: System configuration with theming and user management
5. **Security Dashboard**: Real-time PlenumNET operation monitoring
6. **Application Framework**: Widget toolkit for building ternary-native applications
7. **Database Engine**: Ternary-native relational data storage
8. **Network Stack**: Encrypted ternary communication protocols
9. **Authentication Service**: Multi-user with Azure AD integration capability
10. **Package Manager**: Application installation and dependency management

---

## 22. Environment Variables Reference

### Required for Production
```
DATABASE_URL                - PostgreSQL connection string
SESSION_SECRET              - Express session encryption key
STRIPE_SECRET_KEY           - Stripe API key
STRIPE_WEBHOOK_SECRET       - Stripe webhook signing secret
AZURE_AD_TENANT_ID          - Azure AD tenant
AZURE_AD_CLIENT_ID          - Azure AD app client ID
AZURE_AD_CLIENT_SECRET      - Azure AD app secret
ALGORAND_APP_ID             - Algorand application ID
ALGORAND_API_TOKEN          - Algorand API token
HEDERA_TOPIC_ID             - Hedera consensus topic
HEDERA_OPERATOR_ID          - Hedera operator account
HEDERA_OPERATOR_KEY         - Hedera operator private key
```

### Optional
```
ALGORAND_SERVER             - Algorand API server (default: mainnet)
ALGORAND_SENDER_ADDRESS     - Algorand sender address
HEDERA_NETWORK              - Hedera network (default: mainnet)
AZURE_AD_REDIRECT_URI       - Azure AD OAuth redirect
GITHUB_TOKEN                - GitHub API token for CI/CD
```

---

## 23. Summary Statistics

| Metric | Count |
|---|---|
| Database Tables | 28 |
| API Routers | 13 |
| API Endpoints | 55+ |
| Frontend Pages | 40+ |
| Backend Services | 12 |
| Subscription Plans | 4 |
| User Roles | 4 |
| WBS Dimensions | Configurable (up to 13) |
| WOPI Endpoints | 12 |
| PlenumNET API Endpoints | 15 |
| CI/CD Workflows | 4 |
| Navigation Menu Items | 30+ (per tenant) |

---

*This specification document is generated from The Maestro ERP v3.3.0 codebase and is intended to serve as a comprehensive reference for building a PlenumNET Ternary OS GUI that faithfully reproduces and extends The Maestro's functionality in a native ternary computing environment.*
