# HIMS Backend — Work Log & Testing Guide

> Scope: yeh document us saara kaam ko cover karta hai jo HANDOFF-01 se HANDOFF-05 tak kiya gaya — kya banaya, **kyun** banaya, aur **kaise test** karna hai.
>
> Branch: `kanishk/generateToken` · Base commit: `1daf3fc`

---

## 1. Ek Nazar Mein (Summary)

7 logical commits, 3 phases:

| Commit | Phase | Kaam |
|---|---|---|
| `323f1eb` | Infra | Migration files restore, jest fix, boot-time migrate hataya |
| `92a894d` | RBAC | Permission enforcement guard |
| `f1a8ffe` | Phase 1.1 / 1.2 | Basic Master (geo, bank, patient doc, discount) |
| `6f25095` | Schema | Basic-master + discount + services schema DB se align |
| `1c3e707` | Phase 2.1 | Services Setup hierarchy + discount engine → OPD billing |
| `351a2a5` | Schema | Doctor setup models DB se align |
| `37d3d79` | Phase 2.2 | Doctor Setup masters + enhanced profile + OPD visit config |

---

## 2. Sabse Bada Discovery — "DB already had the design" 🤔

### Problem kya thi
Har handoff ek legacy 6–7 step wizard describe karta tha. Lekin jab humne schema likhna shuru kiya, pata chala ki **shared Neon DB par already ek parallel, more-advanced design maujood tha** — 13 migrations apply ho chuki thi, aur unke `migration.sql` files **local se gayab** the (10 khaali folders).

### Kyun important tha
Agar hum apna schema DB par blindly migrate kar dete, to:
- `prisma migrate` **P3015** se fail hota (missing migration file).
- Ya reset karte to **shared DB wipe** ka risk.
- Mera design (jaise `patient_documents`, `discount_approvals`) DB ke existing tables (`patient_document_types`, `discount_approval_authorities`) se **takra** jata.

### Kya kiya
1. **Read-only investigation** (koi write nahi) — `information_schema` se actual DB columns, FKs, enums, indexes nikale.
2. **Restored** missing migration files `git` commit `a7c4cbf` se (byte-exact `git checkout`), checksums DB se reconcile kiye → **13/13 match**.
3. **Schema ko DB ke design se align kiya** — apna design thopne ke bajaye.
4. `prisma migrate diff` se verify kiya → **ZERO DIFF** mere saare tables ke liye.

### Seekh (Golden Rule)
> Row-level tenant isolation ke saath, **DB hi source of truth hai**. Code likhne se pehle `migrate diff` + introspection zaroor karo.

---

## 3. Phase-wise: Kya, Kyun, Kaise

### Phase 0 — Infra Fixes (`323f1eb`)

| Kya | Kyun |
|---|---|
| 10 missing `migration.sql` restore | `migrate status/deploy` **P3015** se fail ho raha tha; naya developer ka clone toota hota |
| `_prisma_migrations` checksum reconcile (2 files) | Files baad mein edit hui thi, content DB se match karta hai par stored checksum alag tha |
| `package.json` jest `moduleNameMapper` | `src/*` absolute imports `rootDir=src` ke saath jest mein resolve nahi hote the — isliye koi bhi service test likhna possible hi nahi tha |
| `main.ts` se `execSync('prisma migrate deploy')` hataya | Har boot par migration churna dangerous hai; migration ab deploy/CI step hona chahiye |

### Phase 0.5 — RBAC Enforcement (`92a894d`)

**Kyun:** Poore project mein RBAC ka **data** tha (roles, permissions) par **enforcement nahi**. Har endpoint sirf `HospitalJwtAuthGuard` use karta tha — UI menu filter ho jata tha, par direct API call se koi bhi licensed-but-not-permitted action kar sakta tha.

**Kya banaya:**
```
src/hospital/core/decorators/require-permissions.decorator.ts   @RequirePermissions(...codes)
src/hospital/core/permissions/
├── permissions.service.ts     user → roles → HospitalRolePermission → Feature.code
├── permissions.guard.ts       enforce + SUPER_ADMIN bypass
├── permissions.module.ts      @Global
└── permissions.guard.spec.ts  (7 tests)
```

**Kaise kaam karta hai:**
```ts
@UseGuards(HospitalJwtAuthGuard, PermissionsGuard)
@Get()
@RequirePermissions('BASIC_MASTER_BANK_VIEW')
list() { ... }
```
- Metadata na ho → sirf authentication.
- SUPER_ADMIN bypass (full licensed access).
- Lookup `tenantId` + `userId` se scoped → hospital A, hospital B ki permissions resolve nahi kar sakta.

### Phase 1.1 — Basic Master (`f1a8ffe`)

**Kyun:** Hospital onboarding ke liye base reference data chahiye — country/state/city, banks, patient document types.

**Kya banaya** (`src/modules/master-config/basic-master/`):
| Master | Scope | Table |
|---|---|---|
| Country / State / District / City | **Global** (shared) | `countries`, `states`, `districts`, `cities` |
| Bank | Tenant | `banks` |
| PatientDocument | Tenant | `patient_document_types` |

Har entity: DTOs (create/update/query) + Service + Controller (CRUD + dropdown) + Module, Swagger + audit + permissions ke saath.

### Phase 1.2 — Discount Reason & Approval (`f1a8ffe`)

**Kyun:** Billing par discount lagate waqt reason mandatory ho, aur threshold se upar approval authority chahiye.

**Kya banaya:**
- `DiscountReason` (code, reason, applicableType, defaultDiscountPct, approvalThresholdPct, requiresApproval)
- `DiscountApproval` = `discount_approval_authorities` (authorityName, hospitalUserId, maxDiscountPct, isUnlimited, priority)
- `DiscountAuditLog` (`discount_audit_logs`)
- **`DiscountValidationService`** — reusable engine (Billing ise call karta hai):
  1. Reason mandatory
  2. Threshold check → approval required?
  3. Authority limits (% / amount / unlimited)
  4. `discount_audit_logs` mein row likhta hai

### Phase 2.1 — Services Setup (`6f25095`, `1c3e707`)

**Kyun:** Commercial catalog ka backbone — services/items hierarchy.

**Kya banaya:**
| Model | Scope | Table |
|---|---|---|
| ServiceItemType | Global (8 seeded) | `service_item_types` |
| ServiceCategoryMaster | Tenant | `service_categories` |
| ServiceSubCategory | Tenant | `service_sub_categories` |
| ServiceMaster (enhanced) | Tenant | `service_masters` |
| OpdBillItem (enhanced) | Tenant | `opd_bill_items` |

> Note: Handoff "DisplayName Master" ek alag table maangta tha, par DB ne usse `service_sub_categories.displayName` **column** ke roop mein consolidate kiya — hum DB follow kiye.

**OPD Billing wiring:** `applyDiscount` ab `discountReasonId` aane par validation engine chalata hai (backward compatible).

### Phase 2.2 — Doctor Setup (`351a2a5`, `37d3d79`)

**Kyun:** Doctor ke professional details, specialization hierarchy, external refer doctors, aur PRO (marketing) mapping.

**Kya banaya:**
| Model | Table |
|---|---|
| ClinicalDepartment | `clinical_departments` |
| DoctorSpecialization | `doctor_specializations` |
| OpdVisitConfig | `opd_visit_configs` (free followup days, max free visits, revisit charge %, validity) |
| ReferDoctor | `refer_doctors` |
| ProMapping | `pro_mappings` |
| DoctorProfile (enhanced) | `doctor_profiles` (+title, degree, designation, doctorType, doctorShare, taxPin, etc.) |

> Decision note: Handoff ke 4 pending decisions **DB ne khud resolve** kar diye — PRO hybrid (name + user), signature URL, doctor share single %, visit config per doctor.

---

## 4. Universal Patterns (jo har module follow karta hai)

1. **Multi-tenancy** — `tenantId` column; har read/write tenant-scoped.
2. **Soft delete** — `deletedAt` (hard delete nahi).
3. **Composite tenant FKs** — `(tenantId, id)` reference → strong cross-tenant isolation (doctor setup mein).
4. **Audit** — har mutation `audit_logs` mein.
5. **Permissions** — har endpoint `@RequirePermissions` se protected.
6. **Defence-in-depth** — ownership check ke baad write bhi composite key se (`id_tenantId` / `tenantId_id`).
7. **Idempotent seed** — global + tenant-scoped seed functions.
8. **Layer flow** — Controller → Service → Repository → Prisma → PostgreSQL.

---

## 5. Naye Endpoints (base paths)

> Global prefix: `/api`

### Basic Master
| Base path | Methods |
|---|---|
| `/api/master-config/basic/countries` | CRUD + `/dropdown` |
| `/api/master-config/basic/states` | CRUD + `/dropdown` |
| `/api/master-config/basic/districts` | CRUD + `/dropdown` |
| `/api/master-config/basic/cities` | CRUD + `/dropdown` |
| `/api/master-config/basic/banks` | CRUD + `/dropdown` |
| `/api/master-config/basic/patient-documents` | CRUD + `/dropdown` |
| `/api/master-config/basic/discount-reasons` | CRUD + `/dropdown` |
| `/api/master-config/basic/discount-approvals` | CRUD + `/dropdown` |
| `/api/master-config/basic/discounts/validate` | POST (validation engine) |

### Services Setup
| Base path | Methods |
|---|---|
| `/api/hospital/masters/service-item-types` | CRUD |
| `/api/hospital/masters/service-categories` | CRUD + `/dropdown` |
| `/api/hospital/masters/service-sub-categories` | CRUD + `/dropdown` |
| `/api/hospital/masters/services` | CRUD (paginated + filters) |

### Doctor Setup
| Base path | Methods |
|---|---|
| `/api/hospital/masters/clinical-departments` | CRUD + `/dropdown` |
| `/api/hospital/masters/doctor-specializations` | CRUD + `/dropdown` |
| `/api/hospital/masters/refer-doctors` | CRUD + `/dropdown` |
| `/api/hospital/masters/pro-mappings` | CRUD |
| `/api/opd/doctors/:id/visit-config` | POST (set) / GET |

---

## 6. Testing Guide

### 6.1 Prerequisites

```bash
# 1. Dependencies
npm install

# 2. Env — .env mein ye hona chahiye (already hai)
#    DATABASE_URL, DIRECT_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

# 3. Prisma client generate
npx prisma generate
```

### 6.2 Static checks (sabse pehle)

```bash
# Schema valid hai?
npx prisma validate

# Schema DB se match karta hai? (mere tables ke liye ZERO DIFF aana chahiye)
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script

# Migration history theek hai?
npx prisma migrate status        # → "Database schema is up to date!"

# TypeScript compile
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json
# NOTE: 3 pre-existing errors patients.service.spec.ts mein aayenge (mere kaam se nahi)
```

### 6.3 Unit tests

```bash
# Sirf mere naye tests
npx jest discount-validation.service.spec permissions.guard.spec
# → 14 passed (discount validation 8 + permissions guard 6)

# Full suite
npx jest
# → mere 2 suites pass; patients.service.spec.ts pre-existing fail
```

### 6.4 Build & Boot

```bash
# Build
npm run build        # → node_modules/@nestjs/cli nest build (clean)

# Boot (dev)
npm run start:dev

# ya production build chalane ke liye
node dist/src/main.js
```

Boot success ke signs:
```
[NestApplication] Nest application successfully started
Application is running on: http://127.0.0.1:<PORT>
Swagger docs available at: http://127.0.0.1:<PORT>/api/docs
```
> MailService ka BREVO error pre-existing hai (missing API key) — boot block nahi karta.

### 6.5 Swagger UI (manual API testing)

> ⚠️ **Zaroori:** Basic Master aur hospital/masters endpoints `@CurrentTenant()` use karte hain, jo **hospital JWT** (`/api/hospital/auth/login`) se aata hai. Platform admin token (`/api/auth/login`) mein `tenantId` nahi hota — usse sirf Platform/tenant endpoints chalenge.

1. `http://localhost:8000/api/docs` kholo (default PORT 8000, ya `.env` ka `PORT`).

2. **Hospital user login** (basic-master/services/doctors test karne ke liye):
   ```bash
   curl -X POST http://localhost:8000/api/hospital/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@abchospital.in","password":"<password>"}'
   # → { accessToken, refreshToken, hospital: {...}, user: {...} }
   ```
   (Hospital admin pehli baar hospital activate hone par auto-provision hota hai + credentials email jaate hain.)

3. **Platform admin login** (sirf tenant/catalog/package endpoints):
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@platform.com","password":"Admin@123"}'
   ```

4. Swagger mein **Authorize** button → Bearer token paste karo.
5. Ab relevant endpoints test kar sakte ho.

### 6.6 End-to-End Manual Test (recommended order)

Kyunki permissions ab enforce hote hain, dhyaan rakho: `SUPER_ADMIN` bypass karta hai; regular hospital user ko `BASIC_MASTER_*` / `SERVICE_*` codes assign hone chahiye.

```text
1. Hospital user login → token (note: basic-master/services/doctors ke liye hospital JWT chahiye)
2. Phase 1.1 — Geo:
   POST /api/master-config/basic/countries      { countryCode, countryName, currency }
   POST /api/master-config/basic/states          { countryId, stateCode, stateName }
   POST /api/master-config/basic/districts       { stateId, districtCode, districtName }
   POST /api/master-config/basic/cities          { districtId, cityCode, cityName }
   GET  /api/master-config/basic/countries       (list verify)

3. Phase 1.1 — Bank / Patient Doc:
   POST /api/master-config/basic/banks           { bankName, mdrPercent }
   POST /api/master-config/basic/patient-documents { documentName, applicableFor }

4. Phase 1.2 — Discount:
   POST /api/master-config/basic/discount-reasons  { code, reason, approvalThresholdPct }
   POST /api/master-config/basic/discount-approvals { code, authorityName, maxDiscountPct }
   POST /api/master-config/basic/discounts/validate
        { module:"OPD", discountPercent:15, reasonId, approvalId, referenceType, referenceId,
          originalAmount:10000, finalAmount:8500 }
        → 30%+ par approval maange bina 403 aana chahiye

5. Phase 2.1 — Services:
   POST /api/hospital/masters/service-categories   { configType:"OPD", categoryName:"Consultation" }
   POST /api/hospital/masters/service-sub-categories { categoryId, subCategoryName, displayName }
   GET  /api/hospital/masters/service-item-types    (8 seeded aane chahiye)
   POST /api/hospital/masters/services              { serviceCode, serviceName, category, baseRate, categoryId }

6. Phase 2.2 — Doctors:
   POST /api/hospital/masters/clinical-departments   { name:"Cardiology" }
   POST /api/hospital/masters/doctor-specializations { clinicalDepartmentId, name:"Interventional Cardiology" }
   POST /api/hospital/masters/refer-doctors          { name:"Dr. Anil" }
   POST /api/hospital/masters/pro-mappings           { referDoctorId, proName, commissionPercent:5 }
   POST /api/opd/doctors/:id/visit-config            { freeFollowupDays:7, maxFreeVisits:2, revisitChargePercent:50 }
```

**Expected key behaviours:**
| Scenario | Expected |
|---|---|
| Duplicate name/code | `409 Conflict` |
| Missing/invalid parent id | `400 Bad Request` |
| Global row ko edit/delete (jahan global hai) | `409` |
| Delete parent jiske children hain | `409` (delete guard) |
| Bina permission user | `403 Missing permission(s): ...` |
| Threshold se upar discount, approval ke bina | `403` |

### 6.7 Seed

```bash
# Global geo + permissions (idempotent)
npx ts-node prisma/seed.ts
# NOTE: poora seed bhaari hai; geo part verified hai (countries=1, states=6, districts=12, cities=28)
```

Tenant-scoped seed (banks/docs/discounts) har hospital ke liye `prisma/seed.ts` se automatically chalti hai — abhi koi hospital nahi to skip hoti hai.

---

## 7. Current Status

| Item | Status |
|---|---|
| `prisma validate` | ✅ |
| `prisma migrate diff` (mere tables) | ✅ ZERO DIFF |
| `prisma migrate status` | ✅ up to date |
| `tsc --noEmit` | ✅ (3 pre-existing spec errors) |
| `npm run build` | ✅ |
| App boot | ✅ |
| Unit tests (naye) | ✅ 14/14 |
| Migration banayi | ❌ nahi (tables DB par already hain) |
| Push | ❌ nahi (local commits) |

### Pending / Known issues
1. **`patients.service.spec.ts`** — pre-existing failures (service signature `register(tenantId, dto, userId)` se match nahi karta). Mere kaam se pehle se fail.
2. **Permissions rollout** — existing hospital roles ko `BASIC_MASTER_*`, `SERVICE_*`, `CLINICAL_DEPARTMENT_*` etc. feature codes assign karne padenge, warna regular users ko 403 aayega.
3. **Seed poora timeout** — bhaari seed; geo part standalone verified hai.

---

## 8. Reference — Kaunse Tables/Models

### Phase 1
`countries`, `states`, `districts`, `cities` (global) · `banks`, `patient_document_types`, `discount_reasons`, `discount_approval_authorities`, `discount_audit_logs` (tenant)

### Phase 2.1
`service_item_types` (global) · `service_categories`, `service_sub_categories`, `service_masters`, `opd_bill_items` (tenant)

### Phase 2.2
`clinical_departments`, `doctor_specializations`, `opd_visit_configs`, `refer_doctors`, `pro_mappings`, `doctor_profiles` (tenant)

### Enums add/use kiye
`DocumentApplicableFor` · `DiscountApplicableType` · `ServiceConfigType` · `ServiceStoreType` · `DoctorType`

---

*Generated as part of HANDOFF-05 wrap-up.*
