# Phase 2.2B — Doctor Setup Integration & Automation

> **Audience:** backend reviewers, QA, frontend team.
> **Modules:** `src/hospital/opd/appointments/` · `src/hospital/opd/billing/` · `src/hospital/masters/doctor-setup/` · `src/hospital/opd/patients/`
> **Migration:** `20261008065751_phase_2_2b_doctor_integration`

---

## 1. What we did

1. **Visit fee auto-calculation.** Booking an appointment now computes the consultation fee automatically — panel config → general config → doctor profile fallback, with **follow-up detection** ("Dr. Sharma: 7 days, 1 free visit, ₹0"). The fee engine result is stamped on `appointment.consultationFee` + `isFollowUpVisit`. Receptionists stop typing rates.
2. **Consultation auto-billing.** When an `OpdBill` is created for an appointment, a consultation line item is auto-added from `appointment.consultationFee` and linked to the `CONS → OPD` service (free-text fallback when not configured).
3. **Referral attribution end-to-end.** `ReferDoctor` now links at **patient registration** and **appointment booking** (appointment auto-inherits from patient). Every referred bill spawns a `ReferralCommission` (rate + PRO **snapshotted** at billing time) with a full settlement API for month-end payouts.
4. **Digital signature upload.** `POST/DELETE …/doctors/:id/signature` — PNG/JPG/SVG ≤ 2 MB, stored at `uploads/signatures/`, served at `/uploads/*`, old file auto-replaced.
5. **Doctor share report.** Visiting-consultant settlement: PAID bills → per-doctor consultation revenue × `doctorSharePercent`, with department and hospital totals.

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| Follow-up anchored at last **non-follow-up** visit | Anchoring at the *latest* visit lets chains renew forever (maxVisits=1 would grant infinite free visits). Anchor at the last paid visit → window is fixed, quota enforcement is exact. |
| Quota counts non-cancelled statuses (`BOOKED…COMPLETED`) | A merely-booked follow-up must consume quota, or patients double-book free visits. `CANCELLED`/`NO_SHOW` release it. |
| Commission stores **snapshots** (`commissionRate`, `proUserId`) | Masters get edited and PROs get reshuffled — month-end settlement must reflect the world *as it was at billing time*. |
| Commission hook never throws | A payout-record glitch must not roll back a patient's bill. Errors are logged, billing proceeds; records are idempotent per `billId`. |
| 0% commission → no record | Keeps the settlement queue clean; revisiting a doctor's rate later is a master edit, not a cleanup job. |
| System consultation line skips only the **rate check** | `rateEditable` guards *manual counter edits*. The fee engine is the authority for its own price — but gender/age/discount checks still run on the auto line. |
| Signature storage behind one util module | Local disk today, S3/Cloudinary tomorrow — swap `file-upload.util.ts`, zero caller changes. URL (`/uploads/signatures/<file>`) is all the DB stores. |
| Commissions controller bound **before** `ReferDoctorsController` | Express matches `@Get(':id')` greedily — without ordering, `/refer-doctors/commissions` would parse "commissions" as a UUID and 400. Ordering + code comments lock it in. |

---

## 3. What changed

### 3.1 Database

| Change | Detail |
|---|---|
| `Patient` | + `referDoctorId` (FK → `ReferDoctor`, `SetNull`) |
| `Appointment` | + `referDoctorId` (FK, `SetNull`), `isFollowUpVisit` (default `false`) |
| `ReferralCommission` (`referral_commissions`) | **New** — bill/patient/appointment links, `billAmount`, `commissionRate` + `commissionAmount` snapshots, `proUserId` snapshot, `status` (`PENDING`/`APPROVED`/`PAID`/`CANCELLED`), `settledAt`/`settledBy`/`notes` |
| `ReferDoctor` | + `referredPatients`, `referredAppointments`, `commissions` relations |
| `Hospital` | + `referralCommissions` relation |

### 3.2 Code

| Area | Change |
|---|---|
| `appointments/` | **New** `services/visit-fee-calculator.service.ts`; `book()` uses it (replaces flat-fee Rule 10); DTO +`referDoctorId`; repository now **persists** `priority`, `referredByDoctorName`, `referralNote` (previously dropped!), `referDoctorId`, `isFollowUpVisit`; response DTO surfaces both new fields |
| `patients/` | `CreatePatientDto` +`referDoctorId`; registration validates active refer doctor (`PATIENT_REFER_DOCTOR_NOT_FOUND`) |
| `billing/` | `generateBill` auto-adds consultation line (validated with `skipRateCheck`) + calls commission hook; `findConsultationService` repo lookup; module imports `DoctorSetupModule` |
| `doctor-setup/` | **New** referral-commissions stack (repo/service/controller/DTOs), `DoctorsController` (signature + share-report), `DoctorsService/Repository`, `DoctorShareReportService` |
| `common/utils/file-upload.util.ts` | **New** shared signature save/delete (type + size validation, unique names, traversal-safe delete) |
| `main.ts` | Serves `/uploads/*` statically; app typed as `NestExpressApplication` |

---

## 4. API reference (for testing)

Prefix **`/api`** · `Authorization: Bearer <hospital token>`

### 4.1 Book appointment (auto fee + referral)

```json
POST /api/opd/appointments
{
  "patientId": "uuid", "doctorProfileId": "uuid",
  "appointmentDate": "2026-10-08", "appointmentType": "WALK_IN",
  "visitType": "NEW_VISIT",
  "referDoctorId": "uuid (optional — inherited from patient otherwise)"
}
```
Response now carries `consultationFee` (engine-computed), `isFollowUpVisit`, `referDoctorId`. `404 OPD_APT_016` for unknown/inactive refer doctor.

### 4.2 Bill for appointment (auto consultation line + commission)

`POST /api/opd/billing` with `appointmentId` → response items start with the consultation line (`unitPrice` = appointment fee). If the appointment is referred, a `PENDING` commission now exists (§ 4.3).

### 4.3 Commissions — `/api/hospital/masters/refer-doctors/commissions`

| Method | Path | Notes |
|---|---|---|
| GET | `/` | Filters: `referDoctorId`, `proUserId`, `status`, `dateFrom`, `dateTo`, `page`, `limit`. Includes `referDoctor { name, code, mobile }` |
| GET | `/summary` | `{ byDoctor: […totalBills/totalBillAmount/totalCommission/pending/paid], byPro: […totalDoctorsManaged/totalCommission] }` |
| PATCH | `/:id/settle` | `{ "status": "APPROVED"|"PAID"|"CANCELLED", "notes"?: "…" }` — sets `settledAt`/`settledBy`; 400 if already `PAID` |
| POST | `/bulk-settle` | `{ "commissionIds": ["…"], "status": "PAID" }` → `{ updated: n }` |

```json
// Commission record
{
  "billId": "…", "billAmount": "2000.00",
  "commissionRate": "10.00", "commissionAmount": "200.00",
  "proUserId": "…", "status": "PENDING",
  "referDoctor": { "name": "Dr. Amit Shah", "mobile": "9876500001" }
}
```

### 4.4 Digital signature — `/api/hospital/masters/doctors/:doctorProfileId/signature`

| Method | Notes |
|---|---|
| POST | `multipart/form-data`, field **`signature`** (PNG/JPG/SVG ≤ 2 MB) → updated profile with `digitalSignatureUrl: "/uploads/signatures/<id>_<ts>.png"`; old file deleted |
| DELETE | Removes file + nulls the URL → `{ message }` |

Errors: 400 invalid type/oversize · 404 doctor not in tenant.

### 4.5 Share report — `GET /api/hospital/masters/doctors/share-report`

Query: `dateFrom`, `dateTo` (default = month-to-date), `doctorProfileId?`, `departmentId?`

```json
{
  "period": { "dateFrom": "…", "dateTo": "…" },
  "doctors": [
    {
      "doctorId": "…", "doctorName": "Dr. Sharma A",
      "department": "Cardiology", "specialization": "Interventional Cardiology",
      "totalAppointments": 42, "grossRevenue": 21000,
      "sharePercent": 70, "shareAmount": 14700, "hospitalRetained": 6300
    }
  ],
  "departmentTotals": [ { "department": "Cardiology", "grossRevenue": 21000, "shareAmount": 14700, "hospitalRetained": 6300 } ],
  "hospitalTotals": { "grossRevenue": 21000, "shareAmount": 14700, "hospitalRetained": 6300, "totalAppointments": 42 }
}
```
Only **PAID** bills with linked appointments count.

---

## 5. Workflows

### 5.1 The follow-up day-8 test (task scenario)
```
Day 1:  POST /appointments            → fee 500, isFollowUpVisit=false
Day 5:  POST /appointments            → fee 0,  isFollowUpVisit=true   ✅
Day 6:  POST /appointments            → fee 500 (quota consumed)
— or —
Day 8:  POST /appointments            → fee 500 (window expired)
```

### 5.2 Referral chain (registration → payout)
```
POST /refer-doctors            { name, mobile, commissionPercent: 10, proUserId }
POST /patients                 { …, referDoctorId }        → patient linked
POST /appointments             { patientId, doctorProfileId } → auto-inherits referDoctorId
POST /opd/billing              { patientId, appointmentId, items: [...] }
                               → commission PENDING ₹200 (10% of ₹2000) created
Month-end:
GET  /refer-doctors/commissions/summary          → per-doctor & per-PRO totals
POST /refer-doctors/commissions/bulk-settle      → mark PAID in one shot
```

### 5.3 Consultant monthly settlement
```
GET /doctors/share-report?dateFrom=2026-10-01&dateTo=2026-10-31
→ accounts pays shareAmount, hospital keeps hospitalRetained
```

---

## 6. Frontend integration guide

### 6.1 Booking form
- Show the returned `consultationFee` + a **green "Follow-up — fee waived" badge** when `isFollowUpVisit`.
- Refer doctor picker: `GET /refer-doctors?isActive=true&search=…`; leave empty → patient's doctor auto-applies.
- `referredByDoctorName` auto-fills from the selected refer doctor (display/print only).

### 6.2 Bill preview
- The consultation line arrives first in `items` — render it pinned/read-only (rate is engine-owned; counter edits are rejected server-side anyway).
- Referred bills: after creation, offer a shortcut to `GET /refer-doctors/commissions?referDoctorId=…`.

### 6.3 PRO / accounts screens
- **PRO dashboard**: `GET /commissions/summary` → `byPro` cards; drill into `GET /commissions?proUserId=…&status=PENDING`.
- **Settlement queue**: `GET /commissions?status=PENDING` → select rows → `POST /bulk-settle { status: 'PAID' }`. `PAID` rows are immutable (400) — grey them out.
- **Signature widget**: upload → preview directly from the returned `/uploads/…` URL (same origin); DELETE to clear.

### 6.4 Share report page
- Default view = month-to-date; department filter dropdown from `GET /clinical-departments?active=true`.
- Sort is already `grossRevenue` desc; totals row = `hospitalTotals`.

---

## 7. Verification status

| Check | Result |
|---|---|
| Migration `phase_2_2b_doctor_integration` | ✅ applied |
| Follow-up scenario tests | ✅ 9 calculator tests (window, quota, panel, emergency precedence) |
| Commission on bill finalization | ✅ hook tested (snapshots, idempotency, 0%-skip, never-throws) |
| Signature upload with real PNG | ✅ save/replace/delete/invalid-type/oversize verified on disk |
| Share report math + filter merge bug | ✅ found & fixed (both filters overwrote each other) |
| `npm run test` | ✅ 17 suites · 145 passed · 1 todo (24 new tests) |
| `npm run build` | ✅ clean |

## 8. Not in this phase (next steps)

- **OPD token/queue** can now consume `isFollowUpVisit` for priority handling.
- Commission on **IPD bills** (model is ready; hook is OPD-only today).
- S3/Cloudinary storage backend for signatures (swap `file-upload.util.ts`).
- Refer-doctor **login/portal** (self-service statement view) — data model already supports it.
- Auto-create the `CONS → OPD` consultation *service* during tenant seed (currently the hospital creates it; free-text fallback covers gaps).