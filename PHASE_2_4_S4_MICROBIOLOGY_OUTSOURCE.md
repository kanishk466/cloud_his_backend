# Phase 2.4 Session 4 — Microbiology (Organisms, Antibiotics, AST Panels), Outsource Labs & Sign-off Authority

> **Final session of Phase 2.4.** LIS/RIS master setup is now 100% complete.
> **Module:** `src/hospital/masters/lab-radio/` (extended) · **Migration:** `20261008143619_phase_2_4_session4_microbiology_outsource`

---

## 1. What we did

1. **Organism + Antibiotic catalogs** — pathogen master (Gram+/Gram−/AFB/Fungi/…, `isCommon` flag for picker ordering) and antibiotic master with pharmacological class + dosage.
2. **Standard AST panels** — per-organism testing battery with **first-line vs reserve/second-line** drugs; `GET …/ast-battery` returns the ordered two-tier list for the C&S result screen (no more picking from 50 antibiotics manually).
3. **Outsource reference labs** — external lab master (contact, B2B portal URL, courier pickup time) linked from `Investigation.outsourceLabId`; per-lab routed-test listing.
4. **Lab sign-off authority matrix (NABL)** — per user (+ optional department scope): `canVerify` (technical review) and `canApproveLock` (final sign + LOCK), with printed `designationText` + `medicalRegNo` for the report footer — and a `verify-permission` guard the reporting engine calls before locking.

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| Panel as first-line/reserve tiers (not one flat list) | CLSI practice: first-line drugs reported always; reserves (Meropenem, Colistin) only when first-line fails. Two-tier output shapes the C&S screen directly. |
| `AstResultType` enum staged (S/I/R/NOT_TESTED) | Result storage belongs to the future result-entry module, but the vocabulary is fixed now so every consumer uses the same S/I/R codes. |
| Sign-off resolution: **dept-specific → global (null-dept)** | One senior pathologist can sign hospital-wide (global row), while a junior gets restricted to one department. NULL-unique quirk handled by service-level duplicate guard (established pattern). |
| Guard **returns** a decision instead of throwing | The reporting engine asks "can this user APPROVE_LOCK?" and renders the block itself — `{ isAuthorized, reason, designationText, medicalRegNo }` covers both the gate and the report footer data in one call. |
| Outsource link `SetNull` on investigation | Deleting a lab must not orphan the test; the investigation keeps its name/TAT and just loses the routing. |

---

## 3. API reference

Prefix **`/api`** · `Authorization: Bearer <hospital token>`

### 3.1 Organisms — `/api/hospital/masters/organisms`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | 409 dup code |
| GET | `/?organismType=FUNGI&search=coli&active=true` | `isCommon` first, then A–Z |
| PUT | `/:id/antibiotic-panel` | Atomic replace: `[{ antibioticId, sortOrder?, isFirstLine? }]` |
| GET | `/:id/ast-battery` | `{ organism, firstLine[], secondLine[] }` |
| GET / PATCH / DELETE | `/:id` | Soft delete |

**AST battery (live):** ECOLI → first-line `AK, CIP, CTR, PIT` · reserve `MEM, CST`.

### 3.2 Antibiotics — `/api/hospital/masters/antibiotics`

CRUD · filters `antibioticClass`, `search`, `active` · DELETE blocked while in panels (400).

### 3.3 Outsource Labs — `/api/hospital/masters/outsource-labs`

CRUD (soft delete) · `GET /:id/investigations` lists routed tests · DELETE blocked while tests are routed (400).

### 3.4 Sign-off Authorities — `/api/hospital/masters/lab-signoff-authorities`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | User (active) + optional dept validated (404); duplicate user+scope → 409 (NULL-dept guard) |
| GET | `/?labDepartmentId=…&hospitalUserId=…&active=true` | With user + dept populated |
| POST | `/verify-permission` | **Guard** — see below |
| GET / PATCH / DELETE | `/:id` | Soft delete |

**Guard** — `POST /verify-permission` `{ hospitalUserId, labDepartmentId, action: 'VERIFY' | 'APPROVE_LOCK' }` →

```json
{ "isAuthorized": true, "designationText": "Consultant Pathologist (MD)", "medicalRegNo": "MCI-12345" }
// or
{ "isAuthorized": false, "reason": "User lacks approve/lock permission" }
```

**Live matrix (global authority):** Junior VERIFY ✅ / APPROVE_LOCK ⛔ · Senior VERIFY ✅ / APPROVE_LOCK ✅.

### 3.5 Seed (`prisma/seed-lab-radio.ts` — runs S1–S4)

`seedDefaultMicrobiologyAndOutsource` — 7 organisms (ECOLI…MTUB), 12 antibiotics (AK…CST), ECOLI panel (4 first-line + 2 reserve), 3 outsource labs (LAL/AGILUS/METRO with pickup times). Idempotent.

---

## 4. Frontend integration guide

### 4.1 C&S result entry (Stage 1 + 2)
- Organism picker: `GET /organisms?active=true` (common pathogens on top).
- On selection: `GET /organisms/:id/ast-battery` → render two grouped tables — **First-line** rows pre-marked for entry, **Reserve** rows collapsed behind "show reserve drugs".
- Result cell: S / I / R chips (+ optional MIC/zone mm text) — codes from `AstResultType`.

### 4.2 Report sign-off flow
```ts
const perm = await api.post('/api/hospital/masters/lab-signoff-authorities/verify-permission',
  { hospitalUserId: currentUser.userId, labDepartmentId, action: 'APPROVE_LOCK' });
if (!perm.isAuthorized) return toast(perm.reason);
// else: lock report, print footer = `${perm.designationText} | Reg. No: ${perm.medicalRegNo}`
```

### 4.3 Outsource dispatch board
- Lab picker on investigation master (`GET /outsource-labs?active=true`); `courierPickupTime` drives the daily dispatch checklist; `portalUrl` as an external-link button.
- `GET /outsource-labs/:id/investigations` for the per-lab test register.

---

## 5. Verification status

| Check | Result |
|---|---|
| Migration `phase_2_4_session4_microbiology_outsource` | ✅ applied |
| Seed (live) | ✅ 7 organisms / 12 antibiotics / 6 panel mappings / 3 labs; idempotent |
| AST battery | ✅ unit split + live ECOLI first-line/reserve |
| Sign-off guard | ✅ 8 unit cases (create guards, global/dept resolution) + live 4-cell matrix |
| `npm run test` | ✅ 30 suites · 275 passed · 1 todo (13 new) |
| `npm run build` | ✅ clean |

## 6. Phase 2.4 — complete module map

| Session | Shipped |
|---|---|
| S1 — Core hierarchy | LabDepartment → Investigation (⇄ ServiceMaster) → Observation → ReferenceRange + specificity-ranked range lookup |
| S2 — Templates & intelligence | Report templates (3-scope resolution), interpretation engine, help texts, comment library |
| S3 — Pre-analytical | Containers (hex-coded vacutainers), sample types (stability/retention), collection worklist (tube dedup) |
| S4 — Micro & governance | Organisms/AST panels, outsource labs, NABL sign-off matrix |

**Next build candidates:** sample collection + barcode workflow, result entry (engine + battery + helps are ready), report rendering (`resolve()` template + sign-off footer), TAT/outsource dispatch tracking.