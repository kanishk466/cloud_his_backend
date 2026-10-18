# Phase 2.3 — Ward, Room & Bed Setup (IPD Foundation)

> **Audience:** backend reviewers, QA, frontend team building IPD/bed-management screens.
> **Module:** `src/hospital/masters/ward-room/` · **Migration:** `20261008074513_phase_2_3_ward_room_bed`
> **Foundation for:** Threshold Limit (Phase 1.4) and IPD Packages (Phase 3.2).

---

## 1. What we did

1. **3-tier bed hierarchy** — `RoomType` (General Ward, ICU, Private…) → `Room` (GW-1, ICU-2, PVT-301) → `Bed` (GW-1/01 … GW-1/20), with auto-generated `bedIdentifier`.
2. **Bed status state machine** — `AVAILABLE → RESERVED → OCCUPIED → DISCHARGE_PENDING → HOUSEKEEPING → AVAILABLE` (+ `MAINTENANCE`, `OUT_OF_SERVICE`), enforced server-side with a full `BedStatus` audit trail (`isCurrent` marks the live row).
3. **BOR dashboard** — real-time Bed Occupancy Rate, hospital-wide + per room type + per gender ward; `isCount=false` beds (recovery stretchers) excluded from both sides of the ratio.
4. **Gender wards** — `ANY | MALE_ONLY | FEMALE_ONLY | PEDIATRIC` on rooms, with a gender-safe room list for IPD admission (exact match + `ANY`).
5. **Special flags on room types** — `isEmergency` (bypass admission wizard), `isDaycare` (24hr cap), `isDialysis` (session billing), `isCount` (BOR inclusion), plus `defaultRate` + `nursingCharge` per day.
6. **Bed amenities** — amenity master + many-to-many room mapping (atomic replace), and a "rooms having ALL these amenities" finder for admission triage.
7. **Day-1 seed** — 11 room types + 9 amenities auto-seeded on hospital activation (idempotent).

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| `BedStatus` rows double as **current state + history** (`isCurrent` flag) | One table, zero data duplication. The task's `Bed.currentStatus` 1:1 relation needs a separate FK Prisma can't infer — the flag achieves the same guarantee (one live row per bed, closed/opened in a single transaction). |
| State machine enforced in the **service**, not the UI | Nursing dashboards can be bypassed (API calls). `INVALID_STATUS_TRANSITION` with the allowed list in `details` keeps every bed's lifecycle explainable and auditable — a legal requirement in hospital NABH audits. |
| Transition = close old row + open new row **in one transaction** | A bed can never have zero or two "current" statuses, even under concurrent nursing-station clicks. |
| `OCCUPIED`/`RESERVED` require a tenant-valid `patientId` | Beds occupied by ghosts break BOR and discharge flows. Patient link is cleared automatically on non-patient statuses. |
| Delete guards everywhere | Occupied/reserved bed → `409 BED_DELETE_BLOCKED`; room with beds → 400; room type with rooms → 400; mapped amenity → 400. Physical layout can't vanish under live patients. |
| Bulk generator skips duplicates instead of failing | Ward setup is iterative — re-running "create beds 01–20" after adding 5 must create 15 new and report 5 skipped, not blow up. |
| Amenities as master + M:N (not booleans on Room) | "Find me a private room with AC and TV" (`by-amenity`) is impossible with scattered boolean columns. The 5 built-in flags (`hasAC`…) stay for quick display; the M:N powers search. |
| BOR counts only `isCount=true` beds on **both** sides | Recovery-room stretchers would otherwise dilute the KPI (occupied but not countable) or inflate capacity. |
| Seed skips when **any** room type/amenity exists | Hospitals customize — a re-seed must never clobber their setup. |

---

## 3. API reference (for testing)

Prefix **`/api`** · `Authorization: Bearer <hospital token>` · All routes tenant-scoped via `@CurrentTenant()`.

### 3.1 Room Types — `/api/hospital/masters/room-types`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | 409 dup `code` |
| GET | `/?active=true` | Includes `_count.rooms`, sorted by `sortOrder` |
| GET | `/bor-eligible` | Only `isCount=true` types (for BOR widgets) |
| GET / PATCH / DELETE | `/:id` | DELETE → 400 while rooms linked |

```json
{ "name": "Intensive Care Unit", "code": "ICU", "isEmergency": true,
  "isCount": true, "defaultRate": 8000, "nursingCharge": 1500, "sortOrder": 5 }
```

### 3.2 Rooms — `/api/hospital/masters/rooms`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | `roomTypeId` tenant-validated (404); 409 dup `roomNumber` |
| GET | `/?roomTypeId=…&gender=MALE_ONLY&floor=1st&wing=East&search=GW&isActive=true` | With `roomType` + `_count.beds` |
| GET | `/by-amenity?amenities=AC,TV` | Rooms having **ALL** listed amenity codes |
| GET | `/by-gender/:gender` | `gender` + `ANY` rooms (IPD admission safety) |
| GET | `/:id/occupancy` | Room + live bed grid: `{ totalBeds, occupiedBeds, availableBeds, reservedBeds, beds[{ bedIdentifier, status, patientId }] }` |
| PUT | `/:roomId/amenities` | `{ "amenityIds": ["uuid", …] }` — atomic replace; 400 unknown ids |
| PATCH / DELETE | `/:id` | DELETE → 400 while beds linked |

### 3.3 Beds — `/api/hospital/masters/beds`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | `{ roomId, bedNumber: "01" }` → `bedIdentifier = "GW-1/01"` + initial `AVAILABLE` status; 409 dup |
| POST | `/bulk` | `{ roomId, startNumber: 1, endNumber: 20, prefix?: "A" }` → `{ created: 20, skipped: 0, errors: [] }` |
| GET | `/?roomId=…&roomTypeId=…&status=OCCUPIED&gender=FEMALE_ONLY` | `status` filters the bed's **current** status |
| DELETE | `/:id` | 409 `BED_DELETE_BLOCKED` when `OCCUPIED`/`RESERVED` |

### 3.4 Bed Status — `/api/hospital/masters/beds/:bedId/status`

**POST body**
```json
{ "status": "OCCUPIED", "patientId": "uuid", "reason": "Admission via ER" }
```

**200**
```json
{
  "bedId": "…", "bedIdentifier": "GW-1/01",
  "previousStatus": "AVAILABLE", "currentStatus": "OCCUPIED",
  "patientId": "…", "effectiveFrom": "…"
}
```

**400 invalid transition** (e.g., `OCCUPIED → AVAILABLE`, must pass through `DISCHARGE_PENDING → HOUSEKEEPING`):
```json
{ "code": "INVALID_STATUS_TRANSITION",
  "message": "Cannot move bed GW-1/01 from OCCUPIED to AVAILABLE",
  "details": { "currentStatus": "OCCUPIED", "allowedTransitions": ["DISCHARGE_PENDING"] } }
```

`GET /:bedId/status-history` → full audit trail, newest first.

### 3.5 Amenities — `/api/hospital/masters/bed-amenities`

Full CRUD. DELETE is a **hard delete** (model has no `deletedAt`), blocked (400) while mapped to rooms — prefer `PATCH { "isActive": false }` to retire.

### 3.6 Housekeeping Queue — `GET /api/hospital/masters/ward-room/housekeeping-queue`

Auto-worklist for the housekeeping team — every bed whose **current** status is `HOUSEKEEPING`, oldest pending first (FIFO):

```json
{
  "total": 2,
  "items": [
    {
      "bedId": "…", "bedIdentifier": "GW-1/01", "roomNumber": "GW-1",
      "floor": "1st", "wing": "East", "gender": "MALE_ONLY",
      "roomType": { "id": "…", "name": "General Ward", "code": "GW" },
      "pendingSince": "2026-10-08T08:00:00.000Z",
      "reason": "Deep cleaning", "reportedBy": "user-uuid"
    }
  ]
}
```
Completing a task = `POST /masters/beds/:bedId/status { "status": "AVAILABLE" }` (state machine enforces the legal path).

### 3.7 BOR Dashboard — `GET /api/hospital/masters/ward-room/bor-dashboard`

```json
{
  "totalBeds": 150, "countableBeds": 140,
  "occupiedBeds": 98, "availableBeds": 35, "reservedBeds": 7,
  "borPercent": 70.0,
  "byRoomType": [
    { "roomType": "General Ward", "total": 60, "occupied": 52, "bor": 86.7 },
    { "roomType": "ICU", "total": 10, "occupied": 8, "bor": 80.0 }
  ],
  "byGender": [
    { "gender": "MALE_ONLY", "total": 40, "occupied": 35 },
    { "gender": "FEMALE_ONLY", "total": 40, "occupied": 28 },
    { "gender": "ANY", "total": 60, "occupied": 35 }
  ]
}
```

---

## 4. Workflows

### 4.1 Ward setup (one-time, ~2 minutes with seeds)
```
(activation)              → 11 room types + 9 amenities auto-seeded
POST /rooms               { roomTypeId: <GW>, roomNumber: "GW-1", gender: "MALE_ONLY", floor: "1st" }
POST /beds/bulk           { roomId, startNumber: 1, endNumber: 20 }   → 20 beds, all AVAILABLE
PUT  /rooms/:id/amenities { amenityIds: [<OXYGEN>, <INTERCOM>] }
```

### 4.2 IPD admission → discharge (nursing station lifecycle)
```
POST /beds/:id/status  { status: "RESERVED",  patientId }        → bed held
POST /beds/:id/status  { status: "OCCUPIED",  patientId }        → patient admitted
POST /beds/:id/status  { status: "DISCHARGE_PENDING" }           → billing clearances
POST /beds/:id/status  { status: "HOUSEKEEPING", reason: "Deep cleaning" }
POST /beds/:id/status  { status: "AVAILABLE" }                   → ready for next patient
GET  /masters/ward-room/bor-dashboard                            → management KPI tile
```

### 4.3 Amenity-driven allocation
```
GET /rooms/by-amenity?amenities=AC,OXYGEN   → shortlist
GET /rooms/:id/occupancy                    → pick an AVAILABLE bed
```

---

## 5. Frontend integration guide

### 5.1 Nursing station bed grid
- Source: `GET /masters/rooms/:id/occupancy` per room (or `GET /masters/beds?status=…` for cross-room views).
- Color map: `AVAILABLE` 🟢 · `RESERVED` 🟡 · `OCCUPIED` 🔴 · `DISCHARGE_PENDING` 🟠 · `HOUSEKEEPING` 🧹 · `MAINTENANCE` 🔧 · `OUT_OF_SERVICE` ⛔.
- Click actions call `POST /beds/:bedId/status` with the **next** status only — render action buttons from `details.allowedTransitions` returned by a previous 400, or mirror the transition map from §3.4.

### 5.2 BOR dashboard tile
- Poll `GET /masters/ward-room/bor-dashboard` (30–60s). `borPercent` is already 1-decimal rounded — render as-is.
- `byRoomType[].bor` drives the per-ward progress bars; non-countable types simply don't appear (by design).

### 5.3 Ward setup wizard
- Step 1: room types (pre-seeded — usually just review/rate edits).
- Step 2: rooms per type (`gender` selector matters for govt-hospital compliance).
- Step 3: **bulk bed generator** — show `{ created, skipped }` after save; skipped means "already existed", not failure.
- Step 4: amenities (chips from `GET /bed-amenities?active=true`, save via single `PUT`).

### 5.4 Error cheat-sheet
| Status | Code / meaning | UI |
|---|---|---|
| 400 | `INVALID_STATUS_TRANSITION` (details carry `allowedTransitions`) | Disable illegal actions; toast message |
| 400 | Missing `patientId` for OCCUPIED/RESERVED | Open patient picker first |
| 409 | `BED_DELETE_BLOCKED` / duplicate identifiers | Explain, don't retry |
| 404 | Cross-tenant room/bed/patient/amenity | "Record not found" |

---

## 6. Verification status

| Check | Result |
|---|---|
| Migration `phase_2_3_ward_room_bed` | ✅ applied |
| Bulk bed creation | ✅ unit (01–20, prefix, skips) + **live DB: 20 beds created with initial AVAILABLE status** |
| State machine | ✅ 12 valid + 7 invalid transitions tested; **live DB full cycle verified** (`AVAILABLE → OCCUPIED → DISCHARGE_PENDING → HOUSEKEEPING → AVAILABLE*`) |
| BOR calculation | ✅ unit (isCount exclusion, per-type, per-gender) + live DB |
| Delete guard (occupied bed) | ✅ 409 `BED_DELETE_BLOCKED` |
| Seed idempotency | ✅ live DB: run 1 seeded 11+9, run 2 skipped |
| `npm run test` | ✅ 20 suites · 184 passed · 1 todo (39 new tests) |
| `npm run build` | ✅ clean |

## 7. Follow-ups shipped (post-2.3)

- ✅ **Housekeeping task queue** — `GET /masters/ward-room/housekeeping-queue` (§ 3.6), FIFO from current `HOUSEKEEPING` statuses.
- ✅ **Partial unique index for `isCurrent`** — migration `20261008082450_phase_2_3b_is_current_partial_unique` adds `bed_statuses_one_current_per_bed` (`UNIQUE (bedId) WHERE isCurrent = true`). The app-level transactional guarantee is now DB-enforced too — **verified live**: a second `isCurrent=true` row is rejected (P2002); historical `isCurrent=false` rows insert fine.

## 8. Not in this phase (next steps)

- **Threshold Limit (Phase 1.4)**: consume `RoomsService` for room-rate caps and `BedStatusService` for admission-triggered status moves — *awaiting spec*.
- **IPD Admission module**: will own `ipdAdmissionId` linkage + admit/discharge workflows driving the bed state machine — *awaiting spec*.
