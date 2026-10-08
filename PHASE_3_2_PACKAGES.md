# Phase 3.2 — Package Setup (OPD Health Checks & IPD Surgical Bundles)

> **Audience:** backend reviewers, QA, frontend team.
> **Module:** `src/hospital/masters/package-setup/` · **Migration:** `20261008160422_phase_3_2_packages`

---

## 1. What we did

1. **Package master** — bundle definitions (OPD health checks, IPD surgical bundles, daycare) with validity windows, included stay days, and optional `RoomType` binding (e.g., surgery valid only in General Ward).
2. **Auto-SKU hook** — creating a package auto-creates its `ServiceMaster` record (`itemType = PACKAGE`, same code/price) in the **same transaction**. The package bills as a single line item and gets tariff overrides via `PanelServiceRate` — no separate SKU setup.
3. **Bundle structure** — components (services with quotas, e.g., CBC ×2), doctor consult allowances (per department/doctor, `OPD_VISIT`/`IPD_DOCTOR_ROUND`), and printed **exclusions** (implants, blood bags, ICU) for dispute-free billing.
4. **Consumption engine** — `evaluateConsumption` answers "is this covered?" per patient+package (quota left → ₹0; exhausted → standard rate with `PACKAGE_QUOTA_EXHAUSTED`), `recordConsumption` writes the ledger with `billId` links and `isExtraBilled` flags.
5. **Reference seed** — Executive Health Checkup ₹2,999 and Laparoscopic Cholecystectomy ₹45,000 (3 days GW) — both verified end-to-end live.

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| Auto-SKU in the **same transaction** | A package without its billing SKU is unsellable; a SKU without its package is a billing ghost. They exist together or not at all. Same-code orphan `PACKAGE` services get adopted instead of duplicated. |
| Quota counts only `isExtraBilled = false` rows | The moment a patient pays standard rate for the 3rd CBC, that row is flagged extra-billed and **doesn't consume more quota** — the ledger stays a faithful story of what was free vs paid. |
| Package components can't be `itemType = PACKAGE` | Nesting bundles inside bundles makes quota math unresolvable. Blocked at validation with the offending service named. |
| RoomType binding on the **package**, not the patient | A gallbladder package priced for General Ward can't silently be consumed in a Private room — the enforcement hook (IPD admission, next phase) reads this binding. |
| Consult allowance resolution: exact doctor → department → generic | "Dr. Shah's 3 rounds", "any surgeon's 3 rounds", and "any doctor once" are all representable without schema forks. |
| Update syncs SKU rate/name automatically | Price negotiated on the package → the billable SKU must follow. One transaction, no drift. Delete deactivates the SKU so old bills keep their snapshot but new sales stop. |

---

## 3. API reference

Prefix **`/api`** · `Authorization: Bearer <hospital token>`

### 3.1 Packages — `/api/hospital/masters/packages`

| Method | Path | Notes |
|---|---|---|
| POST | `/` | One tx: SKU + package + optional components/consults/exclusions. 409 dup code · 404 roomType/dept/doctor · 400 nested-package/unknown service |
| GET | `/?packageType=IPD_SURGERY&roomTypeId=…&search=lap&isActive=true` | With SKU + roomType + counts |
| GET | `/:id/details` | Full breakdown: components.service, consults (dept/doctor), exclusions, roomType, serviceSku |
| PATCH | `/:id` | basePrice/name **auto-sync to SKU** (tx) |
| PUT | `/:id/components` `/consults` `/exclusions` | Atomic replace of each structure |
| DELETE | `/:id` | Soft delete + SKU deactivated |

**Create body**
```json
{
  "name": "Executive Health Checkup", "code": "PKG-EHC",
  "packageType": "OPD_HEALTH_CHECK", "basePrice": 2999, "validityDays": 30,
  "components": [
    { "serviceId": "uuid-of-LAB-CBC", "quantity": 1 },
    { "serviceId": "uuid-of-LAB-LIPID", "quantity": 1 }
  ],
  "consults": [
    { "clinicalDepartmentId": "uuid-cardiology", "consultType": "OPD_VISIT", "maxVisits": 1 }
  ],
  "exclusions": [{ "exclusionText": "Medications and pharmacy items" }]
}
```

### 3.2 Consumption — `/api/hospital/masters/package-consumption`

| Method | Path | Notes |
|---|---|---|
| GET | `/evaluate?patientId=…&packageId=…&serviceId=…` (or `doctorProfileId`) | Pre-billing coverage check |
| POST | `/` | Write ledger row (`RecordConsumptionDto`) |
| GET | `/usage/:packageId/:patientId` | Usage history |

**Live scenario (PKG-LAP-CHOL, 2× CBC quota):**
```
CBC #1 → { isCovered: true,  remainingQuota: 1, chargeAmount: 0 }
CBC #2 → { isCovered: true,  remainingQuota: 0, chargeAmount: 0 }
CBC #3 → { isCovered: false, chargeAmount: 250, reason: "PACKAGE_QUOTA_EXHAUSTED" }
```
Ledger afterwards: 3 rows, `isExtraBilled: true` on the 3rd.

### 3.3 Seed

```bash
npx ts-node prisma/seed-packages.ts <tenantId>
```
PKG-EHC (₹2,999, OPD, 30d validity) + PKG-LAP-CHOL (₹45,000, IPD, 3d GW). Idempotent; components gracefully skip services that don't exist yet (run the lab seed first for the full experience).

---

## 4. Frontend integration guide

### 4.1 Package catalogue & sale
- Catalogue card: `GET /packages?isActive=true` → sell the `serviceSku.id` as the bill line item (it IS a ServiceMaster — existing billing flows work unchanged).
- Details drawer: `GET /packages/:id/details` → inclusions table (component quotas), consult list, **exclusions printed in red** (billing-dispute prevention).

### 4.2 Package builder form
- Service picker excludes `itemType=PACKAGE` (server 400s anyway).
- Consult rows: department dropdown OR specific doctor (optional both) + maxVisits.
- Exclusions: simple string list with drag order.

### 4.3 Billing-time coverage check
```ts
const r = await api.get('/api/hospital/masters/package-consumption/evaluate',
  { params: { patientId, packageId, serviceId } });
if (r.isCovered)        → line at ₹0, badge "Package (quota left: r.remainingQuota)"
else if (r.reason === 'PACKAGE_QUOTA_EXHAUSTED')
                        → line at r.chargeAmount, badge "Package quota used up — standard rate"
```
After bill creation, `POST /package-consumption` with `billId` + `isExtraBilled: !r.isCovered`.

### 4.4 Patient package card
`GET /package-consumption/usage/:packageId/:patientId` → "Used 2/2 CBC, 1/3 surgeon rounds" progress bars.

---

## 5. Verification status

| Check | Result |
|---|---|
| Migration `phase_3_2_packages` | ✅ applied |
| Auto-SKU creation | ✅ tx creates `itemType=PACKAGE` SKU linked 1:1; orphan adoption; live PKG-EHC/PKG-LAP-CHOL SKUs verified |
| Quota scenario (1st/2nd covered, 3rd extra) | ✅ unit (full matrix) + **live ledger** (3 rows, 1 extra-billed) |
| Seed | ✅ live: 2 packages / 5 components / 3 consults / 5 exclusions; idempotent |
| `npm run test` | ✅ 35 suites · 306 passed · 1 todo (15 new) |
| `npm run build` | ✅ clean |

## 6. Not in this phase (next steps)

- **Patient package purchase/assignment** record (validity window start, panel-specific pricing) — consumption engine is already keyed for it.
- **Billing integration**: auto `evaluateConsumption` per bill line + auto `recordConsumption` on bill finalize.
- **Room upgrade delta**: IPD admission enforcing `roomTypeId` binding / computing room-rent delta for upgrades.
- **OPD health-check appointment bundling**: book all package consults in one flow within `validityDays`.