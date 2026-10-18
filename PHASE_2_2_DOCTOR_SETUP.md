# Phase 2.2 — Doctor Setup (Clinical Departments, Specializations, Visit Config, Refer Doctors & PRO)

> **Audience:** backend reviewers, QA, and the frontend team building Doctor Setup / OPD counter screens.
> **Module:** `src/hospital/masters/doctor-setup/` · **Migration:** `20261007130934_phase_2_2_doctor_setup`

---

## 1. What we did

1. **Clinical Departments** — medical wings (Cardiology, Orthopaedics, Paediatrics), separate from the existing admin `Department` master (HR/Accounts/Maintenance). Full CRUD, tenant-scoped, soft delete.
2. **Specializations** — sub-specialties inside a clinical department (Cardiology → Interventional / Pediatric Cardiology), with a dropdown endpoint for dynamic UIs.
3. **Doctor OPD Visit Configs** — per-doctor follow-up rules, with a **General (cash) config** plus optional **per-panel overrides**, and a ready-to-use **fee calculator**: "Dr. Sharma: 7-day window, 1 free visit, ₹0" — day 8 bills the full fee again.
4. **Refer Doctors & PRO mapping** — external clinic doctors who send patients, with bank/PAN/commission fields for incentive settlement, each optionally owned by a **PRO** (hospital marketing user).
5. **`DoctorProfile` enhanced** — links to clinical department + specialization, digital signature URL, and `doctorSharePercent` (payout engine input).

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| Separate `ClinicalDepartment` from admin `Department` | OPD scheduling, doctor mapping and clinical reports need medical wings; admin departments serve HR/ops. Mixing them pollutes both. |
| General config via `panelId = NULL` + **upsert** API | Postgres unique indexes treat NULLs as distinct — the DB constraint alone can't stop duplicate general configs. The service does find-then-write (one general + one per panel per doctor), so `POST` is safely idempotent. |
| Fee resolution: panel config → general config → `DoctorProfile.consultationFee` | A doctor with no rules configured must still be billable on day 1; panels get their negotiated rates when configured. |
| `lastVisitDate` + `visitCount` as calculator inputs (not internal queries) | The caller (appointments/billing, next phase) already knows the patient's history. Pure-function calculation is testable, fast, and reusable. |
| Refer doctor `mobile` unique per tenant | Real-world dedupe key for external doctors — names repeat, mobiles don't. 409 on duplicates. |
| PRO is a `HospitalUser` link (`SetNull`), not free text | PRO targets/incentives are computed per user later; the link survives PRO reassignment history (`PATCH …/assign-pro`) and user soft-delete doesn't break the refer-doctor record. |
| `doctorSharePercent` default 0 | Payout/share reporting (next billing phases) reads it directly; zero means "not configured" — never NULL-handling bugs. |
| Delete guards on departments/specializations | A department with linked doctors/specializations can't vanish (400 with counts) — appointment history stays explainable. |

---

## 3. What changed

### 3.1 Database

| Change | Detail |
|---|---|
| `ClinicalDepartment` (`clinical_departments`) | **New.** `name`, `code` (unique per tenant), `description?`, soft delete. |
| `Specialization` (`specializations`) | **New.** FK → clinical department (cascade), `name`, `code` (unique per tenant), soft delete. |
| `DoctorOpdVisitConfig` (`doctor_opd_visit_configs`) | **New.** `firstVisitFee`, `followUpDays` (7), `followUpMaxVisits` (1), `followUpFee` (₹0), `emergencyFee?`, `panelId?` (NULL = general). |
| `ReferDoctor` (`refer_doctors`) | **New.** Contact + clinic + bank/PAN + `commissionPercent` + `proUserId`; `mobile` unique per tenant. |
| `DoctorProfile` | **+** `clinicalDepartmentId?`, `specializationId?` (both `SetNull`), `digitalSignatureUrl?`, `doctorSharePercent` (0). |
| `Hospital` / `HospitalUser` / `Panel` | Relation arrays added (`assignedReferDoctors`, `doctorOpdVisitConfigs`, …). |

### 3.2 Module `src/hospital/masters/doctor-setup/` (registered in `masters.module.ts`)

4 controllers / services / repositories + DTOs, following the Phase 1.2/2.1 repository pattern with `@CurrentTenant()` isolation.

---

## 4. API reference (for testing)

Prefix **`/api`** · `Authorization: Bearer <hospital token>` · Swagger: `/api/docs`

### 4.1 Clinical Departments — `/api/hospital/masters/clinical-departments`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | 409 on duplicate `code` |
| GET | `/?active=true` | Includes `_count.specializations` & `_count.doctorProfiles` |
| GET / PATCH / DELETE | `/:id` | DELETE → 400 while specializations/doctors linked (counts in message) |

```json
{ "name": "Cardiology", "code": "CARD", "description": "Heart & vascular wing" }
```

### 4.2 Specializations — `/api/hospital/masters/specializations`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | `clinicalDepartmentId` must exist in tenant (404); 409 dup code |
| GET | `/?active=true` | With parent department + doctor count |
| GET | `/by-department/:deptId?active=true` | **Dropdown source** |
| GET / PATCH / DELETE | `/:id` | DELETE → 400 while doctors linked |

```json
{ "clinicalDepartmentId": "uuid-CARD", "name": "Interventional Cardiology", "code": "INT_CARD" }
```

### 4.3 Doctor Visit Configs — `/api/hospital/masters/doctor-visit-configs`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | **Upsert** → `{ action: "created" \| "updated", config }` |
| GET | `/?active=true` | All configs with doctor + panel names |
| GET | `/doctor/:doctorProfileId` | `{ doctorProfileId, general, panelConfigs[] }` |
| GET | `/calculate?doctorProfileId=…&panelId=…&lastVisitDate=…&visitCount=…` | **Fee helper** |
| GET / PATCH / DELETE | `/:id` | PATCH can't change doctor/panel identity |

**Upsert body (general / cash config)**
```json
{
  "doctorProfileId": "uuid",
  "firstVisitFee": 500,
  "followUpDays": 7,
  "followUpMaxVisits": 1,
  "followUpFee": 0,
  "emergencyFee": 800
}
```
Panel override: same body + `"panelId": "uuid"`. 404 on cross-tenant doctor/panel; 409 on race-duplicate.

**Fee helper — `GET /calculate`**

| Scenario | Response |
|---|---|
| No last visit / window expired (day 8) | `{ isFollowUp: false, consultationFee: 500, source: "GENERAL_CONFIG" }` |
| Last visit 5 days ago, 0 follow-ups used | `{ isFollowUp: true, consultationFee: 0, source: "GENERAL_CONFIG", configId, followUpDays: 7, followUpMaxVisits: 1 }` |
| Panel patient with panel rule | Panel's `followUpFee`/`firstVisitFee`, `source: "PANEL_CONFIG"` |
| Doctor with no config at all | `{ isFollowUp: false, consultationFee: <profile.consultationFee>, source: "DOCTOR_PROFILE" }` |

### 4.4 Refer Doctors — `/api/hospital/masters/refer-doctors`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | `code` optional → auto `REF-0001…`; 409 dup mobile; `proUserId` validated (404) |
| GET | `/?search=…&proUserId=…&city=…&specialization=…&isActive=true` | Filtered list incl. `proUser { id, firstName, lastName, email, mobile }` |
| GET / PATCH / DELETE | `/:id` | Soft delete |
| PATCH | `/:id/assign-pro` | Body `{ "proUserId": "uuid" }` — reassign marketing ownership |

```json
{
  "name": "Dr. Amit Shah",
  "clinicHospitalName": "Shah Medicare, Civil Lines",
  "mobile": "9876500001",
  "specialization": "General Physician",
  "city": "Nagpur",
  "commissionPercent": 10,
  "panNumber": "ABCDE1234F",
  "ifscCode": "HDFC0001234",
  "proUserId": "uuid-of-marketing-exec"
}
```

---

## 5. Typical workflows

### 5.1 Doctor onboarding
```
POST /clinical-departments        { name: "Cardiology", code: "CARD" }
POST /specializations             { clinicalDepartmentId, name: "Interventional Cardiology", code: "INT_CARD" }
(existing doctor profile) PATCH via user-management / doctor module → set clinicalDepartmentId + specializationId
POST /doctor-visit-configs        { doctorProfileId, firstVisitFee: 500, followUpDays: 7, followUpMaxVisits: 1, followUpFee: 0 }
POST /doctor-visit-configs        { doctorProfileId, panelId: <TPA-1>, firstVisitFee: 400, followUpFee: 100 }
```

### 5.2 OPD counter — "is this a follow-up?" (ready for appointment integration)
```
GET /doctor-visit-configs/calculate?doctorProfileId=…&lastVisitDate=2026-10-03&visitCount=0
→ { isFollowUp: true, consultationFee: 0 }   → bill the consultation line at ₹0
```

### 5.3 Marketing / PRO ops
```
POST /refer-doctors               → add external doctor, assign PRO
GET  /refer-doctors?proUserId=…   → a PRO's portfolio
PATCH /refer-doctors/:id/assign-pro → territory reshuffle
```

---

## 6. Frontend integration guide

### 6.1 Doctor profile form — cascading dropdowns
```ts
const depts = await api.get('/api/hospital/masters/clinical-departments?active=true');
const specs = await api.get(
  `/api/hospital/masters/specializations/by-department/${deptId}?active=true`
);
```

### 6.2 Visit-config screen
- Load `GET /doctor-visit-configs/doctor/:doctorProfileId` → render the **General** card + one card per panel config.
- Save button → always `POST /` (upsert) — no create/update branching; show `action` in a toast ("Rule updated" vs "Rule created").
- Numeric inputs: fees ≥ 0 (2 decimals), `followUpDays` 0–365, `followUpMaxVisits` 0–100.

### 6.3 OPD counter follow-up banner (client-side pre-check)
```ts
const { data } = await api.get('/api/hospital/masters/doctor-visit-configs/calculate', {
  params: { doctorProfileId, panelId, lastVisitDate, visitCount },
});
// isFollowUp → green banner "Follow-up visit — fee ₹0"
// source === 'DOCTOR_PROFILE' → hint: "No visit rules configured for this doctor"
```
> The authoritative enforcement will happen server-side in the appointment/billing phase — this helper just keeps the UI honest.

### 6.4 Refer doctor directory
- Table columns: `code`, `name`, `clinicHospitalName`, `city`, `commissionPercent`, `proUser.firstName + lastName`.
- Filters map 1:1 to query params (`search`, `city`, `specialization`, `proUserId`, `isActive`).
- `assign-pro` as a row action opening a staff-user picker (users from `GET /api/hospital/users`).

### 6.5 Error cheat-sheet
| Status | Meaning | UI |
|---|---|---|
| 400 | Delete blocked (linked children) / validation | Toast `response.data.message` |
| 404 | Cross-tenant or missing doctor / panel / PRO / department | "Record not found" |
| 409 | Duplicate `code` / `mobile` / config | Highlight the field |

---

## 7. Verification status

| Check | Result |
|---|---|
| `npx prisma migrate dev --name phase_2_2_doctor_setup` | ✅ applied |
| `npm run test` | ✅ 14 suites · 121 passed · 1 todo (30 new tests: dup codes, delete guards, upsert create/update, NULL-panel guard, full fee-calculator matrix, PRO validation) |
| `npm run build` | ✅ clean |

## 8. Not in this phase (next steps)

- **Appointment integration**: auto-call `calculateVisitFee` on OPD visit creation and feed the fee into billing.
- **Referral attribution**: link `Patient`/`Appointment` to `ReferDoctor` + commission settlement reports per PRO.
- **Digital signature upload** endpoint (field is ready; file pipeline pending).
- **Doctor share report** using `doctorSharePercent`.