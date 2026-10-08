# Phase 2.4 Session 3 — Pre-Analytical Setup (Containers, Sample Types, Collection Rules & Retention)

> **Audience:** backend reviewers, QA, frontend team.
> **Module:** `src/hospital/masters/lab-radio/` (extended) · **Migration:** `20261008105638_phase_2_4_session3_pre_analytical`
> **Domain:** ~70% of lab errors are pre-analytical — wrong tube, clotted sample, unverified fasting, degraded storage. This phase encodes those rules into masters.

---

## 1. What we did

1. **Sample Container Master** — vacutainer registry: cap color + hex for UI, additive, standard draw volume, tube type (VACUTAINER / STERILE_CUP / SWAB_TUBE / SLIDE_BOX).
2. **Sample Type master** — specimens with full **stability rules** (room temp / 2-8°C / -20°C) and **NABL archive retention** (`archiveDays` for post-report re-testing), each with a preferred default tube and collection instructions.
3. **Investigation ↔ pre-analytical linkage** — `sampleTypeId` + `sampleContainerId` on Investigation (validated, `SetNull`-safe).
4. **Collection worklist helper** — order-investigation-IDs in → deduped tube list out (one puncture, one tube per color, tests grouped per tube) + fasting flag + instructions. This is what the phlebotomy barcode screen consumes.
5. **Stability card** — formatted per-specimen summary for the technician bench.

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| Container resolution: **direct link → sample type's default tube** | Explicit tube per test where it matters (BSF → Fluoride Grey), zero-config everywhere else (Serum defaults to SST). Phlebotomist never sees a gap silently. |
| **One tube per color**, `tubeCount: 1`, volume = container default | Matches real draws: CBC + HbA1c share ONE lavender tube. Volume is the tube's standard fill, not a sum of tests. |
| Unmapped tests surface as `unassignedTests` | Master-data gaps must be visible at the counter, not silently produce an incomplete draw. |
| Stability as 3-tier fields + generated `summary` string | Technicians read "Stable 6h room temp, 48h fridge, 30 days frozen — retain 7 days" — no mental math across fields. |
| `archiveDays` on the specimen (NABL/NABH) | Retention obligations differ per specimen (CSF 7d vs urine 1d); compliance belongs in master data, not in someone's memory. |
| Seed **links** LIPID/BSF/CBC to their tubes | The worklist works out-of-the-box on seeded tenants (verified live: 3 tubes, correct colors, fasting flag). |

---

## 3. API reference

Prefix **`/api`** · `Authorization: Bearer <hospital token>`

### 3.1 Sample Containers — `/api/hospital/masters/sample-containers`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | 409 dup code · hex validated `#RRGGBB` |
| GET | `/?active=true` | Ordered by `sortOrder`, with usage counts |
| GET / PATCH / DELETE | `/:id` | DELETE → 400 while investigations linked |

### 3.2 Sample Types — `/api/hospital/masters/sample-types`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | `defaultContainerId` validated (404); 409 dup code |
| GET | `/?active=true` | With `defaultContainer` populated |
| GET | `/:id/stability-card` | `{ storageTemp, stability{...}, archiveDays, summary }` |
| GET / PATCH / DELETE | `/:id` | DELETE → 400 while investigations linked |

**Stability card (live):**
```json
{
  "name": "Serum", "code": "SER", "storageTemp": "REFRIGERATED",
  "stability": { "roomTempHours": 6, "fridgeHours": 48, "frozenDays": 30 },
  "archiveDays": 7,
  "summary": "Stable 6h at room temp, 48h refrigerated (2-8°C), 30 days frozen (-20°C). Retain 7 day(s) post-report for re-testing."
}
```

### 3.3 Investigations (extended)

`CreateInvestigationDto` + `UpdateInvestigationDto` now accept `sampleTypeId` / `sampleContainerId` (tenant-validated, 404).

### 3.4 Collection worklist (service — consumed by phlebotomy/barcoding)

`getCollectionWorklistRequirements(tenantId, investigationIds[])` — live-verified with the seeded OPD trio (CBC + LIPID + BSF):

```json
{
  "requiredTubes": [
    { "container": "FLUORIDE_GREY", "color": "Grey", "hexColorCode": "#808080",
      "tubeCount": 1, "totalVolumeMl": 2, "tests": ["Blood Sugar Fasting"] },
    { "container": "EDTA_PURPLE", "color": "Lavender", "hexColorCode": "#9370DB",
      "tubeCount": 1, "totalVolumeMl": 2, "tests": ["Complete Blood Count"] },
    { "container": "SST_YELLOW", "color": "Yellow/Gold", "hexColorCode": "#FFD700",
      "tubeCount": 1, "totalVolumeMl": 4, "tests": ["Lipid Profile"] }
  ],
  "fastingRequired": true,
  "specialInstructions": ["Ensure 8-12 hours overnight fasting"]
}
```

### 3.5 Seed (extended `prisma/seed-lab-radio.ts` — runs S1+S2+S3)

`seedDefaultContainersAndSampleTypes(tenantId)` — 8 containers (SST/EDTA/Citrate/Fluoride/Plain/Heparin/Cup/Swab with exact colors + volumes), 8 sample types (WB/SER/PLA/FLU_PLA/URN/24URN/CSF/SPT with stability matrix), and links LIPID→SER/SST, BSF→FLU_PLA/Grey, CBC→WB/EDTA. Idempotent.

---

## 4. Frontend integration guide

### 4.1 Phlebotomy collection screen
```ts
const wl = await sampleTypesService.getCollectionWorklistRequirements(tenantId, billInvestigationIds);
// Tube strip UI: one chip per requiredTubes[] entry, chip background = hexColorCode
// Fasting banner when fastingRequired; specialInstructions as checklist
```

### 4.2 Tube color coding
- Render tubes with `hexColorCode` as the swatch — matches physical BD vacutainer colors (verified: Lavender `#9370DB`, Gold `#FFD700`, Grey `#808080`).
- Sort the strip by draw order convention (coagulation blue first in real phlebotomy — configurable later via `sortOrder`).

### 4.3 Investigation master form
- Add two pickers: Sample Type (`GET /sample-types?active=true`) and optional Container override (`GET /sample-containers?active=true`).
- Show the stability card inline (`/:id/stability-card`) so masters stay honest.

### 4.4 Error cheat-sheet
| Status | Meaning | UI |
|---|---|---|
| 400 | Delete blocked (linked investigations) | Toast message |
| 404 | Cross-tenant container / sample type | "Record not found" |
| 409 | Duplicate `code` | Highlight field |

---

## 5. Verification status

| Check | Result |
|---|---|
| Migration `phase_2_4_session3_pre_analytical` | ✅ applied |
| Seed (live) | ✅ 8 containers / 8 sample types / 3 investigations linked; idempotent |
| Worklist dedup (unit) | ✅ 2 tests share 1 EDTA tube · default-tube fallback · unassigned bucket · empty order |
| Worklist (live) | ✅ CBC+LIPID+BSF → 3 tubes, correct colors/volumes, `fastingRequired: true` |
| Stability card | ✅ live formatted summary |
| `npm run test` | ✅ 28 suites · 262 passed · 1 todo (6 new) |
| `npm run build` | ✅ clean |

## 6. Not in this session (next)

- **Sample collection workflow**: barcode generation per tube, collection timestamps, rejection reasons (`SAMPLE_QUALITY` comments are already seeded).
- **Result entry (Session 3/4 of the earlier plan)**: consumes interpretation engine + helps.
- **Storage/archive tracker**: bin-level sample location with `archiveDays` expiry sweeps.