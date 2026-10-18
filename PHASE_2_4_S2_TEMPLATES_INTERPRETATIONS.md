# Phase 2.4 Session 2 — Lab Templates, Interpretations, Help Text & Report Comments

> **Audience:** backend reviewers, QA, frontend team.
> **Module:** `src/hospital/masters/lab-radio/` (extended) · **Migration:** `20261008102220_phase_2_4_session2_templates_interpretations`

---

## 1. What we did

Four report-support systems on top of Session 1's hierarchy:

1. **Report Templates** — per-department/investigation/global report formats (`NUMERIC_TABLE`, `DESCRIPTIVE`, `CULTURE_SENSITIVITY`, `FLOW_CYTOMETRY`, `CUSTOM`) with header/body/footer HTML + CSS and a **resolution chain**: investigation-specific → department default → global default.
2. **Auto-Interpretation rules** — value-triggered clinical text ("TSH > 5.0 → Elevated — Suggestive of Hypothyroidism") evaluated by a severity-ranked **interpretation engine** (CRITICAL first), driven by the applicable `ReferenceRange`.
3. **Observation Help texts** — technician guidance (sample collection, interference, clinical significance), aggregated per investigation for the data-entry screen.
4. **Report Comment library** — one-click standard comments ("Sample hemolyzed…") with quick **shortcut** lookup (`HEM`, `REP`, `LIP`), global + department-scoped.

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| Templates at 3 scopes (investigation → department → global) | A hospital customizes one odd report (D-dimer layout) without duplicating 50 department templates; everything else inherits upward. `isDefault` swap is transactional — a scope never has two defaults. |
| Interpretation conditions read bounds from the **ReferenceRange** (not duplicated thresholds) | The same rule ("above max") adapts automatically per patient gender/age — HGB high for a child vs an adult male means different numbers. Single source of truth for "normal". |
| Engine returns matches sorted CRITICAL → WARNING → INFO | Result entry (Session 3) shows the scariest line first; technicians can't miss a critical flag buried under warnings. |
| Range-based rules **can't fire without a range** | No reference range = no basis to call a value high/low. Only `EQUALS`/`CONTAINS` (self-thresholded) still evaluate — no false clinical claims. |
| Comments with `shortcut` unique per tenant + global scope | Technicians type 3 letters instead of a sentence; hospital-wide comments (disclaimers) exist once, department quirks stay separate. |
| Help aggregation per **investigation** (not per observation) | The entry screen is investigation-centric — one call returns help for every parameter on the form, in report order. |

---

## 3. API reference

Prefix **`/api`** · `Authorization: Bearer <hospital token>`

### 3.1 Report Templates — `/api/hospital/masters/lab-templates`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Scope validation (dept ⇄ investigation consistency → 400); `isDefault:true` unsets previous default in scope (tx) |
| GET | `/?labDepartmentId=…&investigationId=…&templateType=DESCRIPTIVE&active=true` | |
| GET | `/resolve?investigationId=uuid` | `{ template, resolvedFrom: 'INVESTIGATION'\|'DEPARTMENT'\|'GLOBAL' }` · 404 when nothing configured |
| PUT | `/:id/set-default` | Atomic default swap |
| GET / PATCH / DELETE | `/:id` | Soft delete |

### 3.2 Interpretations — `/api/hospital/masters/lab-interpretations`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Single rule (`EQUALS` ⇒ `thresholdValue`; `CONTAINS` ⇒ `thresholdText`) |
| POST | `/bulk` | `{ observationId, interpretations: [...] }` — **replace all** atomically |
| GET | `/observation/:observationId` | All rules |
| PATCH / DELETE | `/:id` | |

**Engine (service, consumed by Session 3 result entry):**
`evaluateInterpretations(tenantId, observationId, value, gender?, ageYears?)` — live-verified on seeded TCHOL (male, 30):

| Value | Result |
|---|---|
| 150 | `[]` (in range) |
| 210 | `[WARNING] Elevated cholesterol…` |
| 260 | `[CRITICAL] Severe hypercholesterolemia…` **then** `[WARNING] Elevated…` (severity order) |

Conditions: `ABOVE_MAX` / `BELOW_MIN` / `ABOVE_CRITICAL_HIGH` / `BELOW_CRITICAL_LOW` / `IN_RANGE` (vs applicable range) + `EQUALS` / `CONTAINS` (self-thresholded).

### 3.3 Observation Helps — `/api/hospital/masters/observation-helps`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | 404 unknown observation |
| GET | `/`, `/observation/:observationId` | Ordered by `sortOrder` |
| GET | `/investigation/:investigationId` | **Aggregated**: every observation in report order + its helps |
| PATCH / DELETE | `/:id` | Hard delete |

### 3.4 Report Comments — `/api/hospital/masters/report-comments`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | 409 dup shortcut |
| GET | `/?labDepartmentId=…&category=SAMPLE_QUALITY&search=hemo` | Department query **always includes global** comments |
| GET | `/quick?shortcut=HEM` | One-shot lookup (case-insensitive); 404 unknown |
| GET / PATCH / DELETE | `/:id` | Soft delete |

---

## 4. Seed (extended `prisma/seed-lab-radio.ts`)

`seedDefaultTemplatesAndComments(tenantId)` — idempotent (skips when templates exist). Live-verified:

- **7 templates**: Standard Lab Report (global default) + Radiology Report ×4 (RAD_XR/USG/CT/MRI) + Culture & Sensitivity (MIC) + Pathology Report (PAT)
- **10 comments** (HEM/LIP/ICT/INS/REP/VER/DEL/COR/FAST/STD)
- **3 TCHOL interpretations** (CRITICAL/WARNING×2) · **3 GLU_F helps**

```bash
npx ts-node prisma/seed-lab-radio.ts <tenantId>   # runs S1 + S2 seeds in sequence
```

---

## 5. Frontend integration guide

### 5.1 Report print preview (with Session 4 in mind)
```ts
const { template, resolvedFrom } = await api.get(
  `/api/hospital/masters/lab-templates/resolve?investigationId=${id}`
);
// render headerHtml / bodyHtml / footerHtml + cssStyles; badge "using: DEPARTMENT template"
```

### 5.2 Result entry screen (Session 3 preview)
```ts
// On load: aggregated helps per investigation
const help = await api.get(`/api/hospital/masters/observation-helps/investigation/${id}`);
// On each value change: live interpretation
const flags = await interpretationsService.evaluateInterpretations(tenantId, obsId, value, gender, age);
// render flags[0] (most severe) as the row banner
```

### 5.3 Comment picker
- Chips from `GET /report-comments?labDepartmentId=…` grouped by `category` (globals included automatically).
- Power users type the shortcut (`HEM` → one-shot `/quick?shortcut=HEM`).

---

## 6. Verification status

| Check | Result |
|---|---|
| Migration `phase_2_4_session2_templates_interpretations` | ✅ applied |
| Seed (live) | ✅ 7 templates / 10 comments / 3 rules / 3 helps; idempotent |
| Template resolution | ✅ unit chain + live `resolve(CBC) → GLOBAL` |
| Interpretation engine | ✅ 9 unit cases (range conditions, EQUALS/CONTAINS, severity sort, no-range guard) + live TCHOL values |
| Comment quick lookup | ✅ HEM → text (live) + 409/404 unit cases |
| Help aggregation | ✅ live BSF → 3 titled helps |
| `npm run test` | ✅ 27 suites · 256 passed · 1 todo (23 new) |
| `npm run build` | ✅ clean |

## 7. Not in this session (Sessions 3–4)

- **Session 3**: result entry consuming `evaluateInterpretations` per row, help panel from the aggregated endpoint, critical-value alerts.
- **Session 4**: report rendering with `resolve()` template + comment attach via shortcuts, verification pipeline (`InvestigationReportStatus`), TAT breach tracking.