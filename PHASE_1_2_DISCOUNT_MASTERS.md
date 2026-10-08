# Phase 1.2 — Discount Reason & Discount Approval Authority Masters

## 1. What we did

1. **Added a Discount Reason master.** Each hospital keeps its own list of reasons for a discount, such as "Staff Welfare", "EWS / Poor Patient" or "Doctor Discretion". A reason can have its own maximum discount %.
2. **Added a Discount Approval Authority master.** Each hospital role (for example Billing Executive, Billing Manager or Medical Superintendent) gets a maximum discount % it can approve. It can also get an optional maximum amount (₹) per bill.

Both masters are tenant-scoped and support full CRUD with soft delete.

---

## 2. What changed

### 2.1 Database (`prisma/schema.prisma`)

| Change | Detail |
|---|---|
| `DiscountReason` (`discount_reasons`) | UUID `id`, `tenantId`, `name`, `code`, `description?`, `maxDiscountPercent?` (Decimal 5,2), `isActive`, `deletedAt?`, timestamps. Unique on `[tenantId, code]`. |
| `DiscountApprovalAuthority` (`discount_approval_authorities`) | UUID `id`, `tenantId`, `hospitalRoleId` (FK → `HospitalRole`, cascade), `maxDiscountPercent` (Decimal 5,2), `maxDiscountAmount?` (Decimal 12,2), `description?`, `isActive`, `deletedAt?`, timestamps. Unique on `[tenantId, hospitalRoleId]`, so each role has one authority. |
| `Hospital` | Added relations `discountReasons` and `discountApprovalAuthorities`. |
| `HospitalRole` | Added relation `discountApprovalAuthorities`. |

**Migration:** `prisma/migrations/20261007082149_phase_1_2_discount_masters/migration.sql`. It only adds new tables, indexes and foreign keys. It was created with `--create-only` and has **not been applied yet**.

### 2.2 New modules (`src/hospital/masters/`)

```
discount-reason/
  dto/ create-discount-reason.dto.ts, update-discount-reason.dto.ts
  discount-reason.controller.ts, discount-reason.service.ts,
  discount-reason.repository.ts, discount-reason.module.ts
discount-approval-authority/
  dto/ create-discount-approval-authority.dto.ts, update-discount-approval-authority.dto.ts
  discount-approval-authority.controller.ts, discount-approval-authority.service.ts,
  discount-approval-authority.repository.ts, discount-approval-authority.module.ts
```

Both modules are registered in `masters.module.ts` (imports and exports). Every controller uses `HospitalJwtAuthGuard`. `tenantId` comes from `@CurrentTenant()` and is included in every query.

### 2.3 Business rules

- **Discount Reason**
  - `code` is trimmed and uppercased. It may contain only `A-Z 0-9 _ -`.
  - A duplicate `code` in the same tenant returns `409 Conflict`.
  - `maxDiscountPercent` must be between 0 and 100, with up to 2 decimals.
  - Delete is a soft delete: it sets `deletedAt` and `isActive = false`. A soft-deleted reason still holds its code, so the same code cannot be reused. This matches Phase 1.1.
- **Discount Approval Authority**
  - `hospitalRoleId` must belong to the current tenant. Otherwise the API returns `404 Hospital role not found`. This stops one tenant from pointing at another tenant's role.
  - A role can have only one active authority. Creating a second one returns `409 Conflict`.
  - If the role's authority was soft-deleted earlier, `POST` **restores** that row with the new values. You get a working record instead of a conflict.
  - Responses include the role: `hospitalRole { id, isActive, roleName { id, name, code } }`.
  - The list is sorted by `maxDiscountPercent`, lowest first, so the approval escalation order is easy to read.

---

## 3. API reference

The global prefix is `api`. All endpoints need the header `Authorization: Bearer <hospital access token>`.

### 3.1 Discount Reasons

| Method | Path | Notes |
|---|---|---|
| POST | `/api/hospital/masters/discount-reasons` | Create |
| GET | `/api/hospital/masters/discount-reasons?active=true` | List, sorted by name. The `active` filter is optional. |
| GET | `/api/hospital/masters/discount-reasons/:id` | UUID |
| PATCH | `/api/hospital/masters/discount-reasons/:id` | Partial update |
| DELETE | `/api/hospital/masters/discount-reasons/:id` | Soft delete |

Example body:

```json
{
  "name": "Staff Welfare",
  "code": "STAFF",
  "description": "Discount for hospital employees and dependants",
  "maxDiscountPercent": 50,
  "isActive": true
}
```

### 3.2 Discount Approval Authorities

| Method | Path | Notes |
|---|---|---|
| POST | `/api/hospital/masters/discount-approval-authorities` | Create, or restore a soft-deleted one |
| GET | `/api/hospital/masters/discount-approval-authorities?active=true` | List, sorted by `maxDiscountPercent` |
| GET | `/api/hospital/masters/discount-approval-authorities/:id` | UUID |
| PATCH | `/api/hospital/masters/discount-approval-authorities/:id` | Partial update. A new `hospitalRoleId` is checked against the tenant. |
| DELETE | `/api/hospital/masters/discount-approval-authorities/:id` | Soft delete |

Example body:

```json
{
  "hospitalRoleId": 12,
  "maxDiscountPercent": 10,
  "maxDiscountAmount": 5000,
  "description": "Billing executive can approve up to 10% or ₹5,000"
}
```

> Prisma returns `Decimal` fields as strings in JSON, for example `"10.00"`.

---

## 4. Deployment

```bash
npx prisma migrate deploy   # or: npx prisma migrate dev
npx prisma generate
```

## 5. Next step (not in this phase)

Apply these masters in billing. When a discount is applied to an `OpdBill`, the effective limit should be the lower of:

- the reason's `maxDiscountPercent`, and
- the approving user's role authority (`maxDiscountPercent` and `maxDiscountAmount`).
