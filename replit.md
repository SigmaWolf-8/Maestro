# The Maestro - Construction ERP

## Overview
The Maestro is a modular, multi-tenant Enterprise Resource Planning (ERP) system designed for residential construction and land development firms. It offers a modern, web-based interface with hierarchical navigation, role-based access control, and a 13-dimensional Work Breakdown Structure (WBS) engine. The system's core purpose is to streamline project management, team collaboration, financial tracking, and document management, featuring capabilities such as comprehensive project and WBS management, multi-company support with customizable branding, advanced file management with WBS meta-tagging, and integration with Microsoft 365 for document editing and single sign-on (SSO).

## User Preferences
I want to prioritize a clear, concise, and professional communication style. My preferred working methodology involves iterative development, where I receive regular updates and have opportunities to provide feedback on implemented features. I value detailed explanations for complex architectural decisions and new feature implementations. Please ensure that all new code adheres to modern TypeScript and React best practices. I prefer that you ask for confirmation before making any major structural changes or before integrating new external services.

## System Architecture

### Technology Stack
- **Frontend:** React 18 + Vite + TypeScript, Tailwind CSS, shadcn/ui, wouter, TanStack Query v5, Zod.
- **Backend:** Express.js + TypeScript.
- **Database:** PostgreSQL with Drizzle ORM.
- **Payments:** Stripe.
- **Security Gateway:** Kong Proxy with PlenumNET custom plugins.
- **Auth:** Replit OIDC (dev) / Azure AD (production).
- **Ledger:** Algorand (primary) / Hedera (fallback) with adapter pattern.
- **Email:** Resend API (primary, matching SalviSign) / Nodemailer SMTP (fallback).

### Core Architectural Decisions
- **Modular Backend:** Backend routes are organized into domain-specific routers for scalability and maintainability.
- **Middleware Stack:** Includes per-tenant rate limiting, structured JSON request logging with correlation IDs, and Azure AD SSO.
- **Domain Services:** A clear separation of concerns with dedicated services for document orchestration, tax calculations, pricing, subscriptions, billing, usage tracking, ledger witnessing, tenant onboarding, Stripe integration, AI reports, and WOPI hosting.
- **Pluggable Ledger Adapters:** An adapter pattern for integrating with different distributed ledgers (Algorand and Hedera) with dev/live mode gating.
- **CI/CD Pipeline:** Automated workflows for type-checking, building, deployment, database migration guidance, and security scanning.
- **Database Schema:** Comprises 28 tables, organized into per-domain barrel exports for clarity.
- **UI/UX and Design System:** Professional aesthetic with a default teal theme, full dark mode, customizable branding, and responsive design.

### Key Features
- **Project & WBS Management:** CRUD operations for projects, 13-dimensional WBS engine with master codes, hierarchical nodes, and status tracking.
- **Multi-Tenant Support:** Individual branding and company switching.
- **Advanced File Management:** Document management with WBS filtering/meta-tagging, large document viewer, and ONLYOFFICE Docs integration for in-browser document editing with server-side decryption support for encrypted documents.
- **Security:** Role-based access control, user group security, and Kong gateway integration for API security.
- **AI Analytics & Intelligence:** AI Report Service for pattern-based intent detection and report generation, and a Smart Inbox for project-relevant emails with AI-assisted WBS tagging.
- **ONLYOFFICE Docs Integration:** Self-hosted or cloud ONLYOFFICE Document Server integration for editing Word, Excel, and PowerPoint files in-browser. Configuration stored per-tenant. Supports encrypted document editing with automatic decrypt/re-encrypt.
- **PlenumNET Security Integration:** Integration with PlenumNET (SigmaWolf-8/Ternary, 121 commits, 194 verified endpoints) post-quantum ternary computing platform at `https://plenumnet.replit.app`. Maestro is a consumer of PlenumNET services via HTTP — all crypto code stays in the Ternary repo. Local integration also includes libternary engine for tribonacci database indexing for WBS sharding (28-fold coverage mapped to 13D WBS), transparent column compression via ternary encoding + RLE + zlib, and .tern binary file format for optimized document storage with optional phase encryption.
- **PlenumNET Live API Surface (28 endpoints):**
  - **HPTP Femtosecond Timing (5 endpoints):** `/api/salvi/timing/timestamp`, `/api/salvi/timing/self-test`, `/api/salvi/timing/error-budget`, `/api/salvi/timing/metrics`, `/api/salvi/timing/batch/:count`. FINRA 613 / MiFID II compliance-grade.
  - **Phase Encryption (4 endpoints):** `/api/salvi/phase/config/:mode`, `/api/salvi/phase/split`, `/api/salvi/phase/recombine`, `/api/salvi/phase/recommend`. Dual-phase quantum encryption for documents at rest.
  - **Ternary Computing Engine (10 endpoints):** `/api/salvi/ternary/convert`, `add`, `multiply`, `rotate`, `not`, `xor`, `batch`, `density/:tritCount`, `density-benchmark`, `noether-verify`. GF(3) arithmetic.
  - **PQTI Signing Microservice (9 endpoints, Axum/Rust on port 3001):**
    - TL-DSA Signing (5): `/api/pqti/tldsa/keygen`, `/api/pqti/tldsa/sign`, `/api/pqti/tldsa/verify`, `/api/pqti/tldsa/export`, `/api/pqti/tldsa/public-key/:keyId`. Three security levels: TL-DSA-44/65/87 (FIPS 204 ML-DSA equivalent). EUF-CMA secure, constant-time hardened, 13 formally verified properties, CAVP-ready.
    - TL-KEM Key Encapsulation (3): `/api/pqti/tlkem/keygen`, `/api/pqti/tlkem/encapsulate`, `/api/pqti/tlkem/decapsulate`. Three levels: TL-KEM-512/768/1024 (FIPS 203 ML-KEM equivalent). Post-quantum key exchange for encrypted document sharing.
    - Health (1): `/api/pqti/health`.
- **Tribonacci Indexing:** SQL stored functions in `plenumnet` schema (trad_hash_28, tribonacci_hash, generate_trib_id, next_worker, skip_lookup) plus TypeScript service for WBS shard allocation and distribution analysis.
- **Ternary Compression:** Transparent compression service (`server/services/ternary-compression.ts`) using ternary encoding + RLE + zlib pipeline with backward-compatible markers.
- **.tern File Format:** Binary document format (`server/services/tern-file-format.ts`) with TERN magic bytes, JSON header, compressed data body, and optional phase encryption support. Note: file extension planned to change from `.tern` to `.xTzip` (or similar) in a future update.
- **PQTI-Integrated Document Lifecycle (Roadmap):** Architecture defined for full document lifecycle with PlenumNET integration across four subsystems:
  - **WBS Classification Engine (CE-1 through CE-6):** Full-document OCR pipeline, entity extraction (title blocks, CSI MasterFormat codes, document type signatures), 13-dimensional WBS resolution with multi-signal weighted scoring, deterministic tagging, full-text search index, continuous feedback loop, and universal intake path coverage (field capture, bulk ZIP, email ingestion, legacy migration, API upload, manual upload, ONLYOFFICE output). Pure Maestro repo work.
  - **ONLYOFFICE Document Review Pipeline (OO-1 through OO-6):** Auto-registration with Document Server, WBS-based hierarchical reviewer assignment across 13 levels, collaborative markup via track changes, multi-reviewer approval workflow (approved/comments/revise/rejected), version lock with SHA-3 re-hash + HPTP timestamp + TL-DSA signing via live PQTI microservice. Stages OO-1–OO-5 are pure Maestro; OO-6 calls live PlenumNET endpoints.
  - **Archive Assembly Engine (AR-1 through AR-4):** 13-level WBS tree walk, version-locked primaries + drafts, manifest (JSON + PDF) with full review history and SHA-3 hashes, full-text search index, append-only event log, HPTP seal timestamp, per-document TL-DSA signatures, umbrella TL-DSA-87 manifest signature, CryptoInteropBridge export for external verification, TL-KEM encapsulation for encrypted sharing.
  - **Offline Field Upload Queue (FQ-1 through FQ-4):** IndexedDB client queue, Service Worker background sync with chunked upload/resumption, HPTP timestamp at capture (degraded connectivity) or device clock fallback (zero connectivity) with delta reconciliation, TL-DSA signing of SHA-3 hash at capture, server-side signature verification before classification, priority ordering (safety > general), progress UI.
  - **Unified Event Bus (EB-1 through EB-4):** Append-only event log, publish/subscribe, standardized event schema (document.captured/classified/uploaded/staged/reviewed/approved/version_locked/archived/signed/shared), declarative subscriber registration, dead-letter handling, replay capability, cross-module subscribers (accounting on invoice, RFI on submittal, safety on inspection).
  - **Estimated timeline:** ~20 weeks for all Maestro-side development. All PlenumNET services are live with no blockers. Recommended parallel start: CE-1, EB-1, FQ-1.
- **Stripe Payment Processing:** Full integration for customer management, product/price synchronization, and subscription lifecycle handling.
- **Rate Limiting:** Per-tenant, plan-tier-aware rate limiting across the API.
- **Structured Logging:** Centralized, structured request logging for improved observability.
- **System Status API:** An endpoint to monitor the readiness of integrated services.
- **Sign Here E-Signatures:** Embedded SalviSign app (https://SalviSign.replit.app) via iframe under Documents section (sidebar label: "Sign Here"), providing electronic signature capabilities with fullscreen mode and secure sandbox isolation.
- **BambooHR Integration:** Full Employees page with collapsible sidebar sub-menu (Employee Directory, BambooHR portal, Roles & Permissions, Time Off, HR Documents, Certifications). Backend API proxy routes for BambooHR directory, employee details, and photo retrieval. BambooHR iframe viewer with fullscreen support. Requires `BAMBOOHR_API_KEY` and `BAMBOOHR_COMPANY_DOMAIN` secrets.
- **RFC 3161 TSA Integration:** Court-admissible timestamping via PlenumNET TSA service (`/api/tsa/*`). TSA client at `server/services/plenumnet/tsa-client.ts` hashes documents locally (SHA-256) and sends only hashes to PlenumNET — document content never crosses the HTTP boundary. Event Bus subscribers at `server/subscribers/tsa-subscribers.ts` wire 9 event types to timestamp requests with policy tier mapping: FORENSICS for staged/reviewed/version_locked documents, COMPLY for invoice classification and bulk classification, SENTINEL for safety documents and archive seals, DEFAULT for review escalations and upload sync events. TSA failure never blocks document processing. Tokens stored in document metadata for future offline verification via OpenSSL.

## External Dependencies

- **Stripe:** Payment processing for SaaS subscriptions.
- **Kong Proxy:** Security gateway for document encryption, compression, and timestamping.
- **PostgreSQL:** Primary database.
- **ONLYOFFICE Document Server:** For in-browser editing of Office documents (Word, Excel, PowerPoint). Self-hosted or cloud deployment.
- **Algorand:** Primary distributed ledger for transaction witnessing.
- **Hedera:** Fallback distributed ledger via Consensus Service.
- **Azure AD:** Production SSO provider.
- **BambooHR:** HR management platform for employee directory, time off, and HR data via REST API.
- **PlenumNET (SigmaWolf-8/Ternary):** Post-quantum ternary computing platform at `https://plenumnet.replit.app`. 28 live API endpoints (5 HPTP timing, 4 phase encryption, 10 ternary computing, 9 PQTI signing/encapsulation). Maestro calls PlenumNET over HTTP via Kong gateway (19th service: `plenumnet-signing`). All crypto code owned by the Ternary repo — Maestro never implements, wraps, or redistributes crypto. Repository boundary is non-negotiable per architecture document rev 3.0.