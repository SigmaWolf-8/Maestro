# The Maestro - Construction ERP

## Overview
The Maestro is a modular, multi-tenant Enterprise Resource Planning (ERP) system for residential construction and land development firms. It provides a modern, web-based interface with hierarchical navigation, role-based access control, and a 13-dimensional Work Breakdown Structure (WBS) engine. The system aims to streamline project management, team collaboration, financial tracking, and document management, offering capabilities such as comprehensive project and WBS management, multi-company support with customizable branding, advanced file management with WBS meta-tagging, and integration with Microsoft 365 for document editing and SSO.

**Architecture Version:** 3.1 (February 6, 2026)

## Recent Changes
- **v3.1** (Feb 6, 2026): Modularized backend routing (7 domain routers), completed all 12 WOPI endpoints with lock lifecycle, wired MS Graph token DB persistence, added 16 WOPI storage methods to IStorage/DatabaseStorage.
- **v3.0** (Feb 6, 2026): WOPI infrastructure tables, AI Analytics, Smart Inbox, Kong gateway config, PlenumNET security framework.

## User Preferences
I want to prioritize a clear, concise, and professional communication style. My preferred working methodology involves iterative development, where I receive regular updates and have opportunities to provide feedback on implemented features. I value detailed explanations for complex architectural decisions and new feature implementations. Please ensure that all new code adheres to modern TypeScript and React best practices. I prefer that you ask for confirmation before making any major structural changes or before integrating new external services.

## System Architecture

### Technology Stack
- **Frontend:** React 18 + Vite + TypeScript, Tailwind CSS, shadcn/ui, wouter, TanStack Query v5, Zod.
- **Backend:** Express.js + TypeScript.
- **Database:** PostgreSQL with Drizzle ORM.
- **Security Gateway:** Kong Proxy with PlenumNET custom plugins.
- **Auth:** Replit OIDC (dev) / Azure AD (production).

### Project Structure
Organized into `client/`, `server/`, `shared/`, `kong/`, and `scripts/`.

### Backend API Modular Routing (v3.1)
Backend routes extracted from monolithic routes.ts (~3,100 lines) into domain-specific routers under `server/api/`:
- `tenants.ts` - Tenant CRUD, navigation, dashboard, dimensions (~240 lines)
- `projects.ts` - Projects, WBS nodes/templates/master codes, copy master WBS (~565 lines)
- `people.ts` - Team, customers, quotes, vendors, vendor contacts, contacts directory (~640 lines)
- `documents.ts` - Documents CRUD, user groups, permissions, meta tags, Kong endpoints (~556 lines)
- `microsoft.ts` - Microsoft Graph OAuth, file ops, email sending, SMTP config (~540 lines)
- `wopi.ts` - All 12 WOPI host protocol endpoints (~270 lines)
- `intelligence.ts` - AI reports, quick prompts, Smart Inbox with WBS tagging (~250 lines)

The main `server/routes.ts` (~30 lines) only mounts routers and sets up auth. Each router exports a `create*Router()` factory. Shared `getDefaultTenantId()` exported from `tenants.ts`.

### Database Schema
Comprises 22 tables including core entities like `tenants`, `projects`, `wbs_nodes`, `documents`, `customers`, and `vendors`, as well as WOPI/document-specific tables such as `document_locks` and `wopi_sessions`.

### Per-Domain Schema Organization
The `shared/schema/` directory contains per-domain barrel exports for clear organization (e.g., `tenants.ts`, `users.ts`, `projects.ts`, `wbs.ts`, `documents.ts`).

### Core Features
- **Dashboard:** Project, WBS task, team, and budget overview.
- **Projects Management:** CRUD for projects with status and budget tracking.
- **Work Breakdown Structure (WBS):** 13-dimensional engine with master codes, hierarchical nodes, status tracking, and import capabilities.
- **Team Management:** User listing with role-based access control (viewer, accountant, project_manager, admin).
- **Navigation:** 8-section, database-driven, tenant-specific navigation with role-based filtering.
- **Multi-Company Support:** Individual branding (themes, fonts, logos) and company switching.
- **Settings & Customization:** Per-company branding options.
- **Legacy Form Recreations:** MS Access VBA forms for Vendors & Pricing and Customers, with auto-save and detailed data entry.
- **Contacts Directory:** Unified searchable/filterable directory for all contacts.
- **File Manager:** Document management with drag-and-drop, 13-dimensional WBS filtering/meta-tagging, document viewer, and inline Office Online editing via WOPI.
- **User Group Security:** Granular, form-level access control with user group management and permissions matrix.
- **Email Configuration:** Per-user SMTP settings for email sending.
- **AI Analytics & Intelligence:**
    - **AI Report Service:** Pattern-based intent detection, report generation (project_overview, budget_analysis, etc.) with narrative analysis, chart data, and tables.
    - **AI Reports Page:** Chat-based interface with quick prompts and Recharts visualizations.
- **WOPI Host & Office Online Integration (12 endpoints complete):** Full WOPI protocol with lock lifecycle (30-min expiry), file mutation operations with lock validation, comprehensive audit logging, 16 storage methods. Endpoints: Discovery, CheckFileInfo, GetFile, PutFile, Lock, Unlock, RefreshLock, UnlockAndRelock, GetLock, Delete, Rename, ShareUrl. MS Graph tokens persisted to database (replaced in-memory store).
- **Smart Inbox:** Email interface surfacing project-relevant emails with category filtering, search, project linking, and AI-assisted 13-dimensional WBS tagging based on keyword matching.
- **Kong Konnect Gateway:** Declarative configuration for API, WOPI, AI Report, and Events services, including security policies and custom plugins.
- **PlenumNET Security Integration:** gRPC/REST client binding to SFK kernel for security mode resolution, femtosecond timestamping, ternary encoding/decoding, phase-rotation encryption, and XRPL witnessing (framework-ready, toggle-gated).

### UI/UX and Design System
Professional aesthetic with a default teal construction theme, full dark mode, and customizable branding per tenant. Features cards, semantic status badges, responsive grid layouts, and modal dialogs.

## External Dependencies

- **Kong Proxy:** Acts as a security gateway for document encryption, compression, and timestamping.
- **PostgreSQL:** The primary database for persistent data storage.
- **Microsoft 365 (Azure AD & OneDrive):** Integrated for self-service SSO and "Edit in Office" functionality for documents (Word, Excel, PowerPoint) via OAuth2, enabling direct editing in Office Online.
- **PlenumNET/SFK:** A post-quantum security framework providing ternary processing, phase-rotation encryption, and XRPL witnessing.