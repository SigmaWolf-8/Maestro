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
- **Legacy Form Recreations:** Includes recreation of MS Access VBA forms for Vendors & Pricing and Customers, featuring auto-save on field blur, detailed data entry, and condensed layouts.
- **Contacts Directory:** Unified searchable/filterable table of all customers, vendor contacts, and employees with category filtering, sorting, and pagination.
- **File Manager:** Sophisticated document management system with drag-and-drop uploads, 13-dimensional WBS filtering/meta-tagging, and a large document viewer.
- **User Group Security:** Provides granular, form-level access control with user group management and a permissions matrix (View, Create, Edit, Delete).

### UI/UX and Design System
The application features a professional aesthetic with a default teal construction theme, full dark mode support, and customizable branding per tenant. UI patterns include cards with hover effects, semantic status badges, responsive grid layouts, and modal dialogs. Navigation follows a 5-section architecture (Dashboard, Projects, People & Contacts, Finance, Documents) with database-driven, tenant-specific configuration.

## External Dependencies

- **Kong Proxy:** Used as a security gateway for document encryption, compression, and timestamping.
- **PostgreSQL:** Primary database for persistent storage.
- **Microsoft 365 (Azure AD & OneDrive):** Integrated for self-service SSO and "Edit in Office" functionality for documents (Word, Excel, PowerPoint) via OAuth2, enabling editing directly in Office Online.