# Phase 2.1B — Services Integration & Automation

> **Audience:** backend reviewers, QA, and the frontend team.
> **Modules:** `src/hospital/opd/billing/` · `src/hospital/masters/services-setup/` · `src/shared/seeds/`
> **Schema changes:** none (Phase 2.1 schema reused) · **New deps:** `csv-parser`, `exceljs`, `@types/multer` (dev)

---

## 1. What we did

1. **Billing enforcement.** Every bill line linked to a service (`serviceId`) is now validated **before save**: service must be active, patient gender/age must fit the service's restrictions, rate can't change when `rateEditable=false`, discount is blocked when `discountable=false`. This is where revenue leakage gets plugged.
2. **Print-ready invoice grouping.** New endpoint returns bill items grouped by **Category → Sub-Category**, sorted by `sortOrder` / `printOrder` — matching how Indian hospital bills are actually printed.
3. **Bulk import.** Hospitals onboard with 500–2000 services in Excel — one `POST` uploads the whole sheet; valid rows import in batches of 100, bad rows come back with exact reasons.
4. **Day-1 seed tree.** Every newly activated hospital automatically gets 8 categories + 27 sub-categories (Lab, Radiology, Consultations, Procedures, Rooms, Nursing, Pharmacy, General Store). Idempotent — never overwrites customizations.
5. **Store linkage foundation.** `storeType` resolution layer (`MEDICAL`/`GENERAL`/`NONE`) ready for the future Pharmacy/Inventory module — no pharmacy built yet, by design.

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| Validate **server-side at bill creation**, not just in UI | UI checks get bypassed (API calls, rushed counter staff). Server is the last gate — a Pap Smear on a male patient or a discounted implant simply cannot enter a bill. |
| Structured error codes (`RATE_NOT_EDITABLE`, …) | Frontend maps codes → field-level messages, independent of English text. |
| Age from `dateOfBirth`, fallback `ageAtRegistration` + `ageUnit` | Registration captures either; weeks/months/days convert to years. **Unknown age → allow + warn** (logged) — data-quality gaps must not stop emergency billing; gender can't be unknown (required at registration). |
| Invoice grouping resolved server-side | Print layout logic lives in one place; web/mobile/PDF renderers stay dumb. `displayName` (bill-print name) preferred over internal `name`. |
| Import resolves **codes → ids** per tenant | Hospital spreadsheets carry human codes (`DIAG`, `HEM`), not UUIDs. Lookup maps are pre-loaded once — never one query per row. |
| All-or-nothing transaction + batch `createMany(100)` | Partial imports corrupt masters. Batch size keeps statements small; one transaction keeps it atomic. 120s timeout for large files on remote poolers. |
| Duplicate strategy `skip` (default) vs `update` | Re-running an import during onboarding must be safe; `update` lets you re-rate an entire sheet in one go. |
| Seed skips when any category exists | Hospitals customize their tree; a "helpful" re-seed must never clobber it. Checked **inside** the transaction (race-safe). |
| Seed implementation in `src/shared/seeds/`, CLI wrapper in `prisma/` | Nest build has `sourceRoot: src` — importing from `prisma/` shifted `dist/` layout and broke `start:prod`. Fixed by keeping app code inside `src` and adding `"include": ["src/**/*"]` to `tsconfig.build.json` (also repaired a pre-existing prod-build bug). |

---

## 3. API reference (for testing)

Prefix **`/api`** · `Authorization: Bearer <hospital token>` · Swagger: `/api/docs`

### 3.1 Generate bill (now enforced) — `POST /api/opd/billing`

Line items accept two new optional fields:

```json
{
  "patientId": "uuid",
  "discountPercent": 5,
  "items": [
    {
      "serviceId": "uuid-of-service",
      "description": "Complete Blood Count",
      "category": "Lab",
      "quantity": 1,
      "unitPrice": 250,
      "discountPercent": 0
    },
    {
      "description": "Misc charge (legacy free-text — validation skipped)",
      "category": "Other",
      "quantity": 1,
      "unitPrice": 50
    }
  ]
}
```

`discountPercent` on a line falls back to the bill-level `discountPercent` for the discountable check.

**400 errors (all JSON with `code` + `details`):**

| `code` | Trigger | `details` |
|---|---|---|
| `SERVICE_NOT_FOUND` | Unknown / inactive / deleted service | `{ serviceId }` |
| `SERVICE_GENDER_MISMATCH` | e.g. Pap Smear on male patient | `{ patientGender, requiredGender }` |
| `SERVICE_AGE_MISMATCH` | Outside `minAgeYears`–`maxAgeYears` | `{ patientAgeYears }` |
| `RATE_NOT_EDITABLE` | `unitPrice ≠ baseRate` on fixed-rate service | `{ baseRate, attemptedRate }` |
| `SERVICE_NOT_DISCOUNTABLE` | Any discount % on non-discountable service | `{ attemptedDiscountPercent }` |

### 3.2 Grouped invoice — `GET /api/opd/billing/:id/invoice`

```json
{
  "bill": {
    "billNo": "BILL-20261007-0001", "date": "…", "patientName": "Ramesh Kumar",
    "patientUhid": "PT-0001", "patientGender": "MALE", "appointmentNo": "APT-001",
    "paymentStatus": "PENDING", "billStatus": "GENERATED"
  },
  "groupedItems": [
    {
      "categoryName": "Diagnostics / Lab", "categoryCode": "DIAG", "sortOrder": 1,
      "subCategories": [
        { "subCategoryName": "Biochemistry Lab", "printOrder": 1,
          "items": [ { "name": "Blood Sugar Fasting", "qty": 1, "rate": 120, "amount": 120 } ] },
        { "subCategoryName": "Hematology Lab", "printOrder": 2,
          "items": [ { "name": "CBC", "qty": 1, "rate": 250, "amount": 250 } ] }
      ]
    },
    {
      "categoryName": "Consultations", "categoryCode": "CONS", "sortOrder": 3, "subCategories": [ … ]
    },
    {
      "categoryName": "Other Charges", "categoryCode": "OTHER", "sortOrder": 9999, "subCategories": [ … ]
    }
  ],
  "totals": { "subtotal": 820, "discount": 0, "tax": 0, "grandTotal": 820, "paid": 0, "due": 820 }
}
```

Sorting: categories by `sortOrder` → sub-categories by `printOrder` → items by creation time. Items without a service link (or without hierarchy) land in trailing **"Other Charges"**.

### 3.3 Bulk import — `POST /api/hospital/masters/service-items/bulk-import`

`multipart/form-data` · field **`file`** (.csv or .xlsx, max **5 MB**) · query `?duplicateStrategy=skip|update` (default `skip`)

**Columns** (header row required): `serviceCode`*, `serviceName`*, `categoryCode`*, `baseRate`*, `subCategoryCode`, `itemType`, `hsnSacCode`, `uom`, `rateEditable`, `discountable`, `genderRestriction`, `minAgeYears`, `maxAgeYears`  (* = required)

```csv
serviceCode,serviceName,categoryCode,subCategoryCode,baseRate,itemType,rateEditable,discountable,genderRestriction,minAgeYears,maxAgeYears
LAB-CBC,Complete Blood Count,DIAG,HEM,250,BOTH,false,true,,,
GYN-PAP,Pap Smear,DIAG,PAT,400,BOTH,,true,FEMALE,18,70
RAD-XRC,X-Ray Chest,RAD,XRY,400,OPD,false,false,,,
```

**200 response**
```json
{
  "totalRows": 9, "imported": 6, "updated": 0, "skipped": 0,
  "errors": [
    { "row": 8,  "reason": "Duplicate serviceCode 'LAB-CBC' within the file" },
    { "row": 9,  "reason": "Unknown categoryCode 'WRONG'" },
    { "row": 10, "reason": "baseRate must be a non-negative number" }
  ]
}
```
- Row numbers are 1-based including the header (`row 2` = first data row).
- Defaults: `itemType=BOTH`, `uom="Per Unit"`, `rateEditable=false`, `discountable=true`.
- Booleans accept `true/false/1/0/yes/no`; enums are case-insensitive.
- `400` when: no file, wrong extension, or zero data rows.

### 3.4 Seed — standalone + automatic

```bash
npx ts-node prisma/seed-service-tree.ts <tenantId>   # manual backfill
```
Runs **automatically** on `Platform → activateHospital` (fire-and-forget, idempotent). Verified against the dev DB: first run seeds 8+27, second run skips.

---

## 4. Workflows

### 4.1 New hospital Day-1
```
Platform: activateHospital        → tree auto-seeded (8 categories / 27 sub-categories)
POST /service-items/bulk-import   → upload hospital's Excel (services attach by codes)
POST /opd/billing                 → billing starts, fully enforced
```

### 4.2 Counter adds a restricted service (what the clerk sees)
```
POST /opd/billing  { items: [{ serviceId: <pap-smear>, … }] }  (patient = male)
→ 400 SERVICE_GENDER_MISMATCH
→ "This service (Pap Smear) is restricted to FEMALE patients only."
```

### 4.3 Print the bill
```
GET /opd/billing/:id/invoice → render groupedItems in order → totals at footer
```

---

## 5. Frontend integration guide

### 5.1 Bill-item picker (enforcement-aware UX)
```ts
const s = (await api.get(`/api/hospital/masters/service-items/${id}`)).data;
// unit price  → prefill s.baseRate; disable input when !s.rateEditable
// discount %  → disable when !s.discountable
// warning     → s.genderRestriction / age range vs current patient (server still hard-blocks)
```

### 5.2 Map validation errors to fields
```ts
catch (e) {
  const { code, message, details } = e.response.data;
  switch (code) {
    case 'RATE_NOT_EDITABLE':      markField(index, 'unitPrice', message); break;
    case 'SERVICE_NOT_DISCOUNTABLE': markField(index, 'discountPercent', message); break;
    case 'SERVICE_GENDER_MISMATCH':
    case 'SERVICE_AGE_MISMATCH':   toast(message); removeLine(index); break;
    case 'SERVICE_NOT_FOUND':      toast('Service inactive — refresh the list'); break;
  }
}
```

### 5.3 Invoice print
- Iterate `groupedItems` in order — **do not re-sort** client-side.
- Print `subCategoryName` as section header (already `displayName`-aware).
- "Other Charges" group, when present, is always last.
- All amounts are numbers; format with `toFixed(2)` at render time.

### 5.4 Bulk import screen
```ts
const form = new FormData();
form.append('file', file); // .csv / .xlsx, ≤ 5 MB
const { data } = await api.post(
  '/api/hospital/masters/service-items/bulk-import?duplicateStrategy=skip',
  form,
);
// show a result table: imported/updated/skipped + errors[{row, reason}]
```
UX tips: offer a **download-template** button (columns from §3.3), show `errors` in a scrollable grid with row numbers, and suggest `duplicateStrategy=update` for price-revision sheets.

---

## 6. Verification status

| Check | Result |
|---|---|
| Migration | ⏭️ not needed (no schema changes) |
| Seed on real tenant (dev DB) | ✅ 8 categories + 27 sub-categories; 2nd run skipped; cleaned up |
| Bulk import with sample CSV (live DB) | ✅ 6 imported / 3 precise row errors; `update` strategy re-rates; cleaned up |
| `npm run test` | ✅ 10 suites · 91 passed · 1 todo (28 new tests) |
| `npm run build` | ✅ clean — `dist/main.js` layout also fixed (`tsconfig.build.json` now scoped to `src/**`) |

## 7. Not in this phase (next steps)

- **IPD/Pharmacy billing** consuming `getServicesByStoreType` for stock deduction.
- Age-unknown patients: prompt at registration when a restricted service is ordered (currently allow + warn-log).
- `MulterModule.register` for global upload limits (per-endpoint `FileInterceptor` limits suffice today).
- Async import job for >5 MB files (queue + progress) — current import is synchronous.