# The Maestro - Construction ERP

## Overview
The Maestro is a modular, multi-tenant Enterprise Resource Planning (ERP) system designed for residential construction and land development firms. It features a modern, web-based interface with hierarchical navigation, role-based access control, and a 13-dimensional Work Breakdown Structure (WBS) engine.

## Architecture

### Technology Stack
- **Frontend:** React 18 + Vite + TypeScript
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Styling:** Tailwind CSS + shadcn/ui components
- **Routing:** wouter (client-side)
- **State Management:** TanStack Query v5
- **Validation:** Zod
- **Security Gateway:** Kong Proxy (managed serverless gateway)

### Kong Proxy Backend - Encryption & Security
Base URL: `https://kong-9e76b3c08eusfq1zu.kongcloud.dev`

| API | Endpoint | Description |
|-----|----------|-------------|
| Timing | `/api/timing/timestamp` | Timestamp service |
| Ternary | `/api/ternary/docs` | Ternary documentation |
| Phase | `/api/phase/config/balanced` | Phase configuration |
| Demo | `/api/demo/stats` | Demo statistics |
| Whitepapers | `/api/whitepapers` | Whitepapers API |
| Docs | `/api/docs` | Documentation API |

**Note:** Fully managed by Kong - no Render deployment needed. URLs are shareable.

### Project Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   └── ui/         # shadcn/ui components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities and API client
├── server/                 # Backend Express application
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database storage layer (PostgreSQL)
│   └── db.ts               # Drizzle database connection
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle schemas and TypeScript types
```

## Core Features

### 1. Dashboard
- Overview statistics (projects, WBS tasks, team, budget)
- Quick action links to main sections
- Recent projects and WBS activities

### 2. Projects Management
- CRUD operations for construction projects
- Status tracking (not_started, in_progress, on_hold, completed, cancelled)
- Budget tracking
- Search and filter capabilities

### 3. Work Breakdown Structure (WBS)
- **Master WBS Codes** (/wbs/master-codes): Tenant-level 13-dimensional template codes
  - 13 dimensions: phase, trade, location, building, level, zone, system, subsystem, element_type, material, work_package, cost_code, responsibility
  - CRUD operations for master codes via easy-to-use table UI
  - "Seed Defaults" button populates standard construction WBS codes
- **Project WBS** (/wbs): Project-specific WBS nodes
  - Project selection dropdown to filter by project
  - "Copy from Master" button copies all master codes to the selected project
  - Hierarchical tree structure with parent-child relationships
  - Status tracking per node (not_started, in_progress, completed, on_hold, cancelled)
  - Estimates for hours and costs

### 4. Team Management
- User listing with roles and profiles
- Role-based display (admin, project_manager, accountant, viewer)

### 5. Navigation
- 3/5 Choice UX pattern in sidebar
- Role-based menu filtering
- Collapsible sections with hierarchical structure

### 6. Multi-Company Support
- Company switcher dropdown in sidebar header
- Automatic theme switching when changing companies
- Each company has its own branding settings (colors, fonts, logo)
- Three seed companies with unique themes:
  - Acme Construction Co. (Teal theme, elegant font)
  - Summit Builders LLC (Navy theme, classic font)
  - Greenfield Development (Forest green theme, modern font)

### 7. Settings & Customization
- Per-company branding: Logo upload, typography, color themes
- Typography: Three font styles (Playfair Display, Libre Baskerville, Inter)
- Color Themes: Six presets + custom HSL color inputs
- Theme settings persist to tenant config in backend (not localStorage)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/stats | Get dashboard statistics |
| GET | /api/projects | List all projects |
| POST | /api/projects | Create project |
| PATCH | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| GET | /api/wbs | List all WBS nodes |
| POST | /api/wbs | Create WBS node |
| PATCH | /api/wbs/:id | Update WBS node |
| DELETE | /api/wbs/:id | Delete WBS node |
| GET | /api/team | List team members |
| POST | /api/team | Create team member |
| GET | /api/tenants | List all tenants |
| GET | /api/tenants/:id | Get tenant by ID |
| POST | /api/tenants | Create new tenant |
| PATCH | /api/tenants/:id | Update tenant (name, email, branding) |
| POST | /api/tenants/:id/seed-navigation | Seed navigation for existing tenant (if missing) |

## Design System

### Colors (Teal/Construction Theme)
- **Primary:** Teal (168° 76% 36%)
- **Accent:** Orange (28° 85% 52%)
- **Sidebar:** Dark Teal (175° 35% 15%)
- Full dark mode support

### UI Patterns
- Cards with hover elevation effects
- Status badges with semantic colors
- Responsive grid layouts
- Modal dialogs for create/edit operations

## Development

### Running the Application
```bash
npm run dev
```
The application starts on port 5000.

### Seed Data
The application includes seeded demo data:
- 3 Tenants (Acme Construction, Summit Builders, Greenfield Development)
- 3 Users (admin, project_manager, viewer roles)
- 5 Projects with various statuses
- 40 WBS nodes across projects

## User Roles

| Role | Level | Permissions |
|------|-------|-------------|
| viewer | 0 | Read-only access |
| accountant | 1 | Financial views access |
| project_manager | 2 | Project CRUD, team view |
| admin | 3 | Full access |

## Recent Changes

### February 2026 - Customers Form (MS Access VBA Recreation)
- Built Customers Form page at /people/customers recreating legacy MS Access VBA form functionality
- Database tables: customers and quotes with all original VBA form fields
- Job Number lookup dropdown (like VBA's combo box) for customer selection
- Customer fields: First/Last Name, Address, City, State/Province, ZIP, Country, Phone numbers, Email, Web Page
- Quote fields: Q#, Customer, Date, Division, Model, Project Address, Lot/Block/Plan, Square Footage (Main/Upper/Low/Gar), Permits (DP/BP/DGBP)
- Auto-save on field blur (recreating VBA AfterUpdate event behavior)
- Edit mode toggle for field enable/disable
- "Seed Sample Data" button for testing (creates 3 sample customers with quotes)
- API endpoints: GET/POST/PATCH/DELETE /api/customers, GET/POST/PATCH/DELETE /api/quotes
- Field-level update endpoints: PATCH /api/customers/field, PATCH /api/quotes/field

### February 2026 - Microsoft 365 Self-Service SSO Integration
- Implemented self-service Microsoft 365 configuration for enterprise SSO
- Users can configure Azure AD credentials directly via "Setup Microsoft 365" button in document viewer
- Configuration modal guides users through Azure Portal app registration process
- Microsoft credentials stored securely per-tenant in database (not environment variables)
- Tenant-specific credentials take precedence over global environment variables
- OAuth2 authentication flow with Azure AD for OneDrive access
- "Edit in Office" button appears in document viewer for Word, Excel, PowerPoint files
- Documents uploaded to OneDrive "TheMaestro" folder for editing
- Opens Office Online in new browser tab for full editing capability
- Server-side token management with automatic refresh per tenant
- API endpoints support tenantId parameter: /api/microsoft/status, /api/microsoft/auth-url, /api/microsoft/callback, /api/microsoft/upload, /api/microsoft/edit-url/:fileId, /api/microsoft/files, /api/microsoft/connected
- Fallback to environment variables (MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID) if tenant config not set

### February 2026 - WBS Page Enhancements
- Made all parent and child WBS nodes fully editable via Edit dialog
- Added Add Child functionality from node dropdown menu
- Implemented drag-and-drop CSV import for bulk WBS node creation
- CSV parsing handles quoted values with commas
- CSV import validates required headers (title) and normalizes status values
- Preview dialog shows parsed data before import

### February 2026 - File Manager with 13-Dimensional WBS Meta-Tagging
- Built sophisticated File Manager at /documents/files with:
  - Drag-and-drop file upload zone
  - Left sidebar with 13-dimensional WBS filter tree (collapsible sections with checkboxes)
  - Large document viewer panel (takes majority of screen)
  - Search and sorting controls
  - Document tags display for selected document
- 13 WBS Dimensions: Phase, Trade/CSI, Location, Building, Level, Zone, System, Subsystem, Element Type, Material, Work Package, Cost Code, Responsibility
- Database tables: wbs_master_codes (stores dimension code values), document_meta_tags (links documents to codes)
- API endpoints: /api/wbs-codes (CRUD), /api/documents/:id/meta-tags, /api/documents/filter, /api/wbs-codes/seed/:tenantId
- 63 default WBS codes seeded per tenant covering all 13 dimensions

### February 2026 - Kong API Integration for Document Encryption
- Integrated Kong Proxy backend for document encryption and compression
- Added documents table with encryption fields (encrypted_content, encryption_mode, checksum, kong_timestamp)
- Kong service layer (server/kong-service.ts) provides:
  - Phase-based encryption with 4 modes: high_security, balanced, performance, adaptive
  - Femtosecond timestamps for audit trails
  - ~56% average compression on encrypted data
- Document API endpoints: /api/documents (CRUD), /api/documents/:id/decrypt
- Kong proxy endpoints: /api/kong/timestamp, /api/kong/stats, /api/kong/docs, /api/kong/phase-config/:mode
- Graceful fallback: When Kong is unavailable (serverless sleeping), documents are stored unencrypted with content preserved

### January 2026 - User Group Security Module
- Added user group management (/settings/user-groups) for creating/editing/deleting groups
- Added group membership management (assign users to groups)
- Added permissions matrix (/settings/permissions) for form-level access control
- Permission levels: View, Create, Edit, Delete per form/navigation item
- Hierarchical permission inheritance from parent to child forms
- Database tables: user_groups, user_group_members, group_permissions
- Upsert logic for permissions prevents duplicate records
- API endpoints: /api/user-groups, /api/user-groups/:id/members, /api/user-groups/:id/permissions

### January 2026 - 5-Section Navigation Architecture
- Implemented comprehensive 5-section navigation structure (Dashboard, Projects, People & Contacts, Finance, Documents)
- Navigation is database-driven with navigation_items table supporting tenant-specific customization
- 3/5 choice rule enforcement: Dashboard section limited to 3 sub-items, other sections limited to 5 sub-items
- Role-based navigation filtering using minRoleRequired field (viewer, accountant, project_manager, admin)
- Multi-tenant navigation: /api/navigation?tenantId=xxx fetches tenant-specific navigation
- Added 20+ placeholder pages for navigation sections
- Automatic navigation seeding for all tenants during database initialization

### January 2026 - PostgreSQL Database Persistence
- Migrated from in-memory storage to PostgreSQL with Drizzle ORM
- All configurations (WBS dimensions, company settings, themes) now persist across server restarts
- Created DatabaseStorage class implementing IStorage interface
- Added automatic database seeding on first run
- Database schema includes: tenants, tenant_users, projects, wbs_nodes, navigation_items, role_permissions

### January 2026 - Multi-Company Support
- Added multi-company (tenant) support with company switcher
- Implemented automatic theme switching when changing companies
- Created 3 seed tenants with unique color themes and fonts
- Theme settings now persist to tenant config (backend) instead of localStorage
- Added tenant API endpoints (GET/POST/PATCH /api/tenants)
- Added ability to create new companies from Settings page
- Added ability to edit company name and contact email

### January 2026 - Initial MVP
- Implemented core ERP structure
- Added professional teal construction theme
- Built dashboard, projects, WBS, and team pages
- Implemented 3/5 choice navigation pattern
- Added Zod validation to API endpoints
- Created in-memory storage with seed data
- Added Settings page with customizable colors, logos, and fonts
- Applied Playfair Display as default font (elegant serif similar to Felix)
