# Deployment

**Status: this application has not been deployed anywhere by its author.** The steps below were
verified locally: `npm run build` + `npm start`, and the Docker image built from `Dockerfile`
running against PostgreSQL 16. Nothing has been tested on a specific cloud provider.

## 1. Requirements

- Node.js 22 (or Docker)
- PostgreSQL 15 or 16 with a **superuser or database-owner** login for migrations
- Persistent disk (or volume) for uploaded media
- HTTPS in front of the app (reverse proxy / platform TLS) for production cookies

## 2. Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_ADMIN_URL` | migrations only | Owner connection. Never give it to the running app. |
| `DATABASE_URL` | yes | Connection as `rii_app` (non-owner, RLS applies). |
| `SESSION_SECRET` | yes | ≥ 32 random characters (`openssl rand -hex 32`). The app refuses to issue sessions in production without it. |
| `APP_URL` | yes | Public base URL, e.g. `https://furniture.example.co.id`. Used in invite/reset links and QR codes. Cookies are `Secure` when it starts with `https`. |
| `UPLOAD_DIR` | yes | Directory for media files (Docker: `/data/uploads`, mount a volume). |
| `SHOW_DEMO_ACCOUNTS` | recommended | Set `false` in production to hide the demo-login picker. |
| `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` | bootstrap only | First administrator for `npm run db:bootstrap`. |

## 3. Database setup (real installation, no demo data)

```bash
# with DATABASE_ADMIN_URL pointing at the empty database
ADMIN_EMAIL=it@company.co.id ADMIN_NAME="IT Admin" ADMIN_PASSWORD='a-long-passphrase-123' npm run db:bootstrap
```

This applies migrations, creates roles/permissions/settings, the first administrator, the 50 website
templates and a primary website (published v1). It is idempotent and never truncates data.

**Then change the application role's password** (migration 003 creates `rii_app` with the password `rii_app`):

```sql
ALTER ROLE rii_app PASSWORD 'another-long-random-secret';
```

and use it in `DATABASE_URL`. After logging in as the administrator: create warehouses & locations,
categories, products and stock (Inventory), invite users (Admin → Users; invitation links appear in
Settings → Outbox because email delivery is not implemented), and publish the website.

> `npm run db:seed` / `db:reset` **wipe the database** and load demo data. Never run them against production.

## 4. Option A — Docker (single server)

```bash
cp .env.example .env
# set SESSION_SECRET, APP_URL, POSTGRES_PASSWORD, RII_APP_PASSWORD, SHOW_DEMO_ACCOUNTS=false
docker compose up -d db
docker compose run --rm -e ADMIN_EMAIL=… -e ADMIN_NAME=… -e ADMIN_PASSWORD=… migrate npm run db:bootstrap
docker compose exec db psql -U rii -d rii -c "ALTER ROLE rii_app PASSWORD '<RII_APP_PASSWORD>'"
docker compose up -d app
```

Put a TLS-terminating reverse proxy (Caddy, Nginx, Traefik) in front of port 3000. Back up the
`pgdata` and `uploads` volumes.

## 5. Option B — Managed PostgreSQL (e.g. Supabase) + Node host

1. Create the project/database. Use the **direct** (non-pooled, port 5432) connection string as
   `DATABASE_ADMIN_URL` for migrations — the `postgres` user on Supabase can create the `rii_app` role.
2. Run `npm run db:bootstrap` from your machine or CI with that URL.
3. Set the `rii_app` password (above). `DATABASE_URL` = `postgres://rii_app:<password>@<host>:5432/postgres`
   (or the session-mode pooler). The app sets per-transaction settings (`SET LOCAL`), which is compatible
   with transaction pooling, but this combination has **not been tested**.
4. Deploy the Next.js app (`npm run build && npm start`, or the Docker image) to a host with a
   persistent disk for `UPLOAD_DIR`. Serverless platforms without persistent disk need a storage
   adapter first (see below).
5. Supabase Auth and Supabase Storage are **not** used; authentication is built in.

## 6. Media storage

Uploads use a local-disk adapter (`src/lib/services/media.ts`, `storage.put/remove`). For object storage
(S3, Supabase Storage, R2) reimplement those two functions and the `/media/[...key]` route. Uploaded SVGs
are checked for scripts and served with a sandboxing CSP; all files are served with `nosniff`.

## 7. Operations checklist

- [ ] HTTPS, `APP_URL` with `https://`
- [ ] `SESSION_SECRET` set, `SHOW_DEMO_ACCOUNTS=false`
- [ ] `rii_app` password changed; `DATABASE_ADMIN_URL` not present in the app's environment
- [ ] Daily PostgreSQL backups + `UPLOAD_DIR` backups
- [ ] Run `npm run db:migrate` (owner URL) on each release before starting the new version
- [ ] Timezone: the app computes dates in Asia/Jakarta itself; server TZ does not matter

## Railway (one click from GitHub)

`railway.json` makes Railway build `Dockerfile.cloud`, whose start script (`scripts/cloud-start.ts`) runs migrations,
rotates the `rii_app` password, loads DEMO data when the database is empty (`SEED_DEMO=false` to skip; then use
`npm run db:bootstrap`), and starts Next.js as the non-owner `rii_app` role.

1. New Project → Deploy from GitHub repo → this repo.  2. Add → Database → PostgreSQL.
3. App service → Variables: `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `SESSION_SECRET=<openssl rand -hex 32>`,
   `SHOW_DEMO_ACCOUNTS=true` (demo only).  4. Settings → Networking → Generate Domain.
5. Optional: add a Volume mounted at `/data/uploads` so uploaded media survives redeploys.
