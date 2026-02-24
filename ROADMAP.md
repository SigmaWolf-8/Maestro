# The Maestro - Construction ERP | GitHub Roadmap

**Architecture Version:** 3.3.1 | **Last Updated:** February 24, 2026

---

## Project Summary

The Maestro is a modular, multi-tenant Enterprise Resource Planning (ERP) system for residential construction and land development firms. Built with React 18, Express.js, PostgreSQL (Drizzle ORM), and TypeScript, it provides a 13-dimensional Work Breakdown Structure engine, SaaS billing with Canadian tax compliance, ONLYOFFICE document editing, Resend-powered transactional email, and post-quantum security via the PlenumNET/Salvi Framework.

---

## Current Release: v3.3.1 (February 24, 2026)

### Completed Features

#### Core ERP Platform
| Feature | Status | Details |
|---------|--------|---------|
| Multi-Tenant Architecture | Done | Tenant CRUD, company switching, database-driven navigation |
| Dashboard | Done | Project, WBS task, team, and budget overview |
| Projects Management | Done | CRUD with status and budget tracking |
| 13-Dimensional WBS Engine | Done | Master codes, hierarchical nodes, templates, status tracking, import |
| Team Management | Done | Role-based access control (viewer, accountant, project_manager, admin) |
| Multi-Company Branding | Done | Per-tenant themes, fonts, logos |
| Settings & Customization | Done | Per-company branding options, SMTP/email config, ONLYOFFICE config |

#### People & Contacts
| Feature | Status | Details |
|---------|--------|---------|
| Vendors & Pricing | Done | Legacy MS Access VBA form recreation with auto-save |
| Customers | Done | Legacy form recreation with detailed data entry |
| Contacts Directory | Done | Unified searchable/filterable directory for all contacts |
| BambooHR Integration | Done | Employee directory, detail view, photo retrieval, iframe portal, collapsible HR sub-menu |

#### Document Management
| Feature | Status | Details |
|---------|--------|---------|
| File Manager | Done | Drag-and-drop upload, 13-dimensional WBS filtering/meta-tagging, project selector (14th dimension), auto-collapse viewer, back navigation |
| WBS Tag Editor | Done | Sidebar transforms from filter mode (checkboxes) to tag editor mode (dropdowns) when document selected |
| WOPI Host Protocol | Done | All 12 endpoints: Discovery, CheckFileInfo, GetFile, PutFile, Lock, Unlock, RefreshLock, UnlockAndRelock, GetLock, Delete, Rename, ShareUrl |
| ONLYOFFICE Integration | Ready | Per-tenant ONLYOFFICE Document Server configuration with connection testing; requires external Document Server deployment to activate in-browser Word/Excel/PowerPoint editing |
| Document Locks | Done | 30-minute expiry, lock lifecycle, mutation validation |
| Kong Security Gateway | Done | API, WOPI, AI Report, Events services with security policies |
| Price Master Catalogue | Done | Item management with compile lists, WBS tagging, and pricing workflows |
| Sign Here (SalviSign) | Done | Embedded e-signature app via iframe with fullscreen support and secure sandbox isolation |

#### PQTI-Integrated Document Lifecycle (v3.3.1)
| Feature | Status | Details |
|---------|--------|---------|
| Document Lifecycle Page | Done | Unified interactive dashboard with five subsystems: Classification, Review, Archive, Field Queue, Event Bus |
| Classification Engine | Done | Full-document classification pipeline with entity extraction, WBS resolution, multi-signal scoring, full-text search index, universal intake paths |
| Review Pipeline | Done | Auto-start reviews, WBS-based reviewer assignment, approve/reject workflow, multi-reviewer sessions, version locking |
| Archive Assembly | Done | 13-level WBS tree walk, version-locked primaries + drafts, manifest generation with review history and SHA-3 hashes |
| Field Upload Queue | Done | Upload queue with priority ordering (safety > general), chunk tracking, status management, progress UI |
| Unified Event Bus | Done | Append-only event log, publish/subscribe, standardized event schema, subscriber registration, dead-letter handling, replay capability |

#### Email & Communications (v3.3.1)
| Feature | Status | Details |
|---------|--------|---------|
| Resend Email Service | Done | Transactional email via Resend API (matching SalviSign), branded HTML templates, company-level configuration |
| SMTP Fallback | Done | Per-user and per-tenant SMTP configuration via Nodemailer as fallback when Resend unavailable |
| Email Settings UI | Done | Company-level email configuration in Settings with test email and provider selection |
| Vendor Email Workflows | Ready | Email send capability from Vendors page; ready for auto-send workflow configuration |

#### Microsoft 365 Integration
| Feature | Status | Details |
|---------|--------|---------|
| Azure AD OAuth | Done | MS Graph OAuth flow, token DB persistence |
| OneDrive File Ops | Done | File operations via MS Graph API |

#### Scheduling (v3.3.1)
| Feature | Status | Details |
|---------|--------|---------|
| Schedule Management | Done | Task templates, project scheduling, WBS integration |

#### Security & Access Control
| Feature | Status | Details |
|---------|--------|---------|
| User Group Security | Done | Granular form-level access control, permissions matrix |
| Role-Based Navigation | Done | 8-section tenant-specific nav with role filtering |

#### AI & Intelligence
| Feature | Status | Details |
|---------|--------|---------|
| AI Report Service | Done | Pattern-based intent detection, report generation (project_overview, budget_analysis, etc.) |
| AI Reports Page | Done | Chat-based interface, quick prompts, Recharts visualizations |
| Smart Inbox | Done | Email surfacing with category filtering, project linking, AI-assisted WBS tagging |

#### SaaS Billing Infrastructure (v3.2.1)
| Feature | Status | Details |
|---------|--------|---------|
| Subscription Plans | Done | Plan management with tier-based feature gating |
| Canadian Tax Service | Done | All 13 provinces: GST/HST/PST/QST regimes, rates in basis points |
| Billing Service | Done | Invoice generation, line items, tax breakdown, payment tracking |
| Usage Tracking | Done | Metrics recording, limit checking, summary aggregation |
| Pricing Config | Done | DB-driven key-value pricing with PUBLIC/PRIVATE visibility |
| Tenant Onboarding | Done | Automated provisioning with default subscription setup |
| Ledger Witnessing | Done | Algorand (primary) / Hedera (fallback) with dev/live mode gating |
| Subscription Management Page | Done | Self-service plan selection and subscription management |
| Billing Dashboard Page | Done | Invoice history, payment status, usage overview |
| Admin Pricing Page | Done | Admin interface for pricing configuration |

#### PlenumNET / Salvi Framework (v3.2.1)
| Feature | Status | Details |
|---------|--------|---------|
| libternary Engine | Done | 5 modules integrated locally under `server/plenumnet/` |
| GF(3) Ternary Arithmetic | Done | Add, multiply, rotate, XOR, NOT with constant-time execution |
| Phase-Rotation Encryption | Done | Phase-split with guardian integrity, 4 modes (high_security, balanced, performance, adaptive) |
| Femtosecond Timing | Done | Salvi Epoch (2025-04-01) anchored, hrtime-based, ~100ns accuracy |
| Ternary Encoding | Done | Encode/decode, RLE compression, ternary hashing (SPN with rotation S-box) |
| Information Density | Done | log2(3) = 1.585 bits/trit (+58.5% vs binary) |
| PlenumNET API | Done | 15 endpoints for ternary ops, phase encryption, timing, hashing, demos |
| Security Dashboard | Done | Interactive page with live GF(3) tables, encryption demos, hash tool |
| BigInt JSON Serialization | Done | Recursive `serializeBigInts` utility across all API responses |
| Ternary Compression | Done | Transparent compression service using ternary encoding + RLE + zlib pipeline |
| .tern File Format | Done | Binary document format with TERN magic bytes, JSON header, compressed data body, optional phase encryption |

#### Production Hardening (v3.3.0)
| Feature | Status | Details |
|---------|--------|---------|
| Rate Limiting | Done | Per-tenant plan-tier limits (essentials: 100/min, professional: 500/min, enterprise: 2000/min, quantum: 10000/min), specialized limiters for auth/PlenumNET/webhooks |
| Structured Logging | Done | JSON request logging with correlation IDs (X-Correlation-ID), error classification, hrtime duration tracking |
| Error Handler Middleware | Done | Centralized error handling with status classification (BAD_REQUEST, UNAUTHORIZED, RATE_LIMITED, etc.) |
| Stripe Live Integration | Done | StripeService with customer creation, product/price sync, subscription lifecycle, webhook handler (invoice.paid, payment_failed, subscription.updated/deleted), payment methods, setup intents |
| Algorand SDK Adapter | Done | Pluggable adapter with REST API integration, mirror node verification, dev-mode fallback |
| Hedera SDK Adapter | Done | Consensus Service adapter with topic messages, mirror node verification, dev-mode fallback |
| Azure AD SSO Scaffolding | Done | OAuth2 code exchange, MS Graph profile fetch, JWT parsing middleware, multi-tenant support |
| Migration Tooling | Done | generate-migration.sh, validate-schema.sh scripts, enhanced CI workflow with schema diff detection |
| System Status API | Done | `/api/system/status` exposing Stripe, Algorand, Hedera, Azure AD, and all v3.3 feature readiness |
| Data Encryption at Rest | Done | PlenumNET phase-encryption for database field-level encryption with transparent encrypt/decrypt |

### Architecture Summary

| Layer | Count | Technology |
|-------|-------|------------|
| Client Pages | 31 | React 18, shadcn/ui, TanStack Query v5 |
| API Routers | 18 | Express.js domain routers |
| Backend Services | 21 | TypeScript service classes |
| Middleware Layers | 3 | Rate limiter, request logger, Azure AD auth |
| Ledger Adapters | 2 | Algorand, Hedera (pluggable pattern) |
| Database Tables | 50 | PostgreSQL via Drizzle ORM |
| Schema Domains | 10 | Per-domain barrel exports |
| CI/CD Workflows | 4 | GitHub Actions |
| Migration Scripts | 2 | Bash (generate + validate) |
| PlenumNET Modules | 5 | Local libternary engine |
| Total API Endpoints | 100+ | RESTful JSON |
| Total Lines of Code | ~41,000+ | TypeScript (pages + API + services + schema + middleware) |

### CI/CD Pipeline
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to main/develop | TypeScript type-check, Vite build, schema validation |
| `deploy.yml` | Push to main | Pre-deploy validation + Replit deployment |
| `db-migration.yml` | PRs with schema changes | Auto-detect, comment migration checklist |
| `security.yml` | Weekly (cron) | Dependency audit + secret leak scanning |

---

## What's New in v3.3.1 (February 24, 2026)

### Document Lifecycle System
Complete implementation of the PQTI-Integrated Document Lifecycle with five fully interactive subsystems:
- **Classification Engine** — Automated document classification with entity extraction and 13-dimensional WBS resolution
- **Review Pipeline** — One-click review initiation, multi-reviewer approval/rejection workflows, version locking with audit trails
- **Archive Assembly** — Hierarchical archive generation across all 13 WBS dimensions with SHA-3 integrity hashes
- **Field Upload Queue** — Priority-ordered upload management with chunk tracking for large files
- **Unified Event Bus** — Centralized event system with publish/subscribe, dead-letter handling, and cross-module event replay

### File Manager UX Overhaul
- Drag-and-drop upload zone moved into the document selector sidebar for cleaner layout
- WBS sidebar transforms between **filter mode** (checkboxes for narrowing results) and **tag editor mode** (dropdowns for assigning WBS to selected document)
- **Project selector** added as 14th WBS dimension — filter by project or assign projects to documents
- Document list **auto-collapses** when viewing a document to maximize reading space
- **Back arrow** navigation to return to the full document list
- Proper URL synchronization when navigating between Document section pages

### Email System (Resend API)
- Integrated Resend API for transactional email delivery, matching SalviSign's proven email infrastructure
- Three-tier email fallback: Resend API → User SMTP → Tenant SMTP
- Company-level email settings UI in Settings page with test email capability
- Ready for automated vendor notification workflows

### Additional Improvements
- Price Master catalogue with compile lists and WBS tagging
- Schedule management with task templates and project scheduling
- BambooHR integration for employee directory and HR portal
- Ternary compression service and .tern binary file format
- Database field-level encryption via PlenumNET phase-encryption
- ONLYOFFICE Document Server configuration UI with connection testing (requires external server)

### Corrections from v3.3.0
- **Email Sending** status corrected from "Done" to properly reflect the new Resend API implementation with working delivery
- **Office Online Editing** status corrected to "Ready" — WOPI protocol is fully implemented (12 endpoints), ONLYOFFICE configuration UI is built, but requires an external ONLYOFFICE Document Server to be deployed and connected
- **LibreOffice** clarification — LibreOffice is used by SalviSign for server-side document conversion (DOCX/XLSX to PDF); The Maestro uses **ONLYOFFICE Document Server** for in-browser Office document editing. These are separate tools serving different purposes

---

## Roadmap: Upcoming Milestones

### v3.3 - Production Hardening & Stripe Live Integration
**Released:** February 6, 2026

- [x] **Stripe Live Integration** - StripeService with customer/subscription/invoice lifecycle, webhook handler, product/price sync, payment methods, setup intents
- [x] **Algorand/Hedera SDK Adapters** - Pluggable adapter pattern with live API integration and dev-mode fallback gating
- [x] **Azure AD SSO Scaffolding** - OAuth2 code exchange, MS Graph profile fetch, JWT parsing middleware, multi-tenant auth
- [ ] **Kong Gateway Deployment** - Deploy Kong proxy with PlenumNET security plugins to production infrastructure
- [x] **Database Migration Tooling** - generate-migration.sh, validate-schema.sh, enhanced CI workflow with schema diff detection
- [x] **Rate Limiting & Throttling** - Per-tenant plan-tier-aware rate limiting with specialized limiters for auth/PlenumNET/webhooks
- [x] **Structured Logging** - JSON request logging with correlation IDs, error classification, duration tracking, error handler middleware
- [x] **System Status API** - `/api/system/status` endpoint exposing all integration readiness

### v3.3.1 - Document Lifecycle & Email
**Released:** February 24, 2026

- [x] **PQTI Document Lifecycle** - Five interactive subsystems: Classification Engine, Review Pipeline, Archive Assembly, Field Upload Queue, Unified Event Bus
- [x] **File Manager UX** - WBS tag editor, project selector, auto-collapse, drag-drop in sidebar, back navigation
- [x] **Resend Email** - Transactional email via Resend API with company-level configuration and test capability
- [x] **Price Master** - Item catalogue with compile lists, WBS tagging, and pricing workflows
- [x] **Schedule Management** - Task templates, project scheduling, WBS integration
- [x] **BambooHR Integration** - Employee directory, HR portal, photo retrieval

### v3.4 - Advanced Document & Collaboration
**Target:** Q2 2026

- [ ] **ONLYOFFICE Server Deployment** - Deploy and connect ONLYOFFICE Document Server for live in-browser Office editing
- [ ] **Real-time Collaboration** - WebSocket-based real-time updates for projects, WBS nodes, and documents
- [ ] **Document Versioning UI** - User-facing version history with diff view and rollback
- [ ] **Batch Document Operations** - Bulk upload, download, move, and WBS re-tagging
- [ ] **Advanced Search** - Full-text search across documents, projects, contacts with faceted filtering
- [ ] **Notification System** - In-app notifications for assignments, approvals, document changes, and billing events
- [ ] **Audit Trail Dashboard** - Admin-facing comprehensive audit log viewer with filtering and export
- [ ] **Automated Email Workflows** - Auto-send vendor notifications, purchase order confirmations, and approval reminders

### v3.5 - Reporting & Analytics
**Target:** Q3 2026

- [ ] **Custom Report Builder** - User-defined reports with drag-and-drop field selection, grouping, and export (PDF/Excel)
- [ ] **Budget Forecasting** - WBS-integrated budget projections with variance analysis
- [ ] **Gantt Chart Visualization** - Interactive project timeline with WBS task dependencies
- [ ] **Dashboard Widgets** - Configurable dashboard with drag-and-drop widget placement
- [ ] **Scheduled Reports** - Automated report generation and email delivery
- [ ] **Multi-currency Support** - CAD/USD with exchange rate management

### v3.6 - Mobile & Field Operations
**Target:** Q4 2026

- [ ] **Progressive Web App (PWA)** - Offline-capable mobile experience for field teams
- [ ] **Photo & Inspection Capture** - On-site photo documentation with GPS tagging and WBS linking
- [ ] **Time Tracking** - Field crew time entry with WBS task assignment
- [ ] **Daily Logs** - Construction daily log entries with weather, crew, equipment tracking
- [ ] **Push Notifications** - Mobile push notifications for critical events
- [ ] **QR Code Integration** - Asset and location tagging for field identification

### v4.0 - Enterprise & Scale
**Target:** 2027

- [ ] **Multi-region Deployment** - Geographic database distribution for Canadian provincial compliance
- [ ] **Advanced RBAC** - Attribute-based access control with custom permission policies
- [ ] **API Gateway (Public)** - Tenant-facing REST API with OAuth2 token management and rate limiting
- [ ] **White-Label Support** - Full white-label deployment with custom domains, branding, and email templates
- [ ] **Integration Marketplace** - Pre-built connectors for accounting (QuickBooks, Sage), scheduling (Procore), and CRM platforms
- [ ] **PlenumNET v4** - Next-generation post-quantum cryptography with XRPL mainnet witnessing

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| v3.3.1 | Feb 24, 2026 | Document Lifecycle (5 subsystems), File Manager UX overhaul, Resend email, Price Master, Schedule, BambooHR, 50 database tables, 100+ endpoints |
| v3.3.0 | Feb 6, 2026 | Production hardening: rate limiting, structured logging, Stripe live integration, Algorand/Hedera adapters, Azure AD SSO, migration tooling, system status API |
| v3.2.1 | Feb 6, 2026 | SaaS billing, Canadian tax compliance, real PlenumNET/Salvi Framework, Security Dashboard |
| v3.1 | Feb 6, 2026 | Modularized routing (11 routers), complete WOPI protocol (12 endpoints), MS Graph token persistence |
| v3.0 | Feb 6, 2026 | WOPI infrastructure, AI Analytics, Smart Inbox, Kong gateway, PlenumNET framework |

---

## Document Editing Clarification

**ONLYOFFICE Document Server** is The Maestro's chosen solution for in-browser Office document editing (Word, Excel, PowerPoint). The WOPI protocol (12 endpoints) and configuration UI are fully built. To activate editing, an ONLYOFFICE Document Server instance must be deployed and its URL configured in Settings.

**LibreOffice** is used by the companion SalviSign app for server-side document format conversion (DOCX/XLSX/CSV → PDF). It is not used within The Maestro itself.

These are complementary tools: ONLYOFFICE handles interactive editing within The Maestro, while LibreOffice handles automated format conversion within SalviSign.

---

## Contributing

This is a private enterprise project. For feature requests or bug reports, please use GitHub Issues with the appropriate labels:
- `feature` - New feature requests
- `bug` - Bug reports
- `security` - Security-related issues (use responsible disclosure)
- `billing` - SaaS billing and subscription issues
- `plenumnet` - PlenumNET/Salvi Framework items
- `documents` - Document management, ONLYOFFICE, and lifecycle
- `wbs` - Work Breakdown Structure engine
- `email` - Email delivery and notification workflows

---

*The Maestro - Building Intelligence for Construction*
