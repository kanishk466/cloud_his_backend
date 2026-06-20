# HIS SaaS Platform Foundation

## Overview

This project is the Platform Foundation for a multi-tenant Healthcare Information System (HIS).

The platform allows a Super Admin to onboard hospitals into the SaaS ecosystem.

Current onboarding flow:

```text
Super Admin Login
        ↓
Create Hospital
        ↓
Assign Package
        ↓
Activate Hospital
```

Future phases will introduce:

```text
Generate Hospital Admin
        ↓
Send Credentials
        ↓
Hospital User Management
        ↓
Tenant Isolation
        ↓
Hospital HIS Modules
```

---

# Tech Stack

## Backend

* NestJS
* Prisma ORM
* PostgreSQL
* JWT Authentication
* Passport JWT
* bcrypt

## Architecture

* Modular Monolith
* Domain Driven Module Separation
* Repository Pattern
* Service Layer Business Rules

---

# Project Structure

```text
src
│
├── shared
│
├── system
│
├── platform
│
│   ├── identity
│   │
│   ├── catalog
│   │
│   ├── package
│   │
│   ├── tenant
│   │
│   └── rbac
│
├── app.module.ts
└── main.ts
```

---

# Modules

## Shared Module

Contains common infrastructure.

Responsibilities:

* Prisma Service
* Shared DTOs
* Decorators
* Guards
* Exceptions
* Constants

---

## Identity Module

Responsible for authentication.

Features:

* Login
* JWT Access Token
* Refresh Token
* Logout

Endpoints:

```http
POST /auth/login

POST /auth/refresh

POST /auth/logout
```

---

## Catalog Module

Catalog defines what functionality exists in the HIS.

### Module

Represents a page/menu.

Examples:

```text
Dashboard
Patients
Appointments
Care Management
Care Plan
Goals
Interventions
```

### Feature

Represents functionality inside a module.

Examples:

```text
Notes
Devices
Attachments
Reminders
```

Relationship:

```text
Module
    |
    +---- ModuleFeature
                  |
                  Feature
```

Endpoints:

```http
POST /catalog/modules

GET /catalog/modules

POST /catalog/features

POST /catalog/modules/:moduleId/features/:featureId
```

---

## Package Module

Package defines what functionality a hospital receives.

Examples:

```text
Starter Package

Premium Package

Enterprise Package
```

Relationship:

```text
Package
     |
     +---- PackageModule
                    |
                    Module
```

Endpoints:

```http
POST /packages

GET /packages

GET /packages/:id

POST /packages/:packageId/modules/:moduleId
```

---

## Tenant Module

Represents hospitals onboarded into the SaaS.

### Hospital Lifecycle

```text
DRAFT
   ↓
ACTIVE
   ↓
SUSPENDED
```

### Package Assignment

A hospital subscribes to a package.

Relationship:

```text
Hospital
      |
      +---- AssignedPackage
                     |
                     Package
```

Endpoints:

```http
POST /hospitals

GET /hospitals

GET /hospitals/:id

POST /hospitals/:id/packages

POST /hospitals/:id/activate
```

---

# Database Design

## Identity

```text
PlatformUser

RefreshToken

Role

Permission

UserRole

RolePermission
```

---

## Catalog

```text
Module

Feature

ModuleFeature
```

---

## Package

```text
Package

PackageModule
```

---

## Tenant

```text
Hospital

AssignedPackage
```

---

# Current Business Flow

## Create Catalog

```text
Create Module
       ↓
Create Feature
       ↓
Attach Feature To Module
```

---

## Create Package

```text
Create Package
       ↓
Attach Modules
```

---

## Onboard Hospital

```text
Create Hospital
       ↓
Assign Package
       ↓
Activate Hospital
```

---

# Authentication

All Platform APIs are protected using JWT.

Example:

```http
Authorization: Bearer <access_token>
```

Currently the platform supports a single platform user:

```text
SUPER_ADMIN
```

RBAC implementation is intentionally postponed because only one platform role exists.

---

# Future Roadmap

## Sprint 2

Hospital Admin Provisioning

```text
Activate Hospital
       ↓
Create Hospital Admin
       ↓
Generate Password
       ↓
Send Credentials
```

---

## Sprint 3

Tenant Isolation

```text
Hospital Login

Hospital Users

Hospital Roles

Hospital Permissions
```

---

## Sprint 4

HIS Business Modules

```text
Patient Management

OPD

IPD

Appointments

Billing

Laboratory

Pharmacy

Radiology

EMR
```

---

# Development Guidelines

## Controller

Responsibilities:

* Receive Request
* Validate DTO
* Call Service

No business logic.

---

## Service

Responsibilities:

* Business Rules
* Validation
* Use Case Execution

---

## Repository

Responsibilities:

* Database Access
* Prisma Queries

No business logic.

---

## Flow

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
