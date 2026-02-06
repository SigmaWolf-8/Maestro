# The Maestro - Construction ERP | GitHub Roadmap

**Architecture Version:** 3.3.0 | **Last Updated:** February 6, 2026

---

## Project Summary

The Maestro is a modular, multi-tenant Enterprise Resource Planning (ERP) system for residential construction and land development firms. Built with React 18, Express.js, PostgreSQL (Drizzle ORM), and TypeScript, it provides a 13-dimensional Work Breakdown Structure engine, SaaS billing with Canadian tax compliance, Microsoft 365 integration, and post-quantum security via the PlenumNET/Salvi Framework.

---

## Current Release: v3.3.0 (February 6, 2026)

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
| Settings & Customization | Done | Per-company branding options |

#### People & Contacts
| Feature | Status | Details |
|---------|--------|---------|
| Vendors & Pricing | Done | Legacy MS Access VBA form recreation with auto-save |
| Customers | Done | Legacy form recreation with detailed data entry |
| Contacts Directory | Done | Unified searchable/filterable directory for all contacts |

#### Document Management
| Feature | Status | Details |
|---------|--------|---------|
| File Manager | Done | Drag-and-drop, 13-dimensional WBS filtering/meta-tagging |
| WOPI Host Protocol | Done | All 12 endpoints: Discovery, CheckFileInfo, GetFile, PutFile, Lock, Unlock, RefreshLock, UnlockAndRelock, GetLock, Delete, Rename, ShareUrl |
| Office Online Editing | Done | Inline Word/Excel/PowerPoint editing via WOPI |
| Document Locks | Done | 30-minute expiry, lock lifecycle, mutation validation |
| Kong Security Gateway | Done | API, WOPI, AI Report, Events services with security policies |

#### Microsoft 365 Integration
| Feature | Status | Details |
|---------|--------|---------|
| Azure AD OAuth | Done | MS Graph OAuth flow, token DB persistence |
| OneDrive File Ops | Done | File operations via MS Graph API |
| Email Sending | Done | Per-user SMTP configuration |

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

### Architecture Summary

| Layer | Count | Technology |
|-------|-------|------------|
| Client Pages | 22 | React 18, shadcn/ui, TanStack Query v5 |
| API Routers | 13 | Express.js domain routers |
| Backend Services | 12 | TypeScript service classes |
| Middleware Layers | 3 | Rate limiter, request logger, Azure AD auth |
| Ledger Adapters | 2 | Algorand, Hedera (pluggable pattern) |
| Database Tables | 28 | PostgreSQL via Drizzle ORM |
| Schema Domains | 7 | Per-domain barrel exports |
| CI/CD Workflows | 4 | GitHub Actions |
| Migration Scripts | 2 | Bash (generate + validate) |
| PlenumNET Modules | 5 | Local libternary engine |
| Total API Endpoints | 55+ | RESTful JSON |
| Total Lines of Code | ~23,000+ | TypeScript (pages + API + services + schema + middleware) |

### CI/CD Pipeline
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to main/develop | TypeScript type-check, Vite build, schema validation |
| `deploy.yml` | Push to main | Pre-deploy validation + Replit deployment |
| `db-migration.yml` | PRs with schema changes | Auto-detect, comment migration checklist |
| `security.yml` | Weekly (cron) | Dependency audit + secret leak scanning |

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

### v3.4 - Advanced Document & Collaboration
**Target:** Q2 2026

- [ ] **Real-time Collaboration** - WebSocket-based real-time updates for projects, WBS nodes, and documents
- [ ] **Document Versioning UI** - User-facing version history with diff view and rollback
- [ ] **Batch Document Operations** - Bulk upload, download, move, and WBS re-tagging
- [ ] **Advanced Search** - Full-text search across documents, projects, contacts with faceted filtering
- [ ] **Notification System** - In-app notifications for assignments, approvals, document changes, and billing events
- [ ] **Audit Trail Dashboard** - Admin-facing comprehensive audit log viewer with filtering and export

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
| v3.3.0 | Feb 6, 2026 | Production hardening: rate limiting, structured logging, Stripe live integration, Algorand/Hedera adapters, Azure AD SSO, migration tooling, system status API |
| v3.2.1 | Feb 6, 2026 | SaaS billing, Canadian tax compliance, real PlenumNET/Salvi Framework, Security Dashboard |
| v3.1 | Feb 6, 2026 | Modularized routing (11 routers), complete WOPI protocol (12 endpoints), MS Graph token persistence |
| v3.0 | Feb 6, 2026 | WOPI infrastructure, AI Analytics, Smart Inbox, Kong gateway, PlenumNET framework |

---

## Contributing

This is a private enterprise project. For feature requests or bug reports, please use GitHub Issues with the appropriate labels:
- `feature` - New feature requests
- `bug` - Bug reports
- `security` - Security-related issues (use responsible disclosure)
- `billing` - SaaS billing and subscription issues
- `plenumnet` - PlenumNET/Salvi Framework items
- `wopi` - Document and Office Online integration
- `wbs` - Work Breakdown Structure engine

---

*The Maestro - Building Intelligence for Construction*
