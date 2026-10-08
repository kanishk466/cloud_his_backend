# Phase 1.1 — Basic Masters & Patient Schema Fix

## 1. What we did

1. **Fixed the patient mobile constraint.** In Indian healthcare, family members (father, mother, children) often share one mobile number. The DB no longer enforces one patient per mobile.
2. **Added soft duplicate detection** at registration. A patient is rejected only if the same mobile **and** the same first name already exist.
3. **Added Geo masters.** Country, State and City are system-level lookups shared by all tenants.
4. **Added tenant-scoped masters.** Bank and Patient Document Type, with full CRUD and soft delete.

---

## 2. What changed

### 2.1 Database (`prisma/schema.prisma`)

| Change | Detail |
|---|---|
| `Patient` | Removed `@@unique([tenantId, mobile])`. Kept `@@index([tenantId, mobile])`. |
| `Country` (`countries`) | `id`, `name` (unique), `isoCode` (unique), `phoneCode?`, `isActive` |
| `State` (`states`) | `id`, `name`, `stateCode?`, `countryId` (FK, cascade), `isActive`. Unique on `[countryId, name]`. |
| `City` (`cities`) | `id`, `name`, `stateId` (FK, cascade), `isActive`. Unique on `[stateId, name]`. |
| `Bank` (`banks`) | UUID `id`, `tenantId`, `bankName`, `branchName?`, `ifscCode?`, `accountNumber?`, `accountType?`, `isActive`, `deletedAt?`. Unique on `[tenantId, bankName, accountNumber]`. |
| `PatientDocumentType` (`patient_document_types`) | UUID `id`, `tenantId`, `name`, `code`, `description?`, `isRequired`, `isActive`, `deletedAt?`. Unique on `[tenantId, code]`. |
| `Hospital` | Added relations `banks` and `patientDocumentTypes`. |

`Bank` and `PatientDocumentType` also have `createdAt` and `updatedAt`.

**Migration:** `prisma/migrations/20261007075901_phase_1_1_basic_masters/migration.sql`

### 2.2 Patient registration

- `src/hospital/opd/patients/patients.repository.ts`: new `findByMobileAndFirstName(tenantId, mobile, firstName)`. It matches the first name case-insensitively on the trimmed value and ignores soft-deleted patients.
- `src/hospital/opd/patients/patients.service.ts`: `register()` no longer blocks on mobile alone. It throws `ConflictException` with `{ code: 'PATIENT_DUPLICATE_RECORD' }` only when both mobile and first name match. The Aadhaar duplicate check is unchanged.

### 2.3 New modules (`src/hospital/masters/`)

```
geo/
  dto/ create-country.dto.ts, create-state.dto.ts, create-city.dto.ts
  geo.controller.ts, geo.service.ts, geo.repository.ts, geo.module.ts
bank/
  dto/ create-bank.dto.ts, update-bank.dto.ts
  bank.controller.ts, bank.service.ts, bank.repository.ts, bank.module.ts
patient-document-type/
  dto/ create-document-type.dto.ts, update-document-type.dto.ts
  document-type.controller.ts, document-type.service.ts,
  document-type.repository.ts, document-type.module.ts
```

All three are registered in `masters.module.ts` (imports and exports). Every controller uses `HospitalJwtAuthGuard`. Bank and Document Type take `tenantId` from `@CurrentTenant()` and put it in every query.

### 2.4 Tests

- `patients/tests/patients.service.spec.ts`: rewrote the `register` tests, which were stale, with a `PrismaService` mock added. They cover successful registration, a duplicate mobile and first name (`PATIENT_DUPLICATE_RECORD`), a family member with the same mobile but a different first name, and a duplicate Aadhaar.
- `patients/tests/patients.controller.spec.ts`: was empty, which made the suite fail. It now has a single `it.todo` placeholder.

---

## 3. API reference

The global prefix is `api`, so every path starts with `/api`. All endpoints need the header `Authorization: Bearer <hospital access token>`.

### 3.1 Geo

| Method | Path | Body / Notes |
|---|---|---|
| POST | `/api/hospital/masters/geo/countries` | `{ name, isoCode (2–3 letters, uppercased), phoneCode?, isActive? }` |
| GET | `/api/hospital/masters/geo/countries` | Active countries, sorted by name |
| POST | `/api/hospital/masters/geo/states` | `{ name, stateCode?, countryId, isActive? }` |
| GET | `/api/hospital/masters/geo/countries/:countryId/states` | Active states of a country |
| POST | `/api/hospital/masters/geo/cities` | `{ name, stateId, isActive? }` |
| GET | `/api/hospital/masters/geo/states/:stateId/cities` | Active cities of a state |

### 3.2 Banks

| Method | Path | Notes |
|---|---|---|
| POST | `/api/hospital/masters/banks` | Create |
| GET | `/api/hospital/masters/banks?active=true` | List (the `active` filter is optional) |
| GET | `/api/hospital/masters/banks/:id` | UUID |
| PATCH | `/api/hospital/masters/banks/:id` | Partial update |
| DELETE | `/api/hospital/masters/banks/:id` | Soft delete (sets `deletedAt`, `isActive=false`) |

Body fields:
- `bankName` is required.
- `ifscCode` is optional, must match `^[A-Z]{4}0[A-Z0-9]{6}$`, and is uppercased automatically.
- `accountType` is optional and must be `SAVINGS` or `CURRENT` (case is normalized).
- `accountNumber` is optional, 6–34 alphanumeric characters.
- `branchName` and `isActive` are optional.

### 3.3 Patient Document Types

| Method | Path | Notes |
|---|---|---|
| POST | `/api/hospital/masters/document-types` | Create |
| GET | `/api/hospital/masters/document-types?active=true` | List |
| GET | `/api/hospital/masters/document-types/:id` | UUID |
| PATCH | `/api/hospital/masters/document-types/:id` | Partial update |
| DELETE | `/api/hospital/masters/document-types/:id` | Soft delete |

Body fields:
- `name` and `code` are required. `code` is auto-uppercased and may contain only `A-Z 0-9 _ -`.
- `description`, `isRequired` and `isActive` are optional.

### 3.4 Error codes

| Status | When |
|---|---|
| 400 | Validation failed (the app uses `whitelist` and `forbidNonWhitelisted`, so unknown fields are rejected) |
| 401 | Missing or invalid token |
| 404 | Record not found, soft-deleted, or belonging to another tenant |
| 409 | Unique violation, or `PATIENT_DUPLICATE_RECORD` on patient registration |

---

## 4. How to test

### 4.1 Automated

```bash
npx prisma migrate dev --name phase_1_1_basic_masters   # already applied; use `npx prisma migrate status` to check
npm run test      # 2 suites pass, 6 tests + 1 todo
npm run build     # must exit 0
```

### 4.2 Manual API workflow

Use Postman or curl. Start the server with `npm run start:dev`.

**Step 0 — Login (get a token)**
```bash
curl -X POST http://localhost:3000/api/hospital/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.com","password":"******"}'
```
Copy `accessToken` and use it as `TOKEN` below. If the account has 2FA enabled, the response asks for an OTP instead of returning a token. Complete that step first. The port may differ in your setup.

**Step 1 — Geo chain (Country, then State, then City)**
```bash
H='-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"'

curl -X POST .../api/hospital/masters/geo/countries $H -d '{"name":"India","isoCode":"in","phoneCode":"+91"}'
#  -> 201, isoCode returned as "IN"; note the returned id (e.g. 1)

curl -X POST .../api/hospital/masters/geo/states $H -d '{"name":"Maharashtra","stateCode":"MH","countryId":1}'
curl -X POST .../api/hospital/masters/geo/cities $H -d '{"name":"Pune","stateId":1}'

curl .../api/hospital/masters/geo/countries/1/states $H
curl .../api/hospital/masters/geo/states/1/cities    $H
```
Expected:
- Posting the same country again returns **409**.
- `countryId: 9999` returns **404**.

**Step 2 — Bank CRUD**
```bash
# Create
curl -X POST .../api/hospital/masters/banks $H -d '{
  "bankName":"State Bank of India","branchName":"Pune Main",
  "ifscCode":"sbin0001234","accountNumber":"123456789012","accountType":"savings"}'
#  -> 201, ifscCode "SBIN0001234", accountType "SAVINGS"

# Negative cases
#  ifscCode "ABC123"            -> 400 (invalid IFSC)
#  accountType "FIXED"          -> 400
#  same bankName + accountNumber again -> 409

curl .../api/hospital/masters/banks $H                      # list
curl .../api/hospital/masters/banks/<id> $H                 # get one
curl -X PATCH .../api/hospital/masters/banks/<id> $H -d '{"branchName":"Pune Camp"}'
curl -X DELETE .../api/hospital/masters/banks/<id> $H       # soft delete
curl .../api/hospital/masters/banks/<id> $H                 # -> 404 now
```

**Step 3 — Document Type CRUD**
```bash
curl -X POST .../api/hospital/masters/document-types $H -d '{
  "name":"Aadhaar Card","code":"aadhaar","isRequired":true}'
#  -> 201, code "AADHAAR"

curl -X POST .../api/hospital/masters/document-types $H -d '{"name":"Dup","code":"AADHAAR"}'   # -> 409
curl -X PATCH .../api/hospital/masters/document-types/<id> $H -d '{"code":"aadhar_id"}'        # code becomes AADHAR_ID
curl -X DELETE .../api/hospital/masters/document-types/<id> $H
```

**Step 4 — Tenant isolation (important)**
1. Log in as a user from **Hospital A** and create a bank. Note its id.
2. Log in as a user from **Hospital B** and call `GET /api/hospital/masters/banks/<id from A>`.
3. Expected: **404**, and Hospital B's list does not contain it.
4. Repeat for `PATCH` and `DELETE`. Both must return 404.

**Step 5 — Patient registration (soft duplicate)**
Endpoint: `POST /api/opd/patients`. Use your normal valid registration payload and change only `firstName` and `mobile`.

| # | `firstName` | `mobile` | Expected |
|---|---|---|---|
| 1 | `Ramesh` | `9876543210` | 201, new UHID |
| 2 | `Sunita` | `9876543210` | 201, same mobile but different name is allowed |
| 3 | `  ramesh ` | `9876543210` | **409** `PATIENT_DUPLICATE_RECORD` (case and whitespace ignored) |
| 4 | `Ramesh` | `9123456780` | 201, same name but different mobile is allowed |

### 4.3 Verify in the database
```sql
-- The old unique index must be gone, the plain index must remain
SELECT indexname FROM pg_indexes WHERE tablename = 'patients' AND indexname LIKE '%mobile%';
-- expect only: patients_tenantId_mobile_idx

SELECT * FROM banks WHERE "deletedAt" IS NOT NULL;   -- soft-deleted rows stay in the table
```

---

## 5. Known limitations

- **Soft delete and unique keys:** Soft-deleted banks and document types still count against their unique constraints. Re-creating one with the same key returns 409.
- **Bank uniqueness:** Postgres treats a null `accountNumber` as distinct, so two banks with the same name and no account number are both allowed.
- **Geo writes:** Geo POST endpoints are open to any authenticated hospital user. Consider restricting them to platform admins.
- **Duplicate race:** The patient duplicate check is application-level only. There is no DB constraint, so two simultaneous requests could both pass it.
- **Route prefix:** The routes follow the existing `hospital/masters/...` convention, not the shorter `/masters/...` from the original brief.
