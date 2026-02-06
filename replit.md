# The Maestro - Construction ERP

## Overview
The Maestro is a modular, multi-tenant Enterprise Resource Planning (ERP) system for residential construction and land development firms. It provides a modern, web-based interface with hierarchical navigation, role-based access control, and a 13-dimensional Work Breakdown Structure (WBS) engine. The system aims to streamline project management, team collaboration, financial tracking, and document management, offering capabilities such as comprehensive project and WBS management, multi-company support with customizable branding, advanced file management with WBS meta-tagging, and integration with Microsoft 365 for document editing and SSO.

**Architecture Version:** 3.3.0 (February 6, 2026)

## Recent Changes
- **v3.3.0** (Feb 6, 2026): Production Hardening — Rate limiting middleware (per-tenant with plan-tier limits), structured request logging with correlation IDs and error classification, Stripe live integration (StripeService with customer/subscription/invoice lifecycle, webhook handler, product/price sync), Algorand/Hedera SDK adapters (pluggable adapter pattern with dev/live mode gating), Azure AD SSO scaffolding (token exchange, profile fetch, auth middleware), Drizzle migration tooling (generation scripts, enhanced CI workflow), system status API (`/api/system/status` with all integration readiness), 13 API routers with 55+ endpoints total.
- **v3.2.1** (Feb 6, 2026): SaaS Billing & Authentication Integration + Real PlenumNET/Salvi Framework — 6 new DB tables, 8 backend services, 11 API route files with 45+ endpoints, 4 client pages, Real libternary engine integrated under `server/plenumnet/` (5 modules), PlenumNetCoreClient rewritten from HTTP stubs to local libternary, LedgerWitnessService enhanced with ternary hash payloads and femtosecond timestamps.
- **v3.1** (Feb 6, 2026): Modularized backend routing (7 domain routers), completed all 12 WOPI endpoints with lock lifecycle, wired MS Graph token DB persistence, added 16 WOPI storage methods to IStorage/DatabaseStorage.
- **v3.0** (Feb 6, 2026): WOPI infrastructure tables, AI Analytics, Smart Inbox, Kong gateway config, PlenumNET security framework.

## User Preferences
I want to prioritize a clear, concise, and professional communication style. My preferred working methodology involves iterative development, where I receive regular updates and have opportunities to provide feedback on implemented features. I value detailed explanations for complex architectural decisions and new feature implementations. Please ensure that all new code adheres to modern TypeScript and React best practices. I prefer that you ask for confirmation before making any major structural changes or before integrating new external services.

## System Architecture

### Technology Stack
- **Frontend:** React 18 + Vite + TypeScript, Tailwind CSS, shadcn/ui, wouter, TanStack Query v5, Zod.
- **Backend:** Express.js + TypeScript.
- **Database:** PostgreSQL with Drizzle ORM.
- **Payments:** Stripe (live integration with webhook handling).
- **Security Gateway:** Kong Proxy with PlenumNET custom plugins.
- **Auth:** Replit OIDC (dev) / Azure AD (production, scaffolded).
- **Ledger:** Algorand (primary) / Hedera (fallback) with adapter pattern.

### Project Structure
Organized into `client/`, `server/`, `shared/`, `kong/`, and `scripts/`.

### Backend API Modular Routing (v3.3)
Backend routes extracted from monolithic routes.ts into domain-specific routers under `server/api/`:
- `tenants.ts` - Tenant CRUD, navigation, dashboard, dimensions (~240 lines)
- `projects.ts` - Projects, WBS nodes/templates/master codes, copy master WBS (~565 lines)
- `people.ts` - Team, customers, quotes, vendors, vendor contacts, contacts directory (~640 lines)
- `documents.ts` - Documents CRUD, user groups, permissions, meta tags, Kong endpoints (~556 lines)
- `microsoft.ts` - Microsoft Graph OAuth, file ops, email sending, SMTP config (~540 lines)
- `wopi.ts` - All 12 WOPI host protocol endpoints (~270 lines)
- `intelligence.ts` - AI reports, quick prompts, Smart Inbox with WBS tagging (~250 lines)
- `subscriptions.ts` - Subscription plans, current subscription, billing calculations, provinces, usage (16 endpoints)
- `billing.ts` - Invoice CRUD, invoice generation, ledger witnessing, usage metrics (7 endpoints)
- `admin-pricing.ts` - Pricing config CRUD, plan management, Stripe sync, seed data (7 endpoints)
- `plenumnet.ts` - PlenumNET security API: 15 endpoints for ternary operations, phase encryption, timing, hashing, demos
- `stripe.ts` - Stripe integration: status, customers, product sync, subscriptions, payment methods, setup intents, webhook (8 endpoints)
- `system.ts` - System status, health check, Azure AD auth flow (5 endpoints)

The main `server/routes.ts` mounts 13 routers with rate limiting middleware, request logging, and error handler. Each router exports a `create*Router()` factory.

### Middleware Stack (v3.3)
Production middleware under `server/middleware/`:
- `rate-limiter.ts` - Per-tenant rate limiting with plan-tier awareness (essentials: 100/min, professional: 500/min, enterprise: 2000/min, quantum: 10000/min), specialized limiters for auth (20/15min), PlenumNET (300/min), webhooks (100/min)
- `request-logger.ts` - Structured JSON request logging with correlation IDs (X-Correlation-ID), error classification (BAD_REQUEST, UNAUTHORIZED, RATE_LIMITED, etc.), duration tracking via hrtime
- `azure-ad-auth.ts` - Azure AD SSO scaffolding: OAuth2 code exchange, profile fetch via MS Graph, JWT token parsing middleware, multi-tenant support

### Backend Services (v3.3)
12 domain services under `server/services/`:
- `document-service.ts` - Document orchestration with Kong encryption, CRUD, WOPI tokens, audit logging
- `tax-service.ts` - Canadian tax calculations for 13 provinces (GST/HST/PST/QST)
- `pricing-config-service.ts` - DB-driven key-value pricing with PUBLIC/PRIVATE visibility
- `subscription-service.ts` - Plan management, subscription CRUD, billing calculations
- `billing-service.ts` - Invoice generation with line items, tax breakdown, payment tracking
- `usage-tracking-service.ts` - Usage metrics recording, limit checking, summary aggregation
- `ledger-witness-service.ts` - Adapter-pattern ledger witnessing with ternary hashing via Algorand/Hedera adapters
- `tenant-onboarding-service.ts` - Automated tenant provisioning with default subscription
- `stripe-service.ts` - Stripe live integration: customer creation, product/price sync, subscription lifecycle, webhook handling (invoice.paid, payment_failed, subscription.updated/deleted), payment methods, setup intents
- `ai-report-service.ts` - Pattern-based AI report generation
- `wopi-host-service.ts` - WOPI protocol host service

### Ledger Adapters (v3.3)
Pluggable ledger adapter pattern under `server/services/ledger-adapters/`:
- `types.ts` - LedgerAdapter interface (witness, verify) and LedgerWitnessResult type
- `algorand-adapter.ts` - Algorand REST API integration: transaction params, app call construction, mirror node verification; dev-mode fallback when ALGORAND_APP_ID/ALGORAND_API_TOKEN not set
- `hedera-adapter.ts` - Hedera Consensus Service integration: topic message submission, mirror node verification; dev-mode fallback when HEDERA_TOPIC_ID/HEDERA_OPERATOR_ID/HEDERA_OPERATOR_KEY not set
- `index.ts` - Factory function getLedgerAdapter() and getLedgerStatus()

### CI/CD Pipeline
4 GitHub Actions workflows under `.github/workflows/`:
- `ci.yml` - TypeScript type-check, Vite build, schema validation on push/PR to main/develop
- `deploy.yml` - Pre-deploy validation + Replit deployment trigger on push to main
- `db-migration.yml` - Enhanced: schema diff detection, new table detection, barrel export validation, migration generation guidance, automated PR comments with checklist
- `security.yml` - Weekly dependency audit + secret leak scanning

### Migration Tooling (v3.3)
Scripts under `scripts/`:
- `generate-migration.sh` - Schema validation, Drizzle migration generation with timestamps, apply guidance
- `validate-schema.sh` - TypeScript compilation check, barrel export verification, storage interface validation

### Database Schema
Comprises 28 tables including core entities like `tenants`, `projects`, `wbs_nodes`, `documents`, `customers`, and `vendors`, WOPI/document-specific tables such as `document_locks` and `wopi_sessions`, and billing tables: `subscription_plans`, `tenant_subscriptions`, `subscription_invoices`, `pricing_config`, `stripe_sync`, `usage_metrics`.

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
    - **AI Report Service:** Pattern-based intent detection, report generation with narrative analysis, chart data, and tables.
    - **AI Reports Page:** Chat-based interface with quick prompts and Recharts visualizations.
- **WOPI Host & Office Online Integration (12 endpoints complete):** Full WOPI protocol with lock lifecycle (30-min expiry), file mutation operations with lock validation, comprehensive audit logging, 16 storage methods.
- **Smart Inbox:** Email interface surfacing project-relevant emails with category filtering, search, project linking, and AI-assisted 13-dimensional WBS tagging.
- **Kong Konnect Gateway:** Declarative configuration for API, WOPI, AI Report, and Events services, including security policies and custom plugins.
- **PlenumNET Security Integration:** Real libternary engine (v3.2.1) integrated locally under `server/plenumnet/` with 5 modules. Femtosecond timing anchored to Salvi Epoch (2025-04-01). Security Dashboard page at `/security/dashboard` with live demos.
- **Stripe Payment Processing (v3.3):** Full Stripe integration with customer management, product/price synchronization, subscription lifecycle (create, cancel, status sync), webhook handling for invoice.paid/payment_failed/subscription.updated/deleted, payment method management, setup intents for card onboarding.
- **Rate Limiting (v3.3):** Per-tenant rate limiting with plan-tier-aware limits, specialized limiters for auth endpoints, PlenumNET API, and webhook receivers.
- **Structured Logging (v3.3):** JSON request logging with correlation IDs, error classification, duration tracking, error handler middleware.
- **System Status API (v3.3):** `/api/system/status` endpoint exposing integration readiness for Stripe, Algorand, Hedera, Azure AD, and all v3.3 features.

### UI/UX and Design System
Professional aesthetic with a default teal construction theme, full dark mode, and customizable branding per tenant. Features cards, semantic status badges, responsive grid layouts, and modal dialogs.

## External Dependencies

- **Stripe:** Payment processing for SaaS subscriptions (requires STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET).
- **Kong Proxy:** Acts as a security gateway for document encryption, compression, and timestamping.
- **PostgreSQL:** The primary database for persistent data storage.
- **Microsoft 365 (Azure AD & OneDrive):** Integrated for self-service SSO and "Edit in Office" functionality for documents via OAuth2.
- **Algorand:** Primary distributed ledger for transaction witnessing (requires ALGORAND_APP_ID, ALGORAND_API_TOKEN).
- **Hedera:** Fallback distributed ledger via Consensus Service (requires HEDERA_TOPIC_ID, HEDERA_OPERATOR_ID, HEDERA_OPERATOR_KEY).
- **Azure AD:** Production SSO provider (requires AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET).
- **PlenumNET/SFK:** A post-quantum security framework providing ternary processing, phase-rotation encryption, and XRPL witnessing.

## Environment Variables (v3.3)
### Required for Production
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `AZURE_AD_TENANT_ID` - Azure AD tenant ID
- `AZURE_AD_CLIENT_ID` - Azure AD application client ID
- `AZURE_AD_CLIENT_SECRET` - Azure AD client secret
- `ALGORAND_APP_ID` - Algorand application ID for witnessing
- `ALGORAND_API_TOKEN` - Algorand API token
- `HEDERA_TOPIC_ID` - Hedera topic ID for consensus
- `HEDERA_OPERATOR_ID` - Hedera operator account ID
- `HEDERA_OPERATOR_KEY` - Hedera operator private key

### Optional
- `ALGORAND_SERVER` - Algorand API server (default: mainnet algonode)
- `ALGORAND_SENDER_ADDRESS` - Algorand sender address
- `HEDERA_NETWORK` - Hedera network (default: mainnet)
- `AZURE_AD_REDIRECT_URI` - Azure AD OAuth redirect URI
