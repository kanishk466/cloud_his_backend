# Phase 2.1 — Services Setup (Category → SubCategory → Service Items & Bill Linkage)

> **Audience:** backend reviewers, QA, and the frontend team building the Services Master & billing screens.
> **Module:** `src/hospital/masters/services-setup/` · **Migration:** `20261007101122_phase_2_1_services_setup`

---

## 1. What we did

A hospital has thousands of chargeable services (CBC test, doctor consultation, ICU bed charge, CT scan…). This phase introduces the standard **3-tier hierarchy** used across Indian HIS products to organise them:

1. **Service Category (Tier 1)** — broad classification: *Diagnostics/Lab, Consultations, Procedures, Room Charges*. Carries `storeType` (`NONE`/`MEDICAL`/`GENERAL`) for future pharmacy/store integration. **Replaces the old rigid `ServiceCategory` enum** with a dynamic per-hospital master.
2. **Service Sub-Category (Tier 2)** — clinical wing: *Biochemistry, Hematology, Minor OT, Cardiology Echo*. Controls **invoice grouping and print order** on final bills (`displayName` + `printOrder`).
3. **Service Items (Tier 3)** — the enhanced `ServiceMaster`: each bookable/chargeable test or procedure with billing behaviour flags.

Each `OpdBillItem` (bill line) can now be **linked directly to a service** via `serviceId` — the foundation for rate lookup, discount rules and GST reporting in upcoming billing phases.

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| Dynamic `ServiceCategoryMaster` instead of the old enum | Every hospital classifies services differently ("Room Charges" vs "Bed Charges" vs "Ward Rent"). An enum needs a code deployment to change; a master table is editable per hospital. |
| Invoice grouping at **sub-category** level | Bills in India print grouped sections ("Laboratory", "Radiology"). `printOrder` + `displayName` on sub-category keep that concern out of the service name. |
| `rateEditable` per service | Consultation rates are fixed; emergency/complex procedures need counter-level price flexibility. Per-service flag beats role-level hacks. |
| `discountable` per service | Implants, blood bags, stents are sold at near-zero margin — blanket discounts cause direct losses. Default `true` keeps existing behaviour for everything else. |
| `genderRestriction` / `minAgeYears` / `maxAgeYears` | Pap Smear = FEMALE only; Phototherapy = pediatric. Captured at master level so OPD/IPD billing can validate before adding the line item (validation enforced in the billing phase). |
| Soft delete with **child-reference guards** | A category with live sub-categories/services cannot be deleted (400). Prevents silently breaking invoice grouping and historical rate panels. |
| `serviceId` on bill item with `onDelete: SetNull` | Deleting a service must never destroy billing history. The line item keeps its own `itemName`/`unitPrice` snapshot regardless. |
| `serviceCode` auto-generation (`SVC-0001…`) | Front desks don't want to invent codes; power users can still supply their own (`LAB-CBC`). Uniqueness per tenant enforced either way. |
| Auto-fill `categoryId` from sub-category | When the client picks "Biochemistry", the parent "Diagnostics" is implied — one less dropdown, zero inconsistent pairs. |

---

## 3. What changed

### 3.1 Database (`prisma/schema.prisma`)

| Change | Detail |
|---|---|
| `ServiceCategoryMaster` (`service_category_masters`) | **New.** UUID id, `tenantId`, `name`, `code`, `storeType` (default `NONE`), `sortOrder`, `isActive`, `deletedAt`. Unique `[tenantId, code]`. |
| `ServiceSubCategory` (`service_sub_categories`) | **New.** UUID id, `tenantId`, `categoryId` (FK → category, cascade), `name`, `code`, `displayName?`, `printOrder`, `isActive`, `deletedAt`. Unique `[tenantId, code]`. |
| `ServiceMaster` (`service_masters`) | **Enhanced.** Added `categoryId?`, `subCategoryId?` (both FK `SetNull`), `itemType` (`OPD`/`IPD`/`DAYCARE`/`BOTH`/`PACKAGE`, default `BOTH`), `hsnSacCode?`, `uom?`, `rateEditable` (default `false`), `discountable` (default `true`), `genderRestriction?` (`Gender` enum), `minAgeYears?`, `maxAgeYears?`, and `billItems` relation. |
| ~~`ServiceCategory` enum~~ | **Removed** (with the `category` column). Replaced by the dynamic master. |
| `OpdBillItem` (`opd_bill_items`) | Added `serviceId?` (FK → `ServiceMaster`, `SetNull`) + index. |
| `Hospital` | Added `serviceCategoryMasters`, `serviceSubCategories` relations. |

> ⚠️ The old `category` enum column is **dropped** by the migration (data loss in that one column only — it held enum labels like `LAB`). Existing rows keep everything else; new hierarchy columns start `NULL`.

### 3.2 New module (`src/hospital/masters/services-setup/`)

```
services-setup/
├── dto/
│   ├── category/       create-service-category.dto.ts, update-service-category.dto.ts
│   ├── sub-category/   create-service-sub-category.dto.ts, update-service-sub-category.dto.ts
│   └── service-item/   create-service-item.dto.ts, update-service-item.dto.ts, filter-service-item.dto.ts
├── controllers/        service-categories / service-sub-categories / service-items .controller.ts
├── services/           (same trio).service.ts
├── repositories/       (same trio).repository.ts
├── tests/              service-categories.service.spec.ts, service-items.service.spec.ts
└── services-setup.module.ts        (registered in masters.module.ts)
```

### 3.3 Legacy adjustments

| File | Change |
|---|---|
| `masters/service-master/` (`/hospital/masters/services`) | **Kept for backward compatibility**, `category` field/filter removed (enum is gone). New integrations should use `/hospital/masters/service-items`. |
| `masters/tariff/tariff.service.ts` | Service select now returns `categoryRel { id, name, code }` instead of the removed enum. |
| `opd/consultations/consultations.repository.ts` | Investigation order's service select: same `categoryRel` replacement. |

---

## 4. API reference (for testing)

Global prefix: **`/api`** · Auth: `Authorization: Bearer <hospital access token>` · Swagger: `GET /api/docs`

### 4.1 Service Categories — `/api/hospital/masters/service-categories`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Create (409 on duplicate code) |
| GET | `/?active=true` | List, ordered by `sortOrder` then name; includes `_count.subCategories` & `_count.services` |
| GET | `/:id` | Detail incl. its sub-categories (print order) |
| PATCH | `/:id` | Partial update |
| DELETE | `/:id` | Soft delete — **400 if sub-categories or services still linked** |

**POST body**
```json
{
  "name": "Diagnostics / Lab",
  "code": "DIAG",
  "storeType": "NONE",
  "sortOrder": 1
}
```
`code` → auto trimmed + uppercased; only `A-Z 0-9 _ -`. `storeType` ∈ `NONE | MEDICAL | GENERAL`.

### 4.2 Service Sub-Categories — `/api/hospital/masters/service-sub-categories`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Create — `categoryId` must exist in this hospital (404 otherwise) |
| GET | `/?active=true` | List with parent `category { id, name, code }` + services count |
| GET | `/by-category/:categoryId?active=true` | **Dropdown source** — sub-categories of one category, in print order |
| GET | `/:id` | Detail |
| PATCH | `/:id` | Partial update (re-validates `categoryId` if changed) |
| DELETE | `/:id` | Soft delete — **400 if services still linked** |

**POST body**
```json
{
  "categoryId": "uuid-of-DIAG",
  "name": "Biochemistry",
  "code": "BIO",
  "displayName": "Biochemistry Lab",
  "printOrder": 1
}
```
`displayName` is what gets printed on the patient bill; falls back to `name` conceptually.

### 4.3 Service Items — `/api/hospital/masters/service-items`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Create — `serviceCode` optional (auto `SVC-0001…`); 409 on duplicate |
| GET | `/?search=cbc&categoryId=…&subCategoryId=…&itemType=OPD&isActive=true` | Search + filters |
| GET | `/:id` | Detail incl. `categoryRel` & `subCategoryRel` |
| PATCH | `/:id` | Partial update (code change re-checked for uniqueness) |
| DELETE | `/:id` | Soft delete (`deletedAt` + `isActive=false`) |

**POST body (full example)**
```json
{
  "serviceName": "Complete Blood Count (CBC)",
  "baseRate": 250,
  "subCategoryId": "uuid-of-BIO",
  "itemType": "BOTH",
  "hsnSacCode": "999311",
  "uom": "Per Test",
  "rateEditable": false,
  "discountable": true,
  "genderRestriction": null,
  "minAgeYears": 0,
  "maxAgeYears": 120
}
```

**Minimal body** (code auto-generated, hierarchy optional):
```json
{ "serviceName": "General Ward Bed Charge", "baseRate": 800 }
```

**200 response shape**
```json
{
  "id": "…", "serviceCode": "SVC-0007", "serviceName": "Complete Blood Count (CBC)",
  "baseRate": "250.00", "itemType": "BOTH", "hsnSacCode": "999311", "uom": "Per Test",
  "rateEditable": false, "discountable": true,
  "genderRestriction": null, "minAgeYears": 0, "maxAgeYears": 120,
  "categoryId": "…", "subCategoryId": "…", "isActive": true,
  "categoryRel":    { "id": "…", "name": "Diagnostics / Lab", "code": "DIAG" },
  "subCategoryRel": { "id": "…", "name": "Biochemistry", "code": "BIO", "displayName": "Biochemistry Lab", "printOrder": 1 }
}
```
> `baseRate` is a Prisma `Decimal` → arrives as a JSON string (`"250.00"`).

**Business rules enforced server-side**
| Rule | Error |
|---|---|
| Duplicate `serviceCode` in tenant | 409 |
| `categoryId`/`subCategoryId` not in this hospital | 404 |
| Sub-category belongs to a different category | 400 |
| Only `subCategoryId` sent | `categoryId` auto-filled from parent ✅ |
| `minAgeYears > maxAgeYears` | 400 |

---

## 5. Typical workflows

### 5.1 One-time hospital setup (order matters!)
```
POST /service-categories        { "name": "Diagnostics / Lab", "code": "DIAG", "sortOrder": 1 }
POST /service-categories        { "name": "Consultations",     "code": "CONS", "sortOrder": 2 }
POST /service-categories        { "name": "Room Charges",      "code": "ROOM", "sortOrder": 3 }

POST /service-sub-categories    { "categoryId": <DIAG>, "name": "Biochemistry", "code": "BIO", "printOrder": 1 }
POST /service-sub-categories    { "categoryId": <DIAG>, "name": "Hematology",   "code": "HEM", "printOrder": 2 }

POST /service-items             { "serviceName": "CBC", "baseRate": 250, "subCategoryId": <BIO> }
POST /service-items             { "serviceName": "Blood Sugar (F)", "baseRate": 60, "subCategoryId": <BIO> }
POST /service-items             { "serviceName": "Pap Smear", "baseRate": 400, "subCategoryId": <BIO>, "genderRestriction": "FEMALE" }
POST /service-items             { "serviceName": "Phototherapy", "baseRate": 1500, "maxAgeYears": 1 }
```

### 5.2 Billing-time lookup (used by upcoming OPD billing)
```
GET /service-items?search=cbc&isActive=true   → pick service → its id lands on OpdBillItem.serviceId
```
The bill line keeps its own `itemName`/`unitPrice` snapshot, while `serviceId` gives you `rateEditable`, `discountable`, `hsnSacCode`, age/gender rules at billing time.

---

## 6. Frontend integration guide

### 6.1 Cascading dropdowns (Category → SubCategory → Service)
```ts
// 1. Categories (once, cache them)
const cats = await api.get('/api/hospital/masters/service-categories?active=true');

// 2. Sub-categories when a category is picked
const subs = await api.get(
  `/api/hospital/masters/service-sub-categories/by-category/${categoryId}?active=true`
);

// 3. Services — or free-search directly (skip cascade for billing screens)
const items = await api.get('/api/hospital/masters/service-items', {
  params: { search: 'cbc', isActive: true },
});
```

### 6.2 Services master grid
- Column for category shows `categoryRel?.name`; sub-category shows `subCategoryRel?.displayName ?? subCategoryRel?.name`.
- Badge ideas: `PACKAGE`/`IPD` chip from `itemType`; 🔒 icon when `!rateEditable`; 🚫% when `!discountable`.
- `isActive=false` rows → grey them out; toggle via `PATCH /:id { "isActive": false }`.

### 6.3 Service create/edit form — mirror server validation
| Field | Client-side rule |
|---|---|
| `serviceCode` | Leave blank → server auto-generates. If entered: `[A-Z0-9_-]+`, auto-uppercase. Show 409 message inline. |
| Category → Sub-category | Filter sub-category dropdown by chosen category (`by-category/:categoryId`). Or pick sub-category first and let the server auto-fill the parent. |
| Age range | Disable "max < min" before submit (server still 400s). |
| `genderRestriction` | Only render for relevant services (e.g., gynae/pediatric) to keep the form clean. |
| `baseRate` | Number ≥ 0, max 2 decimals. Display returned `"250.00"` string with `Number(...)`. |

### 6.4 Billing counter (how the flags drive the bill UI — next phase)
```ts
const service = await api.get(`/api/hospital/masters/service-items/${id}`);
// unit price input disabled  ← !service.rateEditable
// discount % input disabled  ← !service.discountable
// gender/age warning toast   ← patient vs genderRestriction / age range
```

### 6.5 Delete flows
- `DELETE` a category/sub-category that still has children → **400 with counts** (`"2 sub-categorie(s) and 5 service(s) are still linked"`). Surface the message verbatim — it tells the user exactly what to clean up.
- `DELETE` a service → soft delete; historical bills keep their snapshots (safe).

### 6.6 Error handling cheat-sheet
| Status | Meaning | UI suggestion |
|---|---|---|
| 400 | Hierarchy mismatch / age range / delete blocked | Toast `response.data.message` |
| 401 | Token expired | Redirect to login |
| 404 | Not found **or belongs to another tenant** | "Record not found" + refresh |
| 409 | Duplicate `code` / `serviceCode` | Highlight the field |

> Strict validation pipe: send **only documented fields** — unknown keys are rejected with 400.

---

## 7. Verification status

| Check | Result |
|---|---|
| `npx prisma migrate dev --name phase_2_1_services_setup` | ✅ applied |
| `npm run test` | ✅ 6 suites · 63 passed · 1 todo (24 new tests) |
| `npm run build` | ✅ clean |

## 8. Not in this phase (next steps)

- **OPD Billing integration**: consume `serviceId`, enforce `rateEditable` / `discountable` / gender / age at bill-line level.
- **Invoice print**: group `OpdBillItem`s by sub-category using `printOrder` + `displayName`.
- **Bulk import** (CSV/Excel) of service items for hospital onboarding.
- **Seed script** for a default category/sub-category tree per new tenant.
- Store integration: `storeType` (`MEDICAL`/`GENERAL`) will drive pharmacy stock linkage.
