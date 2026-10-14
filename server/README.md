# VoltTrack API Server

Express backend for authentication, jobs, and test workflow.

## Run

```bash
npm install
npm run dev:server
```

API: `http://localhost:4000`

With frontend proxy (recommended):

```bash
npm run dev:all
```

Frontend: `http://localhost:3000` → proxies `/api` to backend.

## Production (https://test.apivishvaspower.online/)

Frontend is hosted separately and calls the VPS API at `https://vishwaspower.in/volttrack/api`.

Backend env (see `server/.env.example`):

```
APP_URL=https://test.apivishvaspower.online
CORS_ORIGINS=https://test.apivishvaspower.online,https://test.apivishvaspower.com,http://localhost:3000
API_BASE_PATH=/volttrack
```

Frontend production build sets `VITE_API_URL=https://vishwaspower.in/volttrack`.

Also allow the previous host `https://test.apivishvaspower.com` in CORS if both domains are used.

## Endpoints

### Auth
- `GET /api/auth/registration-status` → `{ canBootstrapAuthorizer }`
- `POST /api/auth/register` `{ name, username, password, role }`
  - First account (no Authorizer yet): role must be `Authorizer`
  - After that: Bearer token of an Authorizer required; role must be `Tester` or `Reviewer`
- `POST /api/auth/login` `{ username, password, role }` → `{ token, user, userRole }`
- `GET /api/auth/me` (Bearer token)
- `POST /api/auth/logout`

Roles: `Tester` | `Reviewer` | `Authorizer`

### Jobs
- `GET /api/jobs`
- `GET /api/jobs/:jobId`
- `POST /api/jobs` `{ name, capacity, type }`
  - Job name is normalized to `V/M/{number}` (bare `V/M/` rejected)
  - Rating Sr. No is set from the job name digits
- `DELETE /api/jobs/:jobId` (Authorizer only)
- `PATCH /api/jobs/:jobId/rating` `{ ratingData }`

### Tests
- `PATCH /api/jobs/:jobId/tests/:testId/observation` `{ observationData }`
  - Tester cannot change Reviewer / Authorizer sign-off fields
  - Reviewer cannot change Technician / Authorizer sign-off fields
  - Reviewer cannot edit observations after stage is `Authorized` (view-only in UI except HV Testing, which stays locked)
- `PATCH /api/jobs/:jobId/tests/:testId/stage` `{ stage, action: 'promote'|'reject', note? }`
  - Promote `Tested` → `Reviewed` requires Technician selected
  - Promote `Reviewed` → `Authorized` requires Reviewer selected
  - Sign-off keys: default `tested_by` / `reviewed_by` / `authorized_by`;
    POST-CONNECTION uses `pct_*`; POST-TANKING uses `pt_*`;
    FINAL LV uses `offered_by` (technician) and `tested_by` (reviewer)
  - Reject requires `note` (stored as `rejection_note` / `rejection_by` / `rejection_at` /
    `rejection_from_stage` / `rejection_to_stage` on the test observation)
  - Reject role rules: Reviewer `Reviewed` → `Tested`; Authorizer `Authorized` → `Reviewed`
  - Reject clears matching `pct_*` / `pt_*` / `offered_*` sign-off fields
  - Promote clears prior rejection note fields
- `PATCH /api/jobs/:jobId/tests/:testId/accept`
- `PATCH /api/jobs/:jobId/tests/:testId/unaccept` (take back accepted offer if still Not Started)
- `POST /api/jobs/:jobId/tests/accept-all`

### Staff (Authorizer only)
Powers the **Registered Staff** page (list / edit / delete) and Add Staff form.
- `GET /api/users` → `{ users }` (public fields only; newest first)
- `PATCH /api/users/:userId` `{ name?, username?, role?, password? }`
  - Cannot demote yourself from Authorizer
  - Cannot promote Tester/Reviewer to Authorizer here
  - Password optional; if set, min 4 characters
- `DELETE /api/users/:userId` (cannot delete self / last Authorizer)
- `POST /api/auth/register` remains for creating Tester/Reviewer (and bootstrap Authorizer)

### Sign-off name lists (UI + server constants in `signOff.ts`)
- Technicians: NITIN PATIL, PANKAJ KAWALE, AKASH PANCHESWAR, CHANCHALESH RABALE, ROHIT SONEWANE, RIPEKSHIT TUMBALE, ABHIJIT KHARKATE, HEMANT BHAGAT
- Reviewers: GAURAV KUREKAR, KAPIL GAUTAM, HEMANT BHAGAT, PANKAJ KAWALE
- Authorizers: KIRAN JOHARAPURKAR, SHREYAS BHAVE, VIKAS CHAUHAN

## Maintenance scripts

Run from the repo root (on the VPS: `/var/www/volttrack-api/testing`). Both read
`MONGODB_URI` from `.env` and support `--dry-run`.

### Create a staff account (`createAuthorizer.ts`)

The API intentionally has **no path** for creating an `Authorizer` after the first
one — `POST /auth/register` allows an Authorizer to create only Tester/Reviewer,
and `PATCH /users/:userId` refuses to promote staff to Authorizer. That is a
security control (Authorizer is the final approval tier), so it is not relaxed.
This script is the deliberate, auditable way to onboard a new Authorizer.

Passwords are bcrypt hashed, so inserting a user by hand in `mongosh` produces an
account that **can never log in**. This script reuses the real `hashPassword()`
helper, so the document is identical to one created through the API.

```bash
# list existing users (username / role / name)
npx tsx server/scripts/createAuthorizer.ts --list

# preview, then apply
npx tsx server/scripts/createAuthorizer.ts \
  --name "SHREYAS BHAVE" --username shreyas --password "<secret>" --dry-run
npx tsx server/scripts/createAuthorizer.ts \
  --name "SHREYAS BHAVE" --username shreyas --password "<secret>"
```

Flags: `--name`, `--username` (lowercased, must be unique), `--password` (min 4),
`--role` (`Tester`|`Reviewer`|`Authorizer`, default `Authorizer`), `--dry-run`, `--list`.

Refuses to run if the username already exists. No `pm2 restart` needed — users are
read per request.

> Note: the **sign-off dropdown** names are a separate thing — they come from the
> hardcoded lists in `signOff.ts` / `App.tsx` (see above), not from the `users`
> collection. Creating a login account does **not** add a name to those dropdowns,
> and vice versa.

### Repair job statuses (`backfillJobStatus.ts`)

Recomputes every job's stored `status` from its tests via `recomputeJobStatus()`.
Needed because `status` is persisted, not derived on read — so jobs saved by older
code can be stuck on `Processing` after being fully authorized.

```bash
npx tsx server/scripts/backfillJobStatus.ts --dry-run
npx tsx server/scripts/backfillJobStatus.ts
```

Idempotent — safe to re-run.

## Storage

MongoDB collections:
- `users`
- `jobs`

Configure with:

```
MONGODB_URI=mongodb://127.0.0.1:27017/volttrack
MONGODB_DB=volttrack
```

For Atlas, put your connection string in `.env` as `MONGODB_URI`.