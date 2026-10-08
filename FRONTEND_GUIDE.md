# HIMS Frontend Developer Guide — Application Flow, Workflows & Phase Map

> **Read this first.** This is the single document that explains how the Hospital Information Management System (HIMS) fits together: the architecture, the patient journey, every phase built so far, the exact API call sequences for each workflow, and the rules your UI must mirror.
> **Backend:** NestJS 11 + Prisma + PostgreSQL (multi-tenant) · **API prefix:** `/api` · **Swagger:** `/api/docs`

---

## Table of Contents

1. [System at a Glance](#1-system-at-a-glance)
2. [The Golden Path — OPD Patient Journey](#2-the-golden-path--opd-patient-journey)
3. [Phase Map — What's Built & What It Gives You](#3-phase-map--whats-built--what-it-gives-you)
4. [Frontend Build Order (screen dependencies)](#4-frontend-build-order-screen-dependencies)
5. [Key Workflows (exact API sequences)](#5-key-workflows-exact-api-sequences)
6. [API Conventions You Must Follow](#6-api-conventions-you-must-follow)
7. [Screen Inventory by Area](#7-screen-inventory-by-area)
8. [Server Rules Your UI Must Mirror](#8-server-rules-your-ui-must-mirror)

---

## 1. System at a Glance

### 1.1 What this is

A **multi-tenant SaaS HIMS** for Indian hospitals. One backend serves many hospitals; every hospital is a **tenant** identified by `tenantId`. There are two completely separate user planes:

| Plane | Who logs in | What they do | Auth endpoint |
|---|---|---|---|
| **Platform** (`PlatformUser`) | SaaS owners / super-admins | Onboard hospitals, assign subscription packages, manage module catalog, platform dashboard | `/api/platform/...` |
| **Hospital** (`HospitalUser`) | Hospital staff (reception, doctors, nurses, lab techs, billing, admins) | Run the hospital day-to-day | `/api/hospital/auth/login` |

As a hospital-facing frontend dev, you almost exclusively live in the **Hospital plane**.

### 1.2 The golden rules (read twice)

1. **Tenant is server-derived.** Every hospital API reads `tenantId` from the JWT (`@CurrentTenant()`). **You never send `tenantId`.** Cross-tenant data simply returns `404`.
2. **Bearer token everywhere.** `Authorization: Bearer <accessToken>` on every `/api/hospital/**` call.
3. **Strict validation.** Unknown body fields → `400` (`forbidNonWhitelisted`). Send only documented fields.
4. **Masters before operations.** Every operational screen depends on master data (services, doctors, rooms, packages). Build master screens first — see §4.
5. **Server enforces, UI guides.** Gender/age/rate/discount/state-machine rules are enforced server-side. Your job: pre-validate for UX, and surface the server's structured errors (§6.4, §8).

### 1.3 Actors inside a hospital

| Role (HospitalRole) | Typical userType | Screens |
|---|---|---|
| Hospital Admin | `SUPER_ADMIN` | Everything + user/role masters |
| Receptionist | `REGULAR_USER` | Patients, appointments, queue, billing counter |
| Doctor | `DOCTOR` | Consultations, prescriptions, investigations |
| Nurse | `REGULAR_USER` | Vitals, bed board, IPD ward |
| Lab Technician | `REGULAR_USER` | Lab masters, sample worklist, result entry (upcoming) |
| Accountant | `REGULAR_USER` | Billing, payments, commissions, share reports |
| Pharmacist | `REGULAR_USER` | (future pharmacy) |

Permissions are **module+feature based**: check them via `GET /api/hospital/roles/entitlements/modules` (own user) or `GET /api/hospital/users/:id/effective-permissions` (any user, admin view) — see Phase 1.3.

---

## 2. The Golden Path — OPD Patient Journey

This is the heartbeat of the system. 90% of daily hospital traffic flows like this:

```
① Register Patient ──▶ ② Book Appointment ──▶ ③ Queue/Token ──▶ ④ Vitals ──▶ ⑤ Consultation
      │                      │                                                   │
      │                      ▼                                                   ▼
      │              fee auto-calculated                              ⑥ Orders (lab/radio/rx)
      │              (panel? follow-up?)                                      │
      ▼                                                                      ▼
 panel/referral linked                                            ⑦ OPD Bill (enforced lines)
                                                                          │
                                                                          ▼
                                                              ⑧ Payment → Receipt → ⑨ Invoice print (grouped)
```

**What the server does automatically (your UI just shows it):**
- ② Fee comes from the **visit-fee engine** (panel config → general config → doctor fee; follow-up window → ₹0) — Phase 2.2B.
- ⑦ Consultation line auto-added; gender/age/rate/discount rules enforced per service — Phase 2.1B.
- ⑧ Referral commission auto-created if the patient was referred — Phase 2.2B.
- ⑨ Items grouped by Category → Sub-Category in print order — Phase 2.1B.

The IPD path branches off after ⑥/⑦: admission → bed → charges → discharge (see §5.6).

---

## 3. Phase Map — What's Built & What It Gives You

Legend: ✅ shipped & tested · 🔌 exported for consumption by later phases

| Phase | Area | What it gives the frontend | Status |
|---|---|---|---|
| **Foundation** | Identity, Users, Patients, Appointments, Queue, Consultations, OPD Billing | Login/JWT/sessions, user+role CRUD, patient registration, appointment booking, token queue, consultation notes, bill/payment/receipt | ✅ pre-existing |
| **1.1** Basic Masters | Geo (country/state/city), Banks, Patient Document Types | Address dropdowns, bank pickers, KYC doc types | ✅ |
| **1.2** Discount Masters | Discount reasons + per-role approval authority (%) | Discount dropdown + "needs approval" limits | ✅ |
| **1.3** User & Role Polish | Audit fields, session revocation on deactivate, bulk role/dept sync, **effective-permissions** endpoint, soft delete | Users grid, role matrix, permission-driven menus | ✅ |
| **2.1** Services Setup | Category → SubCategory → Service Items; `OpdBillItem.serviceId` link | Service master screens, billing service picker | ✅ |
| **2.1B** Billing Automation | **Bill-line enforcement** (gender/age/rate/discount), **grouped invoice** endpoint, **bulk CSV/XLSX import**, Day-1 service-tree seed, store linkage | Service import tool, enforced bill form, print-ready invoice | ✅ |
| **2.2** Doctor Setup | Clinical departments, specializations, visit configs (follow-up rules), refer doctors + PRO | Doctor master, referral directory, follow-up rules screen | ✅ |
| **2.2B** Doctor Automation | **Visit-fee engine**, referral commission ledger + settlement API, **digital signature upload**, **doctor share report** | Auto fee display, PRO dashboard, signature widget, settlement screens | ✅ |
| **2.3** Ward/Room/Bed | RoomType → Room → Bed, **bed state machine**, BOR dashboard, amenities, housekeeping queue | Bed setup wizard, nursing bed grid, BOR KPI tile | ✅ |
| **1.4** Threshold Limits | Panel credit ceilings (SOFT/HARD breach) | Threshold setup, charge-entry banners | ✅ |
| **IPD Admission** | Admit → assign/transfer bed → discharge workflow (drives bed machine) | Admission form, ward census, discharge counter | ✅ |
| **2.4** Lab/Radio (LIS/RIS) | S1: Lab dept → Investigation ⇄ ServiceMaster → Observation → ReferenceRange. S2: report templates, interpretation engine, helps, comments. S3: vacutainers, specimen stability, **collection worklist**. S4: organisms/AST panels, outsource labs, NABL sign-off matrix | Lab master suite, interpretation flags, tube-dedup worklist, C&S panels, sign-off guard | ✅ |
| **3.1** Panel Enhancements | **Rate schedules** (effective-date pricing) + resolver, claim document checklist + template upload, `OpdBill.panelId` auto-link | Rate revision screens, claim checklist, panel bills | ✅ |
| **3.2** Packages | Package master + **auto-SKU**, components/consults/exclusions, **consumption engine** (quota) | Package catalogue/builder, coverage check, usage card | ✅ |

**Detailed per-phase docs** (API reference + examples) live in the repo root: `PHASE_1_1_BASIC_MASTERS.md`, `PHASE_1_2_DISCOUNT_MASTERS.md`, `PHASE_1_3_USER_ROLE_POLISH.md`, `PHASE_2_1_SERVICES_SETUP.md`, `PHASE_2_1B_SERVICES_INTEGRATION.md`, `PHASE_2_2_DOCTOR_SETUP.md`, `PHASE_2_2B_DOCTOR_INTEGRATION.md`, `PHASE_2_3_WARD_ROOM_BED.md`, `PHASE_1_4_THRESHOLD_LIMIT.md`, `IPD_ADMISSION_MODULE.md`, `PHASE_2_4_S1..S4_*.md`, `PHASE_3_1_PANEL_ENHANCEMENTS.md`, `PHASE_3_2_PACKAGES.md`.

---

## 4. Frontend Build Order (screen dependencies)

Build in this order — each tier unblocks the next:

```
TIER 0 — Shell
  Login · change-password · permission-driven menu (effective-permissions)

TIER 1 — Core Masters (week 1)
  Departments · Shifts · Clinical Departments · Specializations
  Service Categories → SubCategories → Service Items (+ bulk import)
  Users & Roles (role permission matrix)

TIER 2 — Clinical Setup (week 2)
  Doctors (profile + visit config + signature) · Refer Doctors/PRO
  Lab Departments · Investigations (⇄ services) · Observations · Reference Ranges
  Room Types · Rooms · Beds (bulk generator) · Amenities

TIER 3 — Daily Operations (week 3)
  Patient Registration · Appointment Booking (fee banner) · Queue/Token board
  Consultation screen · OPD Billing counter (enforced) · Payments · Invoice print

TIER 4 — Advanced Ops (week 4)
  IPD: admission form · ward census · bed grid · transfer · discharge counter
  Lab ops: collection worklist (tube strips) · (result entry when shipped)
  Panels: rate schedules · claim checklists · threshold banners
  Packages: catalogue · builder · coverage check · usage card

TIER 5 — Finance & Reports
  Referral commissions (PRO/settlement) · Doctor share report · BOR dashboard · Daily summary
```

**Why this order works:** every Tier-N screen only calls APIs that already exist in Tiers 0..N-1. No dead-ends.

---

## 5. Key Workflows (exact API sequences)

### 5.1 Login & session

```http
POST /api/hospital/auth/login
{ "code": "HOSP001", "username": "admin@hospital.com", "password": "•••" }
→ { accessToken, refreshToken, user: { userId, tenantId, userType, roles, permissions } }
```
- Store `accessToken` (short-lived) + `refreshToken`.
- `POST /api/hospital/auth/refresh` rotates tokens. `POST /api/hospital/auth/logout` kills the session.
- **First login** → `forcePasswordChange: true` → force `POST /api/hospital/auth/change-password`.
- Admin deactivating a user kills all their sessions server-side (Phase 1.3) — expect `401` → redirect to login.

### 5.2 Day-1 master setup (automatic seeds)

When platform activates a hospital, these seed **automatically** (idempotent):
- 8 service categories + 27 sub-categories (`DIAG`, `CONS`, `PROC`, `ROOM`, `PHA`…)
- 11 room types + 9 bed amenities

Run manually per tenant when needed:
```bash
npx ts-node prisma/seed-service-tree.ts <tenantId>
npx ts-node prisma/seed-ward-room.ts <tenantId>
npx ts-node prisma/seed-lab-radio.ts <tenantId>   # S1–S4: depts, templates, containers, micro
npx ts-node prisma/seed-packages.ts <tenantId>    # sample packages
```

### 5.3 Patient registration → appointment (fee auto-calc)

```http
POST /api/opd/patients
{ "firstName": "Ramesh", "gender": "MALE", "mobile": "9876500011",
  "panelId": "uuid (optional)", "referDoctorId": "uuid (optional)" }
→ { id, uhid: "UHID-2026-000123" }

POST /api/opd/appointments
{ "patientId": "…", "doctorProfileId": "…", "appointmentDate": "2026-10-09",
  "appointmentType": "WALK_IN", "visitType": "NEW_VISIT" }
→ { appointmentNo, consultationFee: 0, isFollowUpVisit: true, referDoctorId: "…" }
```
UI: show green banner **"Follow-up — fee ₹0"** when `isFollowUpVisit` (engine: last non-follow-up visit within `followUpDays`, quota `followUpMaxVisits`). Panel patients price from panel visit-config.

### 5.4 Consultation → orders → enforced billing → invoice

```http
POST /api/opd/queue/check-in        → token/queue entry (existing flow)
POST /api/opd/vitals                → nurse vitals
POST /api/opd/consultations         → doctor notes + diagnosis
POST /api/opd/consultations/:id/investigations → lab/radio orders (serviceId-linked)

POST /api/opd/billing
{ "patientId": "…", "appointmentId": "…",
  "items": [{ "serviceId": "uuid-LAB-CBC", "description": "CBC", "category": "Lab",
              "quantity": 1, "unitPrice": 250 }] }
→ bill with AUTO-ADDED consultation line (from appointment fee)

POST /api/opd/billing/:id/payments  { "amount": 1250, "paymentMode": "UPI" }
GET  /api/opd/billing/:id/invoice   → grouped, print-ready
```
**Enforcement you must render (400 with `code`):**
`SERVICE_GENDER_MISMATCH` · `SERVICE_AGE_MISMATCH` · `RATE_NOT_EDITABLE` (lock the price input when `rateEditable=false` on the service) · `SERVICE_NOT_DISCOUNTABLE` (disable discount input) · `SERVICE_NOT_FOUND`.

Invoice groups items by Category → SubCategory (`printOrder`, `displayName`) — **do not re-sort**; render as received.

### 5.5 Referral chain (PRO → commission)

```http
POST /api/hospital/masters/refer-doctors          → create external doctor (+ proUserId)
POST /api/opd/patients        { referDoctorId }   → link at registration
POST /api/opd/appointments                          → auto-inherits
POST /api/opd/billing                               → commission auto-created (PENDING)
GET  /api/hospital/masters/refer-doctors/commissions/summary   → per-doctor + per-PRO totals
POST /api/hospital/masters/refer-doctors/commissions/bulk-settle { status: "PAID" }
```

### 5.6 IPD admission → bed → discharge

```http
POST /api/ipd/admissions
{ "patientId": "…", "doctorProfileId": "…", "bedId": "uuid (optional)",
  "admissionType": "PLANNED", "panelId": "…" }
→ { admissionNo: "IPD-2026-00001", status: "ADMITTED" }   (bed → OCCUPIED if assigned)

POST /api/ipd/admissions/:id/transfer-bed        { newBedId, reason }
POST /api/ipd/admissions/:id/initiate-discharge  { dischargeType: "NORMAL", dischargeSummary }
POST /api/ipd/admissions/:id/complete-discharge  → bed → HOUSEKEEPING → housekeeping-queue
GET  /api/hospital/masters/ward-room/bor-dashboard   → BOR tile
GET  /api/hospital/masters/rooms/:id/occupancy       → bed grid per room
```
**Mirrors:** bed picker shows only `AVAILABLE`/`RESERVED` (occupancy endpoint); gender-ward mismatches return 400 — pre-filter by patient gender; cancel button only when no bed assigned.

### 5.7 Lab collection worklist (phlebotomy)

```ts
// from the investigationIds on the order/bill:
const wl = await sampleTypesService.getCollectionWorklistRequirements(tenantId, ids);
// Render tube strips: one chip per requiredTubes[], chip bg = hexColorCode
// EDTA_PURPLE ×1 (CBC) · SST_YELLOW ×1 (Lipid) · FLUORIDE_GREY ×1 (BSF)
// fasting banner when fastingRequired
```

### 5.8 Panel-aware pricing (rate schedules)

```http
POST /api/hospital/masters/rate-schedules
{ "panelId": "…", "tariffId": "2026-list", "scheduleName": "CGHS 2026", "effectiveFrom": "2026-01-01" }

GET /api/hospital/masters/rate-schedules/resolve?panelId=…&targetDate=2024-06-15&context=OPD
→ { tariffId, scheduleName: "CGHS Rates 2024-2025", resolvedFrom: "DATE_MATCH" }
```
Overlapping ranges → 400 with the conflicting range — show inline.

### 5.9 Packages (sell → evaluate → consume)

```http
GET  /api/hospital/masters/packages?isActive=true
→ sell serviceSku.id as the bill line (it's a real ServiceMaster)

GET /api/hospital/masters/package-consumption/evaluate?patientId=…&packageId=…&serviceId=…
→ { isCovered: true, remainingQuota: 1, chargeAmount: 0 }
→ or { isCovered: false, chargeAmount: 250, reason: "PACKAGE_QUOTA_EXHAUSTED" }

POST /api/hospital/masters/package-consumption
{ packageId, patientId, serviceId, isExtraBilled: !covered, billId }
```

---

## 6. API Conventions You Must Follow

### 6.1 Headers & auth
```ts
api.interceptors.request.use((cfg) => {
  cfg.headers.Authorization = `Bearer ${authStore.accessToken}`;
  return cfg;
});
```

### 6.2 Response shapes
| Type | Shape |
|---|---|
| Entities | Plain Prisma JSON (`Decimal` fields arrive as **strings**: `"250.00"` → `Number(...)`) |
| Action results | `{ message, ...payload }` |
| Lists with pagination | `{ data: [...], meta: { total, page, limit, totalPages } }` |
| Upserts | `{ action: 'created' \| 'updated', config/pkg/... }` |

### 6.3 UUIDs & ids
- `id` fields are UUID **strings**; masters' numeric codes (roles, departments) are ints where documented.
- Parse params use `ParseUUIDPipe` — a malformed id returns `400`, a valid-but-foreign id returns `404`.

### 6.4 Error contract (render these!)
```json
// Nest default
{ "statusCode": 400, "message": "…", "error": "Bad Request" }
// Business errors (preferred — structured)
{ "code": "RATE_NOT_EDITABLE", "message": "Rate for CBC is fixed at ₹250…", "details": { … } }
{ "statusCode": 409, "message": "Service code 'LAB-CBC' already exists" }
```
| Status | Meaning | UI action |
|---|---|---|
| 400 | Business rule / validation / state-machine | Inline form error with `message`; use `code` for field mapping |
| 401 | Token expired / session revoked | Refresh → else redirect login |
| 403 | Cross-tenant / forbidden | "Not allowed" |
| 404 | Missing **or other tenant's** record | "Record not found" + refresh list |
| 409 | Duplicate (code/mobile/email/schedule) | Highlight the conflicting field |

### 6.5 Writes are full-state replaces
Role assignments, department mappings, package structures, reference ranges, interpretation rules, panel syncs — all are **replace semantics**. Send the complete final array, not a diff. (Empty array = clear all, where documented.)

### 6.6 Multipart uploads
| Upload | Field | Limits |
|---|---|---|
| Service bulk import | `file` | .csv/.xlsx ≤ 5 MB |
| Doctor signature | `signature` | PNG/JPG/SVG ≤ 2 MB |
| Panel document template | `template` | PDF/PNG/JPG ≤ 10 MB |

Files serve from the same origin at `/uploads/…` — render `<img src>`/download links directly.

---

## 7. Screen Inventory by Area

| Area | Screens | Key endpoints |
|---|---|---|
| **Auth** | Login, change password, refresh | `/hospital/auth/*` |
| **Users & Roles** | Users grid, role matrix, master-role catalog, effective permissions | `/hospital/users/*`, `/hospital/roles/*` |
| **Basic Masters** | Departments, shifts, geo, banks, doc types, discount reasons/authority | `/hospital/masters/departments|shifts|geo|banks|document-types|discount-reasons|discount-approval-authorities` |
| **Services** | Categories, sub-categories, service items, bulk import | `/hospital/masters/service-categories|service-sub-categories|service-items` |
| **Doctors** | Clinical depts, specializations, doctor profile, visit configs, refer doctors, commissions, signature, share report | `/hospital/masters/clinical-departments|specializations|doctor-visit-configs|refer-doctors|doctors` |
| **Ward/IPD** | Room types, rooms, beds, amenities, BOR, housekeeping queue, admissions | `/hospital/masters/room-types|rooms|beds|bed-amenities|ward-room`, `/ipd/admissions` |
| **Lab/Radio** | Lab depts, investigations, observations, ranges, templates, interpretations, helps, comments, containers, sample types, organisms, antibiotics, outsource labs, sign-off authorities | `/hospital/masters/lab-departments|investigations|observations|reference-ranges|lab-templates|lab-interpretations|observation-helps|report-comments|sample-containers|sample-types|organisms|antibiotics|outsource-labs|lab-signoff-authorities` |
| **Panels & Finance** | Panels, tariffs, rate schedules, panel documents, thresholds, packages, consumption | `/hospital/masters/panels|tariffs|rate-schedules|panel-documents|thresholds|packages|package-consumption` |
| **OPD Ops** | Patients, appointments, queue, vitals, consultations, billing, payments, invoice | `/opd/patients|appointments|queue|vitals|consultations|billing` |
| **Platform (admin UI)** | Hospital onboarding, packages, catalog | `/platform/*` (separate app/section) |

---

## 8. Server Rules Your UI Must Mirror

Mirror these client-side for good UX — the server enforces them regardless:

| Rule | Server behavior | Your UI |
|---|---|---|
| Last active SUPER_ADMIN can't be deactivated/deleted | 400 | Disable the toggle on that user |
| Role assignment = exactly one `isPrimary` | 400 | Enforce single "primary" radio |
| Service gender/age restrictions | 400 with patient context | Warn before adding the line |
| `rateEditable=false` | 400 on price change | Read-only price input |
| `discountable=false` | 400 on discount | Disable discount input |
| Bed state machine (7 transitions) | 400 `INVALID_STATUS_TRANSITION` + `allowedTransitions` | Only offer legal next actions per status |
| Gender wards (MALE_ONLY/FEMALE_ONLY/PEDIATRIC) | 400 at assign/transfer | Pre-filter bed grid by patient gender |
| IPD cancel only without bed | 400 | Hide cancel once bed assigned |
| Discharge order: initiate → complete | 400 | Two-step button flow |
| Follow-up quota | engine decides | Just render `isFollowUpVisit` + fee |
| Package nesting inside packages | 400 | Exclude PACKAGE services from component picker |
| Rate-schedule overlap | 400 with conflicting range | Date-range picker shows the clash inline |
| Threshold SOFT/HARD | statuses OK/ALERT/WARNING/BLOCKED | 🟢🟡🟠🔴 banner on charge entry |
| Sign-off: VERIFY vs APPROVE_LOCK | `{ isAuthorized, reason }` | Gate the "Approve & Lock" button via `verify-permission` |
| Full-state replace writes | server replaces | Always submit complete arrays |

---

## Appendix A — Where things live in the backend (for API spelunking)

```
src/
├── Platform/            # SaaS plane: tenant onboarding, packages, catalog, audit, dashboard
├── hospital/
│   ├── identity/        # hospital auth (login/refresh/OTP/sessions)
│   ├── core/decorators/ # @CurrentTenant() @CurrentUser()
│   ├── user-management/ # users, roles, permissions
│   ├── masters/         # ALL masters: services, doctors, ward-room, lab-radio, panels, packages…
│   ├── opd/             # patients, appointments, queue, vitals, consultations, billing
│   └── ipd/             # admissions (+ future IPD charging)
└── shared/              # prisma, seeds (default master trees)
```

**When in doubt:** hit Swagger at `/api/docs` with a hospital token, or read the phase doc for the exact module — every phase ships with full API reference + examples + the error tables.

---

*Last updated: Phase 3.2 (Packages). Backend test status: 35 suites · 306 passing · build clean.*
