# The Maestro - Construction ERP

## Overview
The Maestro is a modular, multi-tenant Enterprise Resource Planning (ERP) system designed for residential construction and land development firms. It offers a modern, web-based interface with hierarchical navigation, role-based access control, and a 13-dimensional Work Breakdown Structure (WBS) engine. The system aims to streamline project management, team collaboration, financial tracking, and document management for construction businesses. Key capabilities include comprehensive project and WBS management, multi-company support with customizable branding, advanced file management with WBS meta-tagging, and integration with Microsoft 365 for document editing and SSO.

**Architecture Version:** 3.0 (February 6, 2026)

## User Preferences
I want to prioritize a clear, concise, and professional communication style. My preferred working methodology involves iterative development, where I receive regular updates and have opportunities to provide feedback on implemented features. I value detailed explanations for complex architectural decisions and new feature implementations. Please ensure that all new code adheres to modern TypeScript and React best practices. I prefer that you ask for confirmation before making any major structural changes or before integrating new external services.

## System Architecture

### Technology Stack
- **Frontend:** React 18 + Vite + TypeScript, styled with Tailwind CSS and shadcn/ui components. Uses wouter for client-side routing, TanStack Query v5 for state management, and Zod for validation.
- **Backend:** Express.js + TypeScript.
- **Database:** PostgreSQL with Drizzle ORM (Replit-native, Supabase deferred to post-MVP).
- **Security Gateway:** Kong Proxy with PlenumNET custom plugins for phase-rotation encryption, ternary compression, and femtosecond timestamping.
- **Auth:** Replit OIDC (dev) / Azure AD (production).

### Project Structure
The project is organized into `client/` (React frontend), `server/` (Express backend), `shared/` (common types and schemas), `kong/` (gateway configuration), and `scripts/` (deployment and tooling).

### Database Schema (22 tables)
Core tables: `tenants`, `tenant_users`, `projects`, `wbs_nodes`, `wbs_master_codes`, `wbs_templates`, `navigation_items`, `role_permissions`, `user_groups`, `user_group_members`, `group_permissions`, `documents`, `document_meta_tags`, `customers`, `vendors`, `vendor_contacts`, `quotes`.
WOPI/Document tables (v3.0): `document_locks`, `document_audit_logs`, `wopi_sessions`, `ms_graph_tokens`.
Auth table: `sessions` (Replit auth).

### Per-Domain Schema Organization
The `shared/schema/` directory provides per-domain barrel exports for cleaner imports:
- `shared/schema/tenants.ts` - Tenant management
- `shared/schema/users.ts` - Users, groups, permissions
- `shared/schema/projects.ts` - Projects, customers, vendors, quotes, navigation
- `shared/schema/wbs.ts` - WBS nodes, master codes, templates, dimensions
- `shared/schema/documents.ts` - Documents, locks, audit logs, WOPI sessions, MS Graph tokens

### Core Features
- **Dashboard:** Provides an overview of projects, WBS tasks, team, and budget.
- **Projects Management:** CRUD operations for construction projects with status and budget tracking.
- **Work Breakdown Structure (WBS):** Supports a 13-dimensional WBS engine with master codes and project-specific WBS nodes, including hierarchical structures, status tracking, and import capabilities.
- **Team Management:** User listing with role-based access control (viewer, accountant, project_manager, admin).
- **Navigation:** Implements a 3/5 choice UX pattern in the sidebar with role-based filtering and multi-tenant capabilities.
- **Multi-Company Support:** Allows for multiple tenants with individual branding (themes, fonts, logos) and a company switcher.
- **Settings & Customization:** Extensive per-company branding options, including logo upload, typography, and color themes, persisted to the backend.
- **Legacy Form Recreations:** Includes recreation of MS Access VBA forms for Vendors & Pricing and Customers, featuring auto-save on field blur, detailed data entry, and condensed layouts. Vendors page includes: 4-digit auto-generated vendor IDs (V0001), Date Added display, Vendor Compliance section (WCB Compliance Date, Insurance Expiry Date, Hold All Payments), scrollable all-contacts container, AP/AR Terms dropdowns with standard accounting payment terms, and Include in Payroll checkbox.
- **Contacts Directory:** Unified searchable/filterable table of all customers, vendor contacts, and employees with category filtering, sorting, and pagination.
- **File Manager:** Sophisticated document management system with drag-and-drop uploads, 13-dimensional WBS filtering/meta-tagging, a large document viewer, and inline Office Online editing for Word/Excel/PowerPoint documents via WOPI integration.
- **User Group Security:** Provides granular, form-level access control with user group management and a permissions matrix (View, Create, Edit, Delete).

### Email Configuration (Per-User)
Email sending is configured per user (not per tenant). Each user sets up their own SMTP credentials (email/password/host/port) in their Profile page. The email send endpoint (`/api/email/send`) checks the authenticated user's personal email config first, then falls back to Microsoft 365 OAuth if available. User email config is stored in the `users.config` jsonb column under `emailSettings`. API endpoints: `GET/POST/DELETE /api/auth/email-config` (all require authentication).

### AI Analytics & Intelligence
- **AI Report Service** (`server/services/ai-report-service.ts`): Pattern-based intent detection engine that processes natural language queries, classifies them into report categories (project_overview, budget_analysis, vendor_performance, wbs_progress, schedule_status, cost_variance), and generates narrative analysis with chart data and data tables. Uses actual database queries against projects, vendors, customers, and WBS nodes. Ready for OpenAI API key integration for true LLM responses.
- **AI Reports Page** (`client/src/pages/ai-reports.tsx`): Chat-based interface with quick prompts, suggestion bubbles for follow-up queries, and responsive Recharts visualizations (Bar, Pie, Area, Line charts). Uses `useAIReport` hook for conversation management.
- **Types** defined in `shared/types/ai-report.ts`: AIReportQuery, AIReportResponse, ChartData, TableData, QuickPrompt interfaces.
- **API Endpoints**: `POST /api/ai/report` (generate report), `GET /api/ai/quick-prompts` (predefined prompts).
- **Security Modes**: Mode phi (XRPL-witnessed), Mode 1 (post-quantum encryption), Mode 0 (legacy AES-256).

### WOPI Host & Office Online Integration (12 endpoints)
- **WOPI Host Service** (`server/services/wopi-host-service.ts`): Implements WOPI protocol endpoints for Office Online integration. Generates access tokens with document-bound security (10hr TTL), provides CheckFileInfo and GetFile endpoints, and maps Office Online editor URLs.
- **Office Online Embed** (`client/src/components/documents/office-online-embed.tsx`): Document editor wrapper component with fullscreen toggle, WOPI token handling, and Office document type detection. Ready for Microsoft 365 credentials connection.
- **WOPI Endpoints**: Discovery, CheckFileInfo, GetFile, PutFile, Lock, Unlock, RefreshLock, UnlockAndRelock, GetLock, Delete, Rename, ShareUrl.
- **Database Tables**: `document_locks` (concurrent editing locks), `document_audit_logs` (operation audit trail), `wopi_sessions` (active editing sessions), `ms_graph_tokens` (OAuth token persistence).
- **Kong WOPI Bridge**: `kong/wopi-bridge.yaml` with CORS for Office Online domains, rate limiting, and PlenumNET plugin integration.

### Smart Inbox
- **Smart Inbox Page** (`client/src/pages/smart-inbox.tsx`): Email interface surfacing project-relevant emails within the ERP. Features category filtering (project/vendor/finance/customer), search, email detail view with project linking, AI-assisted WBS tagging, and Microsoft Graph integration placeholders.
- **WBS Tagging Engine**: Server-side keyword-matching engine (`EMAIL_WBS_KEYWORD_MAP` in routes.ts) auto-tags emails across 8 WBS dimensions (phase, trade, location, system, cost_code, responsibility, material, work_package) with confidence scores (0.5-0.95 range). Tags displayed as grouped badges with dimension icons, confidence percentages, and color coding (green >= 80%, amber >= 60%, muted < 60%).
- **13D Torsion Field Mapping**: Dimensions map to construction ERP data domains (D1-D3 spatial, D4-D6 temporal, D7-D9 financial, D10-D12 organizational, D13 torsion spin priority/urgency).
- **API Endpoint**: `GET /api/smart-inbox` with filter/search parameters. Returns emails with `wbsTags` array: `{dimensionType, wbsCodeId, codeName, codeValue, confidence}`.

### Kong Konnect Gateway
- **Main Config**: `kong/kong.yml` - declarative config with services for API, WOPI, AI Report, and Events.
- **WOPI Bridge**: `kong/wopi-bridge.yaml` - CORS configuration for Office Online integration.
- **Security Policies**: `kong/plenum-net-policy.yaml` - Mode phi/1/0 security policy definitions.
- **Custom Plugins**: `kong/plugins/jwt-ternary-validator.lua` - JWT + ternary token validation.
- **Service Configs**: `kong/services/` - maestro-api, maestro-wopi, maestro-ai-report, maestro-events, plenum-net-proxy.
- **Route Configs**: `kong/routes/` - api-v1, wopi-routes, ai-report-routes, documents-secure, event-routes.
- **Environments**: `kong/environments/` - development, staging, production overrides.

### PlenumNET Security Integration
- **Core Client**: `server/integrations/plenum-net-core-client.ts` - gRPC/REST binding to SFK kernel with security mode resolution, femtosecond timestamping, ternary encoding/decoding, phase-rotation encryption, and XRPL witnessing.
- **Shared Types**: `shared/types/integrations/plenum-net.ts` - SecurityMode, TorsionFieldCoordinate, TernaryWord, WitnessResult, PhaseRotationResult types.
- **Frontend Context**: `client/src/lib/integrations/plenum-net/context.tsx` - React context provider for security mode state.
- **Frontend Hooks**: `client/src/lib/integrations/plenum-net/hooks.ts` - usePlenumNetSecurity, usePlenumNetHealth, useWitnessDocument, useSecurityModeForOperation.
- **MS Graph WOPI Hooks**: `client/src/lib/integrations/ms-graph/wopi-hooks.ts` - useWopiToken, useWopiLockStatus, useWopiLock, useOfficeOnlineEmbed, isOfficeDocument.
- **Status**: Framework-ready with graceful fallbacks when services unavailable. `ENABLE_PLENUMNET=false` by default.

### Navigation
Navigation follows an 8-section architecture (Dashboard, People, Projects, Finance, Sales, Marketing, Intelligence, Documents) with database-driven, tenant-specific configuration. The "Intelligence" section (order 65) contains AI Analytics. The "Documents" section includes Smart Inbox.

### UI/UX and Design System
The application features a professional aesthetic with a default teal construction theme, full dark mode support, and customizable branding per tenant. UI patterns include cards with hover effects, semantic status badges, responsive grid layouts, and modal dialogs.

## Scripts & Tooling
- **Deployment**: `scripts/deploy/deploy-to-replit.sh`, `scripts/deploy/setup-kong.sh`, `scripts/deploy/migrate-db.sh`
- **Development**: `scripts/dev/seed-db.ts` - populates test tenants, users, projects, and WBS master codes.
- **Validation**: `scripts/tools/validate-wopi.mjs` - tests all 12 WOPI host endpoints.
- **Testing**: `scripts/tools/generate-ternary-test-data.mjs` - generates PlenumNET ternary test vectors and 13D torsion field coordinates.

## Implementation Status (Architecture v3.0)

### Phase 1: Core AI & O365 Service Setup (COMPLETE)
- Task 1.1: AI Report Service Skeleton
- Task 1.2: O365 Graph API Client
- Task 1.3: WOPI Host Endpoints (12 endpoints)

### Phase 2: Frontend Integration & UI (IN PROGRESS)
- Task 2.1: AI Report Chat Interface (COMPLETE - ai-reports.tsx)
- Task 2.2: Office Online Embed Component (COMPLETE - OfficeOnlineEmbed.tsx)
- Task 2.3: Smart Inbox + 13D WBS Tagging (COMPLETE - smart-inbox.tsx)

### Phase 3: Advanced AI & PlenumNET Integration (PENDING)
- Task 3.1: LLM Integration for Report Generation
- Task 3.2: PlenumNET Security Middleware

### Phase 4: Critical Infrastructure (PENDING)
- Task 4.1: HPTP Protocol Client
- Task 4.2: Kong Configuration (COMPLETE - full config files delivered)

### Phase 5: Deployment & Documentation (PENDING)
- Task 5.1: Docker & K8s Manifests
- Task 5.2: User Documentation

## External Dependencies

- **Kong Proxy:** Used as a security gateway for document encryption, compression, and timestamping.
- **PostgreSQL:** Primary database for persistent storage (Replit-native, Supabase deferred).
- **Microsoft 365 (Azure AD & OneDrive):** Integrated for self-service SSO and "Edit in Office" functionality for documents (Word, Excel, PowerPoint) via OAuth2, enabling editing directly in Office Online.
- **PlenumNET/SFK:** Post-quantum security framework with ternary processing, phase-rotation encryption, and XRPL witnessing (framework-ready, toggle-gated).

## GitHub Repository
- **URL**: https://github.com/SigmaWolf-8/Maestro
- **Branch**: main
- **Push method**: GitHub API (git tree/commit) via GITHUB_TOKEN secret
