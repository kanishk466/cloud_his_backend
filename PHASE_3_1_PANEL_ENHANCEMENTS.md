# Phase 3.1 — Panel Setup Enhancements (Rate Schedules, Panel Documents & OPD Bill Panel Linkage)

> **Audience:** backend reviewers, QA, frontend team.
> **Module:** `src/hospital/masters/panel-enhancements/` · **Migration:** `20261008153738_phase_3_1_panel_enhancements`

---

## 1. What we did

1. **Rate Schedules (effective-date pricing)** — time-bound tariff lists per panel (`CGHS 2024-2025` vs `CGHS 2026`) with overlap protection, so a 2024 audit/reprint prices from the 2024 list while new bills use the 2026 list.
2. **Rate Resolver engine** — one exported service every billing engine calls: date-match → default schedule → panel base tariff. Verified live across the year boundary.
3. **Panel Documents** — claim-processing checklist per panel (TPA Pre-Auth, Claim Form B, Implant Sticker…) with mandatory flags, OPD/IPD scoping, and blank **template upload** (PDF/PNG/JPG ≤ 10 MB, same-origin `/uploads/` serving).
4. **Panel workflow fields** — `counsellorAddress`, `embassyAddress`, `authorizationRequired`, `preAuthRequired`, `claimSubmissionDays` (default 30).
5. **`OpdBill.panelId`** — direct FK; auto-inherited from the patient at bill creation (explicit override possible, tenant-validated).

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| Schedules keyed by **date ranges**, not "current" flags | History must be re-priceable: audit a 2024 bill → 2024 rates. A boolean "current" can't represent both. Latest-covering schedule wins; `isDefault` is the gap-filler. |
| **Overlap guard** on create/update | Two schedules covering the same day makes resolution ambiguous — better rejected at write time than random at billing time. |
| Resolver **falls through gracefully** (date → default → panel tariff) | Panels without schedules keep working exactly as before (opdTariff/ipdTariff). Zero breaking change for existing billing. |
| `OpdBill.panelId` auto-inherited from patient | The counter already picked the patient's panel at registration — bills shouldn't require a second selection; explicit `panelId` override exists for walk-ins billed differently. |
| Template storage behind the same util as signatures | One local-disk layer today (`/uploads/panel-templates/`), one S3 swap point tomorrow. Old file deleted on replace; file removed on document delete. |
| Documents as **mandatory checklist data**, not code | Claim desks differ per TPA — a checklist master beats hardcoded document logic, and `module=OPD|IPD` scopes the same master to both flows. |

---

## 3. API reference

Prefix **`/api`** · `Authorization: Bearer <hospital token>`

### 3.1 Rate Schedules — `/api/hospital/masters/rate-schedules`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Panel + tariff validated (404); **overlap → 400** with the conflicting schedule's range |
| GET | `/?active=true` | All, with panel + tariff populated |
| GET | `/panel/:panelId` | Panel's schedules, newest revision first |
| GET | `/resolve?panelId=…&targetDate=2024-06-15&context=OPD` | **Resolver** → `{ tariffId, scheduleName, resolvedFrom, rateMultiplier }` |
| GET / PATCH / DELETE | `/:id` | Soft delete; PATCH re-validates overlap (excluding self) |

**Live verification:**
```
bill date 2024-06-15 → "CGHS Rates 2024-2025" [DATE_MATCH] tariff A
bill date 2025-01-01 → "CGHS Rates 2026"      [DATE_MATCH] tariff B
bill date 2026-10-08 → "CGHS Rates 2026"      [DATE_MATCH] tariff B
```

### 3.2 Panel Documents — `/api/hospital/masters/panel-documents`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | 409 dup `(panelId, documentCode)` |
| GET | `/panel/:panelId?module=IPD` | Claim checklist — mandatory first, then `sortOrder`; module-scoped |
| POST | `/:id/template` | multipart field **`template`** (PDF/PNG/JPG ≤ 10 MB); old file replaced; returns updated doc with `templateFileUrl` |
| GET / PATCH / DELETE | `/:id` | Soft delete (template file removed from disk) |

```json
// checklist item
{ "documentName": "TPA Pre-Authorization Form", "documentCode": "PRE_AUTH_FORM",
  "isMandatory": true, "appliesToIpd": true, "templateFileUrl": "/uploads/panel-templates/…_1791474320484.pdf" }
```

### 3.3 OPD billing (changed behavior)

`POST /api/opd/billing` — new optional `panelId`; when omitted, the bill inherits `patient.panelId` automatically. Invalid/inactive panel → `404 OPD_BIL_013`. Response bills now carry the panel FK (`@@index` on `[tenantId, panelId]` for panel-wise registers).

---

## 4. Frontend integration guide

### 4.1 Panel rate revision flow
```
POST /panels                              → (existing) create panel with base tariffs
POST /rate-schedules  { panelId, tariffId: <2024 list>, effectiveFrom: 2024-01-01, effectiveTo: 2024-12-31 }
POST /rate-schedules  { panelId, tariffId: <2026 list>, effectiveFrom: 2025-01-01 }   // open-ended
```
Overlap 400s carry the conflicting range in the message — render inline on the date pickers.

### 4.2 Claim checklist on discharge/billing
```ts
const docs = await api.get(`/api/hospital/masters/panel-documents/panel/${bill.panelId}?module=OPD`);
// render: ☑ uploaded  ☐ mandatory missing (block claim submit when isMandatory && !uploaded)
// blank template download: doc.templateFileUrl (same origin)
```

### 4.3 Rate-aware pricing (billing engines)
```ts
const { tariffId, scheduleName } = await api.get(
  `/api/hospital/masters/rate-schedules/resolve?panelId=${panelId}&targetDate=${billDate}&context=OPD`
);
// price line items from that tariff's PanelServiceRate list; show scheduleName on the bill for audit
```

---

## 5. Verification status

| Check | Result |
|---|---|
| Migration `phase_3_1_panel_enhancements` | ✅ applied |
| Resolver: 2024→A / 2025+→B | ✅ unit (6 cases: match/default/panel/OPD/IPD/null) + **live boundary test** |
| Overlap guard | ✅ create + update (self-excluded) unit tests |
| Document checklist | ✅ panel + module scoping unit tests |
| Template upload | ✅ live PDF saved + URL stored + cleanup |
| `OpdBill.panelId` | ✅ live bill inherited patient panel → `CGHS` |
| `npm run test` | ✅ 33 suites · 291 passed · 1 todo (16 new) |
| `npm run build` | ✅ clean |

## 6. Not in this phase (next steps)

- **Pricing integration**: OPD billing line items priced via `RateResolverService` + `PanelServiceRate` (engine is exported and ready).
- **Claim submission tracker**: per-bill document upload status against the mandatory checklist (masters + templates ready).
- **S3/Cloudinary backend** for template storage (swap `file-upload.util.ts`).
- **IPD tariff context**: resolver already takes `context: 'IPD'` — consumed when IPD billing lands.