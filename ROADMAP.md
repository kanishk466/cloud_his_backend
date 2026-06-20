# ROADMAP.md

# HIS SaaS Product Roadmap

## Vision

Build a multi-tenant Healthcare Information System (HIS) SaaS platform where hospitals can subscribe to packages and access healthcare modules through a single platform.

Target Flow:

```text id="zv18hz"
Platform
     ↓
Hospital Onboarding
     ↓
Hospital Administration
     ↓
Healthcare Operations
     ↓
Billing & Revenue
     ↓
Analytics & Reporting
```

---

# Current Status

## Phase 1 - Platform Foundation

Status: ✅ Completed

Modules:

```text id="2hm5x0"
Identity

Catalog

Package

Tenant
```

Capabilities:

```text id="4ug0eb"
Super Admin Login

Module Management

Feature Management

Package Management

Hospital Creation

Package Assignment

Hospital Activation
```

Flow:

```text id="3okutg"
Login
   ↓
Create Module
   ↓
Create Package
   ↓
Create Hospital
   ↓
Assign Package
   ↓
Activate Hospital
```

---

# Phase 2 - Hospital Provisioning

Status: Next Sprint

Goal:

Create hospital administration automatically after activation.

---

## Features

### Hospital Admin Generation

```text id="hz97pn"
Activate Hospital
        ↓
Generate Hospital Admin
```

Tables:

```text id="vg6y70"
hospital_users
```

---

### Temporary Password Generation

```text id="4hv03x"
Hospital Admin
      ↓
Temporary Password
```

---

### Credential Delivery

```text id="jgl4kp"
Email Credentials

Password Reset Link
```

---

### Hospital Login

Endpoints:

```http id="tjlwmr"
POST /hospital/auth/login

POST /hospital/auth/refresh

POST /hospital/auth/logout
```

---

# Phase 3 - Tenant Identity & RBAC

Goal:

Support multiple hospital users.

---

## User Management

Tables:

```text id="0l0xqk"
hospital_users

hospital_roles

hospital_permissions

hospital_user_roles

hospital_role_permissions
```

---

## Roles

Examples:

```text id="8a1g4y"
Hospital Admin

Doctor

Nurse

Receptionist

Billing Executive

Lab Technician

Pharmacist
```

---

## Permissions

Examples:

```text id="d9pjlwm"
patient:create

appointment:create

billing:create

lab:view
```

---

## Features

```text id="nvklhv"
Create User

Assign Role

Manage Permissions

Deactivate User
```

---

# Phase 4 - Master Data Management

Goal:

Configure hospital operational masters.

---

## Department Management

Examples:

```text id="a6nuwr"
Cardiology

Orthopedics

Neurology

Radiology
```

---

## Doctor Management

```text id="6v92ii"
Doctor Profile

Specialization

Availability
```

---

## Services

Examples:

```text id="bjw7ku"
Consultation

X-Ray

Blood Test

MRI
```

---

## Rooms & Beds

```text id="w78dzh"
Ward

Room

Bed
```

---

# Phase 5 - Patient Management

Goal:

Centralized patient registration.

---

## Features

```text id="jlwmwi"
Patient Registration

Patient Search

Patient Profile

Patient Documents

Emergency Contact
```

---

## Core Tables

```text id="8zvmy4"
patients

patient_addresses

patient_documents
```

---

# Phase 6 - Appointment Management

Goal:

Manage OPD appointments.

---

## Features

```text id="qsh56j"
Book Appointment

Reschedule

Cancel

Check-In

Queue Management
```

---

## Appointment Lifecycle

```text id="f1f0om"
SCHEDULED
      ↓
CHECKED_IN
      ↓
IN_CONSULTATION
      ↓
COMPLETED
```

---

# Phase 7 - EMR

Goal:

Electronic Medical Records.

---

## Features

```text id="dyv6j5"
Vitals

Diagnoses

Clinical Notes

Allergies

Medications
```

---

## Tables

```text id="evjhj8"
encounters

diagnoses

clinical_notes

allergies
```

---

# Phase 8 - Care Management

Goal:

Chronic care management and care plans.

---

## Features

```text id="vqjlwm"
Care Plans

Goals

Interventions

Devices

Notes
```

---

## Relationships

```text id="dctb4x"
Care Plan
      ↓
Goal
      ↓
Intervention
```

---

# Phase 9 - Telemedicine

Goal:

Virtual consultations.

---

## Features

```text id="3duy0j"
Video Consultation

Waiting Room

Recording

Chat

File Sharing
```

---

## Integrations

```text id="3oc7n4"
Twilio Video

Twilio Recording

Twilio Webhooks
```

---

# Phase 10 - Laboratory

Goal:

Laboratory workflow.

---

## Features

```text id="oj0hvl"
Test Orders

Sample Collection

Result Entry

Report Generation
```

---

# Phase 11 - Pharmacy

Goal:

Medication dispensing.

---

## Features

```text id="k83kmc"
Inventory

Purchase

Dispensing

Stock Tracking
```

---

# Phase 12 - Billing

Goal:

Revenue cycle management.

---

## Features

```text id="y48r5z"
Invoices

Payments

Refunds

Discounts

Insurance Billing
```

---

## Revenue Flow

```text id="9cphdf"
Appointment
      ↓
Service
      ↓
Invoice
      ↓
Payment
```

---

# Phase 13 - IPD

Goal:

Inpatient management.

---

## Features

```text id="v8b7ap"
Admission

Bed Allocation

Transfers

Discharge
```

---

## Lifecycle

```text id="w2rjlwm"
ADMITTED
      ↓
IN_TREATMENT
      ↓
DISCHARGED
```

---

# Phase 14 - Reporting & Analytics

Goal:

Operational visibility.

---

## Dashboards

```text id="cljlwm"
Appointments

Revenue

Patients

Doctors

Care Plans
```

---

## Reports

```text id="vn5g73"
Daily Collection

Doctor Productivity

Patient Statistics

Occupancy Reports
```

---

# Phase 15 - Platform Enhancements

Goal:

Strengthen SaaS capabilities.

---

## Subscription Management

```text id="fz95oz"
Package Renewal

Package Upgrade

Package Downgrade
```

---

## Usage Tracking

```text id="7eu6z5"
Patient Count

User Count

Storage Usage
```

---

## Billing Plans

```text id="x9mjlwm"
Monthly

Quarterly

Yearly
```

---

# Technical Roadmap

## Short Term

```text id="x0qpg8"
Swagger

Global Exception Handling

Audit Logs

Soft Deletes

Pagination
```

---

## Medium Term

```text id="1kbjlwm"
Email Service

File Storage

Background Jobs

Notification Service
```

---

## Long Term

```text id="2jjg1s"
Redis

Event Bus

Read Models

Microservice Extraction
```

Only introduce these when scale requires them.

---

# Guiding Principle

Build only what the current business needs.

Avoid:

```text id="gww1db"
Premature Microservices

Premature CQRS

Premature Event Sourcing

Premature Distributed Systems
```

Current architecture should remain:

```text id="hfjlwm"
NestJS

Prisma

PostgreSQL

Modular Monolith
```

until there is a proven scaling requirement.

---

# Target End State

```text id="axo3rx"
Platform
      ↓
Hospitals
      ↓
Hospital Users
      ↓
Patients
      ↓
Appointments
      ↓
EMR
      ↓
Billing
      ↓
Analytics
```

A complete multi-tenant Healthcare Information System SaaS.
