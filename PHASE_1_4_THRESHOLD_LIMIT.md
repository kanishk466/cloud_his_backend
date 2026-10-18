# Phase 1.4 — Threshold Limit Master (Panel Rate Caps for IPD)

> **Audience:** backend reviewers, QA, frontend team.
> **Module:** `src/hospital/masters/threshold/` · **Migration:** `20261008094251_phase_1_4_threshold_limit_and_ipd_admission` (shared with IPD Admission)

---

## 1. What we did

A per-panel **credit ceiling** for running IPD bills: when a panel patient's bill approaches (or crosses) the allowed maximum, the system shifts through `OK → ALERT → WARNING → BLOCKED`. Limits can be **panel-wide** (general) or **overridden per room type** (e.g., a TPA caps ICU stays differently from general-ward stays).

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| `roomTypeId = NULL` = general panel limit | One row covers the whole panel; room-specific rows override it only where negotiated. Resolution order: room-specific → general. |
| Two-level escalation (`alertAtPercent` vs breach action) | Billing counters need an early heads-up (default 80%) *before* the hard stop at 100% — prevents mid-procedure surprises. |
| `SOFT` vs `HARD` breach | SOFT panels (govt schemes, negotiated credit) allow overshoot with a warning flag; HARD panels (strict TPAs) must block charge entry. Enforcement point is the **checker**, callers decide. |
| NULL-duplicate guard in service | Postgres unique indexes don't dedupe NULLs — the service does find-then-write so a panel can't end up with two general limits (same pattern as visit configs). |
| `ThresholdCheckService` exported | IPD billing (next phase) calls it at every charge entry; admission calls it at check-in (informational). One engine, many consumers. |

---

## 3. API reference

Prefix **`/api`** · `Authorization: Bearer <hospital token>`

### Thresholds — `/api/hospital/masters/thresholds`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Validate panel + roomType tenant (404); 409 duplicate (panel + roomType combo) |
| GET | `/?active=true` | Includes `panel { panelCode, panelName }`, `roomType { code, name }` |
| GET | `/panel/:panelId` | General + room-specific rows for one panel |
| GET / PATCH / DELETE | `/:id` | Soft delete; PATCH can't change panel/roomType identity |

**POST body (general panel limit)**
```json
{ "panelId": "uuid", "maxAmount": 50000, "alertAtPercent": 80, "actionOnBreach": "HARD" }
```
Room-specific override: add `"roomTypeId": "uuid"`.

### The checker (service-level, consumed by IPD flows)

`checkThreshold(tenantId, panelId, roomTypeId, currentBillTotal)` →

| Condition | Result |
|---|---|
| `panelId` null | `{ status: 'OK', message: 'Self-pay patient, no threshold' }` |
| No matching row | `{ status: 'OK', message: 'No threshold configured' }` |
| usage < `alertAtPercent` (80) | `{ status: 'OK', usagePercent }` |
| 80 ≤ usage < 100 | `{ status: 'ALERT', message: 'Approaching threshold…' }` |
| usage ≥ 100, SOFT | `{ status: 'WARNING', message: '…Proceed with caution.' }` |
| usage ≥ 100, HARD | `{ status: 'BLOCKED', message: '…Charges are blocked.' }` |

`getRoomRateCap(tenantId, panelId, roomTypeId)` → `{ roomTypeName, dailyRate, maxAmount, alertAtPercent }` (room type's per-day rate + applicable cap).

**Live-verified:** ₹30,000 → `OK` (60%) · ₹42,000 → `ALERT` (84%) · ₹55,000 → `BLOCKED` (110%) · self-pay → `OK`.

---

## 4. Frontend integration

- **Threshold setup**: panel picker (`GET /panels`) + optional room-type picker (`GET /room-types`); the general row shows `roomType: null` — render as "All room types".
- **Charge-entry widget** (next phase): poll the checker result embedded by IPD billing; render 🟢 OK → 🟡 ALERT → 🟠 WARNING → 🔴 BLOCKED banners from `status` + `usagePercent`.

## 5. Verification

| Check | Result |
|---|---|
| Migration | ✅ applied |
| Unit tests (`threshold-check.service.spec.ts`) | ✅ 8 tests — every branch incl. room-cap lookup |
| `npm run test` | ✅ 22 suites · 210 passed |
| `npm run build` | ✅ clean |
