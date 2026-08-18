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
- API: same origin `/api` (reverse-proxy to Express). Set `CORS_ORIGINS` / `APP_URL` on the server (see `server/.env.example`).

Or separately:
- `npm run dev:server` — API only
- `npm run dev` — frontend only (proxies `/api` → `:4000`)

### Auth roles
Register/login as **Tester**, **Reviewer**, or **Authorizer**. Passwords are hashed in MongoDB (`users` collection).

Set `MONGODB_URI` in `.env` (default: `mongodb://127.0.0.1:27017/volttrack`).
