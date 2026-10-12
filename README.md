<div align="center">
</div>



## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` (JWT/API settings are included)
3. Run backend + frontend together:
   `npm run dev:all`

- Frontend: http://localhost:3000
- API: http://localhost:4000

### Production
- Frontend: https://test.apivishvaspower.com/
- API: https://vishwaspower.in/volttrack/api (`VITE_API_URL=https://vishwaspower.in/volttrack`)

Or separately:
- `npm run dev:server` — API only
- `npm run dev` — frontend only (proxies `/api` → `:4000`)

### Auth roles
Register/login as **Tester**, **Reviewer**, or **Authorizer**. Passwords are hashed in MongoDB (`users` collection).

Set `MONGODB_URI` in `.env` (default: `mongodb://127.0.0.1:27017/volttrack`).

### Maintenance scripts

Recompute stored job `status` (`Processing` / `Completed`) for existing records:

```bash
npx tsx server/scripts/backfillJobStatus.ts --dry-run   # preview
npx tsx server/scripts/backfillJobStatus.ts             # apply
```

See [FRONTEND_HANDOFF_JOB_STATUS_FIX.md](./FRONTEND_HANDOFF_JOB_STATUS_FIX.md) for
the job-status rule and when this backfill is needed.
