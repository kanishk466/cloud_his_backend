# ARCHITECTURE.md

# HIS SaaS Platform Architecture

## Purpose

This document describes the architecture, module boundaries, data ownership, and onboarding flow of the HIS SaaS Platform.

The platform is responsible for onboarding hospitals and provisioning access to healthcare modules through configurable packages.

---

# High Level Architecture

```text
┌─────────────────────┐
│     Super Admin     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│      Identity       │
│ Authentication      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│      Catalog        │
│ Modules/Features    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│      Package        │
│ Product Offering    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│       Tenant        │
│ Hospital Onboarding │
└─────────────────────┘
```

---

# Architectural Style

## Modular Monolith

Current architecture is a Modular Monolith.

Reasons:

* Faster development
* Easier deployment
* Simpler debugging
* Lower operational cost
* Easier onboarding for new developers

Each domain is isolated inside its own NestJS module.

---

# Module Boundaries

## Identity Module

Owns:

```text
PlatformUser
RefreshToken
Authentication
JWT
```

Does NOT own:

```text
Hospital
Package
Catalog
```

Responsibilities:

```text
Login

Refresh Token

Logout

Current User
```

---

## Catalog Module

Owns:

```text
Module
Feature
ModuleFeature
```

Purpose:

Defines what functionality exists in the system.

Examples:

```text
Dashboard

Patients

Appointments

Care Management

Care Plan

Goals
```

Examples of Features:

```text
Notes

Devices

Attachments

Export
```

---

## Package Module

Owns:

```text
Package
PackageModule
```

Purpose:

Defines what functionality is sold to hospitals.

Example:

```text
Starter Package

Premium Package

Enterprise Package
```

A package contains multiple modules.

---

## Tenant Module

Owns:

```text
Hospital
AssignedPackage
```

Purpose:

Represents customer organizations using the platform.

Example:

```text
ABC Hospital

XYZ Hospital

City Care Hospital
```

---

# Request Flow

```text
Controller
     ↓
Service
     ↓
Repository
     ↓
Prisma
     ↓
PostgreSQL
```

---

## Controller Layer

Responsibilities:

```text
Receive Request

Validate DTO

Call Service

Return Response
```

Must NOT contain:

```text
Business Logic

Database Queries
```

---

## Service Layer

Responsibilities:

```text
Business Rules

Validation

Use Cases

Orchestration
```

Examples:

```text
Hospital code unique

Package active

Feature not attached twice
```

---

## Repository Layer

Responsibilities:

```text
Database Access

Prisma Queries
```

Must NOT contain:

```text
Business Rules
```

---

# Database Architecture

## Identity Domain

```text
PlatformUser
     │
     ├── UserRole
     │
     └── RefreshToken

Role
     │
     └── RolePermission

Permission
```

---

## Catalog Domain

```text
Module
     │
     └── ModuleFeature
              │
              ▼
           Feature
```

---

## Package Domain

```text
Package
     │
     └── PackageModule
              │
              ▼
            Module
```

---

## Tenant Domain

```text
Hospital
     │
     └── AssignedPackage
              │
              ▼
            Package
```

---

# Catalog Hierarchy

Modules support unlimited nesting.

Example:

```text
Care Management
│
├── Care Plan
│
├── Goals
│
└── Interventions
```

Implementation:

```text
Module.parentId
```

No separate SubModule table exists.

---

# Hospital Onboarding Flow

## Step 1

Create Hospital

```text
DRAFT
```

---

## Step 2

Assign Package

```text
Hospital
     ↓
Package
```

---

## Step 3

Activate Hospital

```text
DRAFT
     ↓
ACTIVE
```

---

## Future Step

Generate Hospital Admin

```text
Hospital
     ↓
Hospital Admin User
     ↓
Temporary Password
```

---

# Authentication Flow

```text
POST /auth/login
        │
        ▼
Validate Credentials
        │
        ▼
Generate JWT
        │
        ▼
Return Access Token
```

---

## Refresh Flow

```text
Access Token Expired
        │
        ▼
POST /auth/refresh
        │
        ▼
New Access Token
```

---

# Package Assignment Rules

Rules:

```text
Hospital must exist

Package must exist

Package must be active

Only one active package per hospital
```

---

# Activation Rules

Rules:

```text
Hospital must exist

Hospital must have an active package

Status:
DRAFT → ACTIVE
```

---

# Current System Scope

Included:

```text
Identity

Catalog

Package

Tenant
```

Not Included Yet:

```text
Hospital Login

Hospital Users

RBAC

Patient Management

Appointments

Billing

Laboratory

Pharmacy

EMR
```

---

# Future Multi-Tenant Architecture

Current:

```text
Platform Database
```

Future:

```text
Platform
     │
     ├── Identity
     ├── Catalog
     ├── Package
     └── Tenant
            │
            ▼
       Hospital
            │
            ▼
      HIS Application
```

Hospital users will never access platform APIs directly.

Platform manages hospitals.

Hospitals manage healthcare operations.

---

# Development Principles

## Keep Modules Independent

Example:

```text
Catalog must not know Hospital

Hospital must not know Feature
```

Dependencies should flow only through business relationships.

---

## Prefer Composition

Use:

```text
Package
     ↓
Modules
```

Instead of duplicating module configuration inside hospitals.

---

## Avoid Premature Complexity

Not implemented yet:

```text
Microservices

Kafka

Redis

Event Bus

CQRS

Saga
```

Current scale does not justify these patterns.

---

# Current SaaS Flow

```text
Super Admin Login
        ↓
Create Module
        ↓
Create Feature
        ↓
Create Package
        ↓
Attach Modules
        ↓
Create Hospital
        ↓
Assign Package
        ↓
Activate Hospital
```

This completes Platform Foundation Version 1.
