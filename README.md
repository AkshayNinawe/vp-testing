<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b87f23a1-3723-43c8-980b-e280cdf536e2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` (JWT/API settings are included)
3. Run backend + frontend together:
   `npm run dev:all`

- Frontend: http://localhost:3000
- API: http://localhost:4000

Or separately:
- `npm run dev:server` — API only
- `npm run dev` — frontend only (proxies `/api` → `:4000`)

### Auth roles
Register/login as **Tester**, **Reviewer**, or **Authorizer**. Passwords are hashed in MongoDB (`users` collection).

Set `MONGODB_URI` in `.env` (default: `mongodb://127.0.0.1:27017/volttrack`).
