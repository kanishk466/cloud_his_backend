# IPD Admission Module — Admit / Transfer / Discharge Workflow

> **Audience:** backend reviewers, QA, frontend team.
> **Module:** `src/hospital/ipd/admission/` (parent `src/hospital/ipd/ipd.module.ts`, registered in `HospitalModule`)
> **Migration:** `20261008094251_phase_1_4_threshold_limit_and_ipd_admission` (shared with Phase 1.4)

---

## 1. What we did

The full IPD lifecycle, driving the Phase 2.3 bed state machine:

```
ADMITTED ──assign-bed──▶ bed OCCUPIED
    │──transfer-bed──▶ old bed HOUSEKEEPING · new bed OCCUPIED
    │──initiate-discharge──▶ DISCHARGE_ORDERED · bed DISCHARGE_PENDING
    │──complete-discharge──▶ DISCHARGED · bed HOUSEKEEPING
    └──cancel (bed-less only)──▶ CANCELLED
```

Admission numbers auto-generate as `IPD-{YYYY}-{00001}` via `TenantSequence`.

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| Bed moves go **only** through `BedStatusService` | The state machine + audit trail + DB-level `isCurrent` uniqueness stay authoritative — IPD never writes `BedStatus` rows directly. |
| Transfer uses the **legal** path `OCCUPIED → DISCHARGE_PENDING → HOUSEKEEPING` | A straight `OCCUPIED → HOUSEKEEPING` jump is an invalid transition; the two-step path keeps every bed's history lawful and auditable. |
| Gender-ward check on **every** assignment/transfer | Govt-hospital compliance (male/female wards) can't be bypassed via transfer even if admission snuck through. `PEDIATRIC` blocks adults when age is known. |
| Cancel restricted to **bed-less** admissions | Once a patient occupies a bed, the stay is real — the only honest exit is the discharge workflow (keeps BOR + history correct). |
| `DISCHARGE_ORDERED` as an intermediate state | Real hospitals have a gap between "doctor orders discharge" and "patient leaves" (final billing, pharmacy returns). The bed sits in `DISCHARGE_PENDING` — visible-but-not-free on the nursing grid. |
| `expectedDischargeDate` is `@db.Date` (day precision) | Per spec — a 24h daycare cap truncates to the calendar day. Discharge planning in HIS is day-granular. |

---

## 3. Schema — `IpdAdmission` (`ipd_admissions`)

`admissionNo` (unique/tenant) · `patientId` · `doctorProfileId` · `bedId?` · `panelId?` · `referDoctorId?` · `admissionType` (`EMERGENCY/PLANNED/TRANSFER/DAYCARE`) · `provisionalDiagnosis` · `expectedDischargeDate` · discharge block (`dischargeDate/Type/Summary/By`) · `advancePaid` · `provisionalTotal` · threshold flags · `status` (`ADMITTED/DISCHARGE_ORDERED/DISCHARGED/CANCELLED`) · `isActive`.

`BedStatus.ipdAdmissionId` is now a **real relation** (was a placeholder String) → each bed's live status points at its admission.

---

## 4. API reference

Prefix **`/api`** · Guard: `HospitalJwtAuthGuard` · `@CurrentTenant()` + `@CurrentUser('userId')` for audit.

### Lifecycle — `/api/ipd/admissions`

| Method | Path | Body | Effect |
|---|---|---|---|
| POST | `/` | `CreateAdmissionDto` | Creates `ADMITTED`; assigns bed immediately if `bedId` sent; threshold check logged if `panelId`; DAYCARE → expected discharge = +24h |
| POST | `/:id/assign-bed` | `{ bedId }` | Bed must be AVAILABLE/RESERVED + gender-compatible → OCCUPIED w/ admission link |
| POST | `/:id/transfer-bed` | `{ newBedId, reason? }` | Old → HOUSEKEEPING (legal 2-step), new → OCCUPIED |
| POST | `/:id/initiate-discharge` | `{ dischargeType: NORMAL\|LAMA\|TRANSFERRED\|EXPIRED, dischargeSummary? }` | `DISCHARGE_ORDERED` + bed `DISCHARGE_PENDING` |
| POST | `/:id/complete-discharge` | — | `DISCHARGED` + bed `HOUSEKEEPING` (housekeeping queue picks it up) |
| POST | `/:id/cancel` | `{ reason }` | Only `ADMITTED` **without** a bed → `CANCELLED` |

### Reads

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Filters: `status`, `patientId`, `doctorProfileId`, `panelId`, `dateFrom`, `dateTo`, `page`, `limit` |
| GET | `/active` | Shorthand: `ADMITTED` + `DISCHARGE_ORDERED` |
| GET | `/:id` | Full detail: patient, doctor (+department), bed → room → roomType (rates/flags), panel |

**Errors:** 400 wrong-status transitions / bed unavailable / gender mismatch / cancel-with-bed · 404 cross-tenant admission/bed/patient/doctor/panel/refer-doctor.

---

## 5. Live verification (dev DB, real services)

| Scenario | Result |
|---|---|
| Male patient → `FEMALE_ONLY` bed | ✅ `400 Bed PVT-F-1/01 is in a FEMALE_ONLY ward — patient is MALE` |
| Cancel bed-less admission | ✅ `CANCELLED` |
| Admit with `bedId` | ✅ `IPD-2026-00002` ADMITTED, bed `OCCUPIED` |
| Transfer GW-1/01 → GW-1/02 | ✅ old `HOUSEKEEPING`, new `OCCUPIED`, bed status linked to admission |
| Initiate → complete discharge | ✅ `DISCHARGE_ORDERED`/`DISCHARGE_PENDING` → `DISCHARGED`/`HOUSEKEEPING` |
| DAYCARE admit | ✅ `expectedDischargeDate` ≈ next calendar day (per `@db.Date` spec) |
| Temp hospital cleanup | ✅ removed (Restrict-FK order handled) |

| Suite check | Result |
|---|---|
| `npm run test` | ✅ 22 suites · 210 passed (26 new: workflow + threshold) |
| `npm run build` | ✅ clean |

---

## 6. Frontend integration

- **Admission form**: patient search → doctor picker → optional bed grid (`GET /masters/rooms/:id/occupancy` shows only AVAILABLE/RESERVED as selectable) → panel picker. `admissionType=DAYCARE` shows the auto 24h expected discharge.
- **Ward census board**: `GET /ipd/admissions/active` — cards grouped by ward; actions per card = transfer / initiate-discharge, enabled strictly by `status`.
- **Discharge counter**: `initiate-discharge` (doctor summary) → billing clearances → `complete-discharge` button appears; bed then shows in `GET /masters/ward-room/housekeeping-queue`.
- Mirror server rules client-side: hide assign for non-ADMITTED, hide cancel once a bed exists, filter bed grid by patient gender vs room gender.

## 7. Not in this phase (next steps)

- **IPD charging/billing**: room rent × days from `RoomType.defaultRate` + `nursingCharge`, deposit (`advancePaid`) adjustment, and `ThresholdCheckService` enforcement at every charge entry (engine is ready).
- **Inter-ward transfer history report** (audit rows already exist in `bed_statuses`).
- **LAMA/expired special billing rules** per `dischargeType`.
- **HousekeepingModule** under `IpdModule` parent (queue endpoint already shipped in Phase 2.3).