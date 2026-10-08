# Phase 2.4 Session 1 — Lab/Radio Core Hierarchy (LIS/RIS)

> **Audience:** backend reviewers, QA, frontend team.
> **Module:** `src/hospital/masters/lab-radio/` · **Migration:** `20261008095929_phase_2_4_session1_lab_core`
> **Roadmap:** Session 2 = sample/collection workflow · Session 3 = result entry · Session 4 = reports & verification. This session is the foundation for all of them.

---

## 1. What we did

The 4-level lab hierarchy:

```
LabDepartment (Biochemistry, X-Ray…)          ← sections with own TAT + head
  └── Investigation (Lipid Profile, CBC)      ← billable test ⇄ ServiceMaster (billing link)
        └── Observation (Total Cholesterol)   ← parameters with unit/type/formula
              └── ReferenceRange (M 13-17, F 12-15, Child 11-13)  ← by gender + age band
```

Plus: observation↔investigation **ordered M:N mapping** (report layout), a **specificity-ranked range lookup** for future result flagging, and a **Day-1 seed** (10 departments + LIPID/BSF/CBC fully wired).

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| `Investigation.serviceId → ServiceMaster` (`Restrict`) | Billing already runs on ServiceMaster (rates, tariffs, discounts, GST codes). One source of truth — the lab test IS the billable service. Restrict prevents deleting a service that a live investigation points to. |
| Category guard on service link (DIAG/RAD* only) | An investigation backed by "General Ward Bed Charge" is nonsense — but blocking hard on unknown custom categories would break legit setups. Allowed: `DIAG`, `RAD`, `RAD_*`, `LAB`, `RADIOLOGY`, `PATHOLOGY`, or no category. |
| `ObservationDataType.CALCULATED` + `formulaExpression` | LDL = TCHOL − HDL − VLDL and VLDL = TRIG/5 are computed, not measured. Captured at master level so result entry (Session 3) auto-computes. |
| M:N mapping carries `sortOrder/isMandatory/isReportable` | The same observation (e.g., ESR) appears in different positions across different panels; mandatory/reportable are per-investigation decisions, not global. |
| Range lookup by **specificity ranking** (gender+age > gender-only > age-only > universal), narrowest age span on ties | "Male 13-17" must beat "Everyone 10-20" for a 30-year-old male, and "Child 0-17" must beat the universal row — deterministic, unit-tested. |
| Atomic replace for mappings & range sets (`PUT` / `bulk`) | Report layouts are edited as a whole — delete-then-insert in one transaction can never leave a half-built panel. |

---

## 3. API reference

Prefix **`/api`** · `Authorization: Bearer <hospital token>`

### 3.1 Lab Departments — `/api/hospital/masters/lab-departments`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | 409 dup code · `headUserId` tenant-validated (404) |
| GET | `/?active=true` | With `_count.investigations` + hydrated `headUser { firstName, lastName }` |
| GET / PATCH / DELETE | `/:id` | DELETE → 400 while investigations linked |

```json
{ "name": "Biochemistry", "code": "BIO", "departmentType": "BIOCHEMISTRY",
  "headUserId": "uuid", "location": "Ground Floor, Block A", "turnaroundHours": 6 }
```

### 3.2 Investigations — `/api/hospital/masters/investigations`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | service + dept validated (404); non-lab category service → 400; 409 dup code |
| GET | `/?labDepartmentId=…&specimenType=URINE&search=lipid&isActive=true` | With dept + service + `_count.observations` |
| GET | `/:id/details` | **Full graph**: dept, service (rate/category), ordered observations, each with active `referenceRanges` |
| PUT | `/:id/observations` | Atomic replace: `[{ observationId, sortOrder?, isMandatory?, isReportable? }]` |
| PATCH / DELETE | `/:id` | Soft delete |

### 3.3 Observations — `/api/hospital/masters/observations`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | `SELECT` ⇒ `selectOptions` required (400); `CALCULATED` ⇒ `formulaExpression` required (400); 409 dup code |
| GET | `/?dataType=NUMERIC&search=glu&active=true` | With usage + range counts |
| GET | `/:id/used-in` | Reverse lookup: investigations using this observation |
| PATCH / DELETE | `/:id` | DELETE → 400 while mapped to investigations |

### 3.4 Reference Ranges — `/api/hospital/masters/reference-ranges`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Single range; inverted bounds (age/value/critical) → 400 |
| POST | `/bulk` | `{ observationId, ranges: [...] }` — **replace all** atomically |
| GET | `/observation/:observationId` | All ranges for one observation |
| DELETE | `/:id` | Remove single range |

```json
POST /bulk
{ "observationId": "uuid",
  "ranges": [
    { "gender": "MALE", "minAgeYears": 18, "minValue": 13.0, "maxValue": 17.0, "criticalLow": 7.0, "criticalHigh": 20.0 },
    { "gender": "FEMALE", "minAgeYears": 18, "minValue": 12.0, "maxValue": 15.0, "criticalLow": 7.0, "criticalHigh": 20.0 },
    { "gender": null, "minAgeYears": 0, "maxAgeYears": 17, "minValue": 11.0, "maxValue": 13.0, "criticalLow": 7.0, "criticalHigh": 18.0 }
  ] }
```

### 3.5 Range lookup (service — consumed by Session 3 result entry)

`getApplicableRange(tenantId, observationId, gender, ageYears)` — live-verified matrix:

| Query | Result (HGB seed) |
|---|---|
| MALE, 30 | 13–17 (crit 7/20) |
| FEMALE, 25 | 12–15 (crit 7/20) |
| MALE, 10 | 11–13 child band (crit 7/18) |
| null, 45 | `null` (no universal HGB range configured) |

### 3.6 Seed

```bash
npx ts-node prisma/seed-lab-radio.ts <tenantId>
```
Live-verified: 10 departments, 3 investigations (LIPID ₹700 / BSF ₹120 / CBC ₹250 with DIAG-linked services), 11 observations, 7 ranges; second run skips. Not auto-hooked into activation — run manually per tenant (hospitals customize labs heavily).

---

## 4. Frontend integration guide

### 4.1 Investigation builder screen
- Left: department dropdown (`GET /lab-departments?active=true`, show TAT).
- Right: service picker (`GET /masters/service-items?search=…&categoryId=<DIAG>`) — the chosen service drives billing rate.
- Observations panel: search from `GET /observations`, drag-order → save via single `PUT /:id/observations` (full-state replace).

### 4.2 Range editor
- Grid: rows = gender (Any/M/F/O) × age band; edit then submit everything via `POST /reference-ranges/bulk` (replace-all).
- Server rejects inverted bounds — mirror min ≤ max client-side for instant feedback.

### 4.3 Print/preview
- `GET /investigations/:id/details` is exactly the report template model: ordered observations, units, decimal places, ranges per gender/age — one call, no joins client-side.

### 4.4 Error cheat-sheet
| Status | Meaning | UI |
|---|---|---|
| 400 | Non-lab service category · missing selectOptions/formula · inverted range bounds | Inline form error |
| 404 | Cross-tenant service/dept/observation/head user | "Record not found" |
| 409 | Duplicate `code` | Highlight code field |

---

## 5. Verification status

| Check | Result |
|---|---|
| Migration `phase_2_4_session1_lab_core` | ✅ applied |
| Seed (live dev DB) | ✅ 10 depts / 3 investigations / 11 observations / 7 ranges; idempotent |
| Investigation create (valid/invalid service) | ✅ unit (8 cases incl. category guard) |
| Observation assign/reorder | ✅ atomic replace + unknown-id 400 |
| Bulk ranges | ✅ replace-all + inverted-bound 400s |
| `getApplicableRange` | ✅ 7-case specificity matrix (unit) + live HGB lookups |
| `npm run test` | ✅ 24 suites · 233 passed · 1 todo (23 new) |
| `npm run build` | ✅ clean |

## 6. Not in this session (Sessions 2–4)

- **Session 2**: sample collection workflow (barcode, specimen tracking, outsourcing status).
- **Session 3**: result entry consuming `getApplicableRange` for H/L/critical flags + `formulaExpression` auto-calculation.
- **Session 4**: report verification pipeline (`InvestigationReportStatus` enum is already in schema: PENDING → IN_PROGRESS → VERIFIED → APPROVED/AMENDED) + print engine using `allowTemplates` + TAT breach alerts (`turnaroundHours`).