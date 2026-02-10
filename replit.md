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
- **Advanced File Management:** Document management with WBS filtering/meta-tagging, viewer, and inline Office Online editing via WOPI.
- **Security:** Role-based access control, user group security, and Kong gateway integration for API security.
- **AI Analytics & Intelligence:** AI Report Service for pattern-based intent detection and report generation, and a Smart Inbox for project-relevant emails with AI-assisted WBS tagging.
- **WOPI Host & Office Online Integration:** Full WOPI protocol implementation for seamless document editing.
- **PlenumNET Security Integration:** Local integration of the libternary engine for advanced security features.
- **Stripe Payment Processing:** Full integration for customer management, product/price synchronization, and subscription lifecycle handling.
- **Rate Limiting:** Per-tenant, plan-tier-aware rate limiting across the API.
- **Structured Logging:** Centralized, structured request logging for improved observability.
- **System Status API:** An endpoint to monitor the readiness of integrated services.

## External Dependencies

- **Stripe:** Payment processing for SaaS subscriptions.
- **Kong Proxy:** Security gateway for document encryption, compression, and timestamping.
- **PostgreSQL:** Primary database.
- **Microsoft 365 (Azure AD & OneDrive):** For self-service SSO and "Edit in Office" functionality via OAuth2.
- **Algorand:** Primary distributed ledger for transaction witnessing.
- **Hedera:** Fallback distributed ledger via Consensus Service.
- **Azure AD:** Production SSO provider.
- **PlenumNET/SFK:** A post-quantum security framework.