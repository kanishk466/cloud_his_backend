# Phase 1.3 — User & Role Management Polish

> **Audience:** backend reviewers, QA, and the frontend team integrating the User & Role Management screens.
> **Module:** `src/hospital/user-management/` · **Migration:** `20261007094349_phase_1_3_user_role_polish`

---

## 1. What we did

1. **Audit tracking on users and roles.** `HospitalUser` and `HospitalRole` now record `createdBy`, `updatedBy` (the acting admin's user id) and support soft delete via `deletedAt`.
2. **Safe deactivation.** Changing a user to `INACTIVE` (or soft-deleting them) now **logs them out everywhere in the same transaction**: all active `AuthSession` rows are revoked and `refreshTokenHash` is cleared. Before this phase, a deactivated user could keep using an already-issued token until it expired.
3. **Bulk department mapping.** One `PUT` call atomically replaces a user's department list instead of add/remove one-by-one.
4. **Bulk role assignment.** One `PUT` call atomically replaces a user's roles, with a hard rule that **exactly one role must be primary**.
5. **Effective permissions helper.** One endpoint returns the user's complete, deduplicated permission set — direct grants **plus** everything inherited from their active roles — so the frontend can render menus/guards without doing the merge itself.
6. **Role management hardening.** Duplicate-role protection per hospital is verified and tested; role permission sync runs in a single transaction; soft-deleted roles can no longer be assigned to users.

---

## 2. Why (the reasoning)

| Decision | Reason |
|---|---|
| Revoke sessions **inside the same DB transaction** as the status change | A user can never be left in a "status = INACTIVE but still has a live session" half state. Either both happen or neither does. |
| Clear `refreshTokenHash` on deactivate / delete / admin password-reset | Refresh tokens are long-lived; clearing the hash forces a full re-login even if the access token is still valid. |
| Atomic replace for departments/roles (`deleteMany` + `createMany` in one tx) | The client sends the **final desired state**. No drift, no partial updates, no ordering bugs. |
| Exactly one primary role | Reporting, salary/HR flows and UI badges assume a single "main" role per user. Enforced in the service (not just DTO) so it can't be bypassed. |
| Soft delete (`deletedAt`) instead of hard delete | Users own history everywhere (bills, appointments, audit logs). Hard delete would break referential integrity and audit trails. Soft-deleted users are hidden from all list/get/validation queries but their records remain. |
| `createdBy`/`updatedBy` as plain `String` (user id) | Lightweight audit without an FK that would block deleting audit-related rows later. Full event history stays in `AuditLog`. |
| Effective permissions merged server-side | Permission logic lives in one place. Frontend just renders what it receives — no duplicated merge rules across web/mobile clients. |

---

## 3. What changed

### 3.1 Database (`prisma/schema.prisma`)

| Model | Added columns |
|---|---|
| `HospitalUser` (`hospital_users`) | `createdBy TEXT?`, `updatedBy TEXT?`, `deletedAt TIMESTAMP?` |
| `HospitalRole` (`hospital_roles`) | `createdBy TEXT?`, `updatedBy TEXT?`, `deletedAt TIMESTAMP?` |

Migration file: `prisma/migrations/20261007094349_phase_1_3_user_role_polish/migration.sql` (6 nullable columns, **already applied** to the dev database). Zero risk for existing rows.

### 3.2 Files touched / added

```
src/hospital/user-management/
├─ controllers/
│  ├─ hospital-user.controller.ts   ← + PATCH :id/status, PUT :id/departments,
│  │                                    PUT :id/roles, DELETE :id; decorators
│  └─ hospital-role.controller.ts   ← passes acting user (updatedBy/createdBy)
├─ dto/
│  ├─ update-user-status.dto.ts        (new)
│  ├─ set-user-departments.dto.ts      (new)
│  └─ set-user-roles.dto.ts            (new)
├─ repositories/
│  ├─ hospital-user.repository.ts   ← setStatusWithSessionRevoke, softDelete,
│  │                                    syncDepartments, syncRoles,
│  │                                    effective-permissions = direct + roles
│  └─ hospital-role.repository.ts   ← audit fields, soft-delete scoping
├─ services/
│  ├─ hospital-user.service.ts      ← updateStatus/softDelete/setDepartments/setRoles
│  ├─ hospital-role.service.ts      ← performedBy threading
│  └─ tenant-validation.service.ts  ← rejects soft-deleted roles/managers
└─ tests/
   ├─ hospital-user.service.spec.ts    (new — 17 tests)
   └─ hospital-role.service.spec.ts    (new — 8 tests)
```

### 3.3 Behavioural rules to know

- Soft-deleted users are **invisible** to `GET` list/detail and cannot be used as reporting managers. Their email/username **stay reserved** (DB unique constraint) — contact a super-admin to restore or rename.
- Soft-deleted roles are invisible and **cannot be assigned** to users.
- Deactivating or deleting the **last active `SUPER_ADMIN`** of the hospital is rejected (`400`). This prevents tenant lockout.
- Role permission sync validates every `moduleId` against the hospital's **subscribed package** (entitlement check) before writing.

---

## 4. API reference (for testing)

Global prefix: **`/api`** · Auth: `Authorization: Bearer <hospital access token>` on every call · Swagger UI: `GET /api/docs`

> `:id` for users is the UUID string; for roles it is the numeric id.

### 4.1 User status toggle — `PATCH /api/hospital/users/:id/status`

**Request**
```json
{ "status": "INACTIVE" }
```
`status` must be `ACTIVE` or `INACTIVE` (400 otherwise).

**200 OK**
```json
{ "message": "User deactivated successfully", "userId": "b3f1…", "status": "INACTIVE" }
```
Side effects when `INACTIVE`: all user sessions revoked + refresh token cleared (user is logged out on all devices immediately).

**Errors**
| Status | When |
|---|---|
| 400 | Last active SUPER_ADMIN of the hospital |
| 404 | User not found (or soft-deleted) in this tenant |

### 4.2 Bulk department mapping — `PUT /api/hospital/users/:id/departments`

Replaces **all** department mappings atomically. Send the complete final list. `[]` clears all departments.

**Request**
```json
{ "departmentIds": [1, 2, 5] }
```

**200 OK**
```json
{
  "message": "User departments updated successfully",
  "departments": [
    { "id": 1, "name": "OPD", "code": "OPD" },
    { "id": 2, "name": "IPD", "code": "IPD" }
  ]
}
```

**Errors**
| Status | When |
|---|---|
| 400 | `departmentIds` has duplicates, or any id doesn't belong to this tenant (response lists the invalid ids) |
| 404 | User not found |

### 4.3 Bulk role assignment — `PUT /api/hospital/users/:id/roles`

Replaces **all** role assignments atomically. Rules: ≥ 1 role, **exactly one** `isPrimary: true`, no duplicate ids, all roles must belong to this tenant and not be soft-deleted.

**Request**
```json
{
  "roles": [
    { "hospitalRoleId": 10, "isPrimary": true },
    { "hospitalRoleId": 20, "isPrimary": false }
  ]
}
```

**200 OK**
```json
{
  "message": "User roles updated successfully",
  "roles": [
    { "hospitalRoleId": 10, "isPrimary": true,  "name": "Doctor" },
    { "hospitalRoleId": 20, "isPrimary": false, "name": "Nurse"  }
  ]
}
```

**Errors**
| Status | When |
|---|---|
| 400 | Zero or 2+ primary roles · duplicate `hospitalRoleId` · unknown/cross-tenant role ids |
| 404 | User not found |

### 4.4 Effective permissions — `GET /api/hospital/users/:id/effective-permissions`

Returns the deduplicated union of **direct user grants** and **all active-role grants**.

**200 OK** (array)
```json
[
  {
    "moduleId": 1,
    "featureId": 5,
    "moduleCode": "OPD",
    "moduleName": "OPD Management",
    "featureCode": "OPD_VIEW",
    "featureName": "View OPD",
    "isDirect": false,
    "inheritedFromRoles": ["Doctor", "OPD Manager"]
  },
  {
    "moduleId": 2,
    "featureId": 7,
    "moduleCode": "BILLING",
    "moduleName": "Billing",
    "featureCode": "BILLING_DISCOUNT",
    "featureName": "Apply Discount",
    "isDirect": true,
    "inheritedFromRoles": []
  }
]
```
- `isDirect: true` → also granted directly to the user.
- `inheritedFromRoles` → names of roles that grant it (empty when direct-only).
- A permission granted by several roles appears **once**, with all role names listed.

**Errors:** `404` user not found.

### 4.5 Soft delete user — `DELETE /api/hospital/users/:id`

**200 OK**
```json
{ "message": "User deleted successfully", "userId": "b3f1…" }
```
Sets `deletedAt`, forces `INACTIVE`, clears refresh token, revokes sessions — atomically. Same last-SUPER_ADMIN guard (400) and 404 rules as 4.1.

### 4.6 Role endpoints (existing, now audit-aware)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/hospital/roles` | Create from master (`roleNameId`) **or** custom (`roleName`). `409` if the role already exists in this hospital. Records `createdBy`. |
| GET | `/api/hospital/roles` | Active (non-deleted) roles of this hospital |
| GET | `/api/hospital/roles/master-catalog` | All master roles + `isActivatedInHospital` flag (use for the "add role" dropdown) |
| PATCH | `/api/hospital/roles/:id` | Update description. Records `updatedBy`. |
| POST | `/api/hospital/roles/:id/toggle` | `{ "isActive": false }` |
| PUT | `/api/hospital/roles/:id/permissions` | **Atomic replace** of role permissions, single transaction |
| GET | `/api/hospital/roles/:id/permissions` | Current permission list |

**PUT permissions body**
```json
{
  "moduleFeatures": [
    { "moduleId": 1, "featureId": 5 },
    { "moduleId": 2, "featureId": 7 }
  ]
}
```
`400` if a module isn't in the hospital's package (message lists the offending module ids) · `404` role not found.

---

## 5. Typical workflows

### 5.1 Onboard a staff member
```
POST /api/hospital/users                      → create user (with primary role + departments)
PUT  /api/hospital/users/:id/roles            → adjust roles later (one call, full state)
PUT  /api/hospital/users/:id/departments      → adjust departments later
GET  /api/hospital/users/:id/effective-permissions → verify what they can actually access
```

### 5.2 Role setup for a new hospital
```
GET  /api/hospital/roles/master-catalog       → what roles exist in the master list
POST /api/hospital/roles  { roleNameId }      → activate the ones you need
POST /api/hospital/roles  { roleName: "…" }   → or create a custom one
PUT  /api/hospital/roles/:id/permissions      → attach module/features (one call)
```

### 5.3 Employee exit (the important one for security)
```
DELETE /api/hospital/users/:id
```
One call: hidden from lists, can't log in, all live sessions killed, refresh token dead.
Prefer `PATCH …/status { "status": "INACTIVE" }` for temporary suspension (same security, easily reversible with `"ACTIVE"`).

---

## 6. Frontend integration guide

### 6.1 Auth / headers
```ts
api.interceptors.request.use((cfg) => {
  cfg.headers.Authorization = `Bearer ${authStore.accessToken}`;
  return cfg;
});
```
All endpoints below are tenant-scoped automatically — **never send `tenantId` yourself**; it comes from the JWT.

### 6.2 Render menus from effective permissions
```ts
// after login or when opening a user's detail page
const perms = await api.get(`/api/hospital/users/${userId}/effective-permissions`);

const canViewBilling = perms.data.some(
  (p) => p.moduleCode === 'BILLING' && p.featureCode === 'BILLING_VIEW',
);
```
- Key on the **string codes** (`moduleCode` / `featureCode`), not numeric ids — codes are stable across environments.
- Use `inheritedFromRoles` in tooltips: *"Granted via: Doctor, OPD Manager"* — great for admin UX.

### 6.3 Status toggle button
```ts
async function toggleUser(user: User) {
  const next = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await api.patch(`/api/hospital/users/${user.id}/status`, { status: next });
  // after INACTIVE → the user is logged out everywhere; show a confirmation toast
}
```
Handle `400` with message *"Cannot deactivate the last active admin"* → show as a warning banner, don't retry.

### 6.4 Role picker (multi-select with one primary)
```ts
// Local state: Map<hospitalRoleId, boolean isPrimary>
async function save(userId: string, selected: Map<number, boolean>) {
  const roles = [...selected].map(([hospitalRoleId, isPrimary]) => ({
    hospitalRoleId,
    isPrimary,
  }));
  await api.put(`/api/hospital/users/${userId}/roles`, { roles });
}
```
UX rules to mirror server rules (avoid 400s):
- enforce the **primary radio** — exactly one selected at all times (default: first selected),
- send the **full** selection every save (it's a replace, not a patch),
- populate options from `GET /api/hospital/roles` (already excludes deleted roles).

### 6.5 Department picker
Same pattern: multi-select → send complete `{ departmentIds: [...] }` on save. Empty array is valid (clears all).

### 6.6 Delete confirmation flow
```ts
await api.delete(`/api/hospital/users/${userId}`);
// 200 → remove from local list, toast "User deleted"
// 400 → last-admin warning
// 404 → already deleted by someone else → refresh list
```

### 6.7 Role permission matrix screen
1. `GET /api/hospital/roles/entitlements/modules` → modules/features the hospital's package includes (build the matrix).
2. `GET /api/hospital/roles/:id/permissions` → pre-check current boxes.
3. On save: `PUT /api/hospital/roles/:id/permissions` with **all** checked pairs (replace semantics — unchecked boxes must be **absent** from the array).

### 6.8 Error handling cheat-sheet
| Status | Meaning | UI suggestion |
|---|---|---|
| 400 | Business rule (primary-role count, duplicates, last admin, module not in package) | Inline form error using `response.data.message` |
| 401 | Token expired / session revoked | Redirect to login |
| 404 | Not found **or belongs to another tenant** | "Record not found" + refresh list |
| 409 | Duplicate (email, username, role already in hospital) | Highlight the conflicting field |

> The validation pipe is strict (`forbidNonWhitelisted`) — unknown body fields are rejected with 400. Send only documented fields.

---

## 7. Verification status

| Check | Result |
|---|---|
| `npx prisma migrate dev --name phase_1_3_user_role_polish` | ✅ applied |
| `npm run test` | ✅ 4 suites · 36 passed · 1 todo |
| `npm run build` | ✅ clean |

## 8. Not in this phase (next steps)

- Restore/undelete endpoint for soft-deleted users (currently DB-level only).
- Optional session revocation on **role change** (currently role edits apply on next permission evaluation; sessions stay alive).
- Wiring `AuditLog` events for each of these actions (fields are ready; events not emitted yet).
