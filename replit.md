# The Maestro - Construction ERP

## Overview
The Maestro is a modular, multi-tenant Enterprise Resource Planning (ERP) system designed for residential construction and land development firms. It offers a modern, web-based interface with hierarchical navigation, role-based access control, and a 13-dimensional Work Breakdown Structure (WBS) engine. The system aims to streamline project management, team collaboration, financial tracking, and document management for construction businesses. Key capabilities include comprehensive project and WBS management, multi-company support with customizable branding, advanced file management with WBS meta-tagging, and integration with Microsoft 365 for document editing and SSO.

## User Preferences
I want to prioritize a clear, concise, and professional communication style. My preferred working methodology involves iterative development, where I receive regular updates and have opportunities to provide feedback on implemented features. I value detailed explanations for complex architectural decisions and new feature implementations. Please ensure that all new code adheres to modern TypeScript and React best practices. I prefer that you ask for confirmation before making any major structural changes or before integrating new external services.

## System Architecture

### Technology Stack
- **Frontend:** React 18 + Vite + TypeScript, styled with Tailwind CSS and shadcn/ui components. Uses wouter for client-side routing, TanStack Query v5 for state management, and Zod for validation.
- **Backend:** Express.js + TypeScript.
- **Database:** PostgreSQL with Drizzle ORM.
- **Security Gateway:** Kong Proxy for encryption and security.

### Project Structure
The project is organized into `client/` (React frontend), `server/` (Express backend), and `shared/` (common types and schemas).

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

### WOPI Host & Office Online Integration
- **WOPI Host Service** (`server/services/wopi-host-service.ts`): Implements WOPI protocol endpoints for Office Online integration. Generates access tokens with document-bound security (10hr TTL), provides CheckFileInfo and GetFile endpoints, and maps Office Online editor URLs.
- **Office Online Embed** (`client/src/components/documents/office-online-embed.tsx`): Document editor wrapper component with fullscreen toggle, WOPI token handling, and Office document type detection. Ready for Microsoft 365 credentials connection.
- **API Endpoints**: `GET /api/wopi/files/:id` (CheckFileInfo), `GET /api/wopi/files/:id/contents` (GetFile), `POST /api/wopi/token/:documentId` (generate token). Token-document binding enforced for multi-tenant security.

### Smart Inbox
- **Smart Inbox Page** (`client/src/pages/smart-inbox.tsx`): Email interface surfacing project-relevant emails within the ERP. Features category filtering (project/vendor/finance/customer), search, email detail view with project linking, AI-assisted WBS tagging, and Microsoft Graph integration placeholders.
- **WBS Tagging Engine**: Server-side keyword-matching engine (`EMAIL_WBS_KEYWORD_MAP` in routes.ts) auto-tags emails across 8 WBS dimensions (phase, trade, location, system, cost_code, responsibility, material, work_package) with confidence scores (0.5-0.95 range). Tags displayed as grouped badges with dimension icons, confidence percentages, and color coding (green >= 80%, amber >= 60%, muted < 60%).
- **API Endpoint**: `GET /api/smart-inbox` with filter/search parameters. Returns emails with `wbsTags` array: `{dimensionType, wbsCodeId, codeName, codeValue, confidence}`.

### Navigation
Navigation follows an 8-section architecture (Dashboard, People, Projects, Finance, Sales, Marketing, Intelligence, Documents) with database-driven, tenant-specific configuration. The "Intelligence" section (order 65) contains AI Analytics. The "Documents" section includes Smart Inbox.

### UI/UX and Design System
The application features a professional aesthetic with a default teal construction theme, full dark mode support, and customizable branding per tenant. UI patterns include cards with hover effects, semantic status badges, responsive grid layouts, and modal dialogs.

## External Dependencies

- **Kong Proxy:** Used as a security gateway for document encryption, compression, and timestamping.
- **PostgreSQL:** Primary database for persistent storage.
- **Microsoft 365 (Azure AD & OneDrive):** Integrated for self-service SSO and "Edit in Office" functionality for documents (Word, Excel, PowerPoint) via OAuth2, enabling editing directly in Office Online.