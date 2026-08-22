# Unwritten Workmate

A dockerized, full-stack replica of Zoho People's Leave Tracker, built for Team Unwritten:
FastAPI + MySQL 8 backend with an admin-configurable policy engine and staged edge-case
validation pipeline, and a Next.js frontend covering employee, manager, and HR admin flows.

## Authentication

This app has **no password login** — sign-in is exclusively via Google (OAuth 2.0 authorization
code flow). Before first boot:

1. Create an OAuth 2.0 Client ID in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (type: **Web application**).
2. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback` (adjust the origin
   if not running on `localhost:3000`).
3. Copy the Client ID and Client Secret into `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
4. Set `SEED_HR_ADMIN_EMAIL` in `.env` to a **real Google account email you control** — that's the
   only account you can sign into immediately after first boot. The other seeded accounts (managers,
   employees) use placeholder `@teamunwritten.dev` addresses and can't authenticate until an HR
   admin edits their email (in `/admin/employees`) to a real Google account.

The backend independently re-verifies every Google `id_token`'s signature, issuer, audience, and
`email_verified` claim server-side (via the `google-auth` library) — it never trusts a bare email
posted by the client. An employee record must already exist with a matching email (no self-signup);
on first successful sign-in the employee's Google `sub` is bound to their record for future logins.

## Quickstart

```bash
cp .env.example .env
# edit .env: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SEED_HR_ADMIN_EMAIL (see above)
docker compose up --build
```

- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs
- Adminer (DB inspection): http://localhost:8081 (server: `mysql`, user/password from `.env`)

On first boot the backend runs Alembic migrations and seeds only the org's baseline config
(departments, leave types, policy version, holidays) plus a single **HR_ADMIN** employee —
no placeholder managers/employees. Sign in with `SEED_HR_ADMIN_EMAIL` (name from
`SEED_HR_ADMIN_NAME`), then provision the rest of the org from `/admin/employees`.

## Google Calendar

Approved leave/WFH/OD requests show an **"Add to Google Calendar"** link (leave detail page and
history list) that opens a pre-filled Google Calendar event for the employee to save themselves.
This needs no extra OAuth scope or token storage — it's a public Google Calendar template link.
Full two-way push sync (auto-creating events on approval via the Calendar API) is not implemented.

## Architecture

- `backend/app/models` — SQLAlchemy models (MySQL 8), one Alembic migration in `backend/alembic/versions`.
- `backend/app/services/validation_engine` — the 3-stage edge-case pipeline (dates & accrual →
  policy & boundary → overlap & conflict), reading every threshold from the admin-configurable
  `leave_policies` table rather than hardcoded constants.
- `backend/app/routers` — `auth`, `leave`, `admin`, `calendar` FastAPI routers.
- `frontend/app/(app)` — authenticated Next.js App Router pages (dashboard, leave apply/history,
  approvals, team calendar, admin screens including the employee org chart).
- `frontend/app/api` — route-handler proxies that hold the JWT in an httpOnly cookie and forward
  `Authorization: Bearer` to the backend; the browser never touches the raw token.

See `backend/seed/seed.py` for the full baseline policy configuration and demo data.
