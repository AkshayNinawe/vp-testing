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

## Production (https://test.apivishvaspower.com/)

Serve the Vite build from that host and reverse-proxy `/api` to this Express app.

Backend env (see `server/.env.example`):

```
APP_URL=https://test.apivishvaspower.com
CORS_ORIGINS=https://test.apivishvaspower.com,http://localhost:3000
```

Frontend production build uses empty `VITE_API_URL` so requests go to same-origin `/api`.

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
- `PATCH /api/jobs/:jobId/tests/:testId/stage` `{ stage, action: 'promote'|'reject' }`
  - Promote `Tested` → `Reviewed` requires Technician selected
  - Promote `Reviewed` → `Authorized` requires Reviewer selected
  - Sign-off keys: default `tested_by` / `reviewed_by` / `authorized_by`;
    POST-CONNECTION uses `pct_*`; POST-TANKING uses `pt_*`;
    FINAL LV uses `offered_by` (technician) and `tested_by` (reviewer)
  - Reject clears matching `pct_*` / `pt_*` / `offered_*` sign-off fields
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
