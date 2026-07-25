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

## Endpoints

### Auth
- `POST /api/auth/register` `{ name, username, password, role }`
- `POST /api/auth/login` `{ username, password, role }` → `{ token, user, userRole }`
- `GET /api/auth/me` (Bearer token)
- `POST /api/auth/logout`

Roles: `Tester` | `Reviewer` | `Authorizer`

### Jobs
- `GET /api/jobs`
- `GET /api/jobs/:jobId`
- `POST /api/jobs` `{ name, capacity, type }`
- `PATCH /api/jobs/:jobId/rating` `{ ratingData }`

### Tests
- `PATCH /api/jobs/:jobId/tests/:testId/observation` `{ observationData }`
- `PATCH /api/jobs/:jobId/tests/:testId/stage` `{ stage, action: 'promote'|'reject' }`
- `PATCH /api/jobs/:jobId/tests/:testId/accept`
- `POST /api/jobs/:jobId/tests/accept-all`

## Storage

JSON file at `data/volttrack.json` (passwords hashed with bcrypt).
