# CattoPic Deployment Guide

[中文](../DEPLOYMENT.md)

## Architecture

CattoPic is deployed as one Cloudflare Worker. The Worker serves the static
Next.js export from out/ and routes /api/* to the Hono application.

| Component | Service | Purpose |
|-----------|---------|---------|
| Frontend + API | Cloudflare Worker | Next.js static assets and Hono API |
| Storage | Cloudflare R2 | Original and converted image files |
| Database | Cloudflare D1 | Image metadata, tags, and admin account |
| Sessions/cache | Cloudflare KV | Login sessions and response cache |
| Queue | Cloudflare Queues (optional) | Asynchronous R2 deletion |
| Transforms | Cloudflare Images | WebP/AVIF conversion and optimization |
| Cleanup | Cron Triggers | Retry deletion jobs and clean expired images |

## Prerequisites

- Node.js 24 or newer
- pnpm 10.x
- A Cloudflare account

Use pnpm 10 for installs. pnpm 11 can rewrite the lockfile metadata.

## 1. Create Cloudflare Resources

From the worker directory, install dependencies and log in:

    cd worker
    npx --yes pnpm@10.24.0 install --frozen-lockfile
    npx --yes pnpm@10.24.0 exec wrangler login

Create an R2 bucket, D1 database, and KV namespace. Record the IDs returned by
Wrangler:

    npx --yes pnpm@10.24.0 exec wrangler r2 bucket create cattopic-r2 --location=apac
    npx --yes pnpm@10.24.0 exec wrangler d1 create CattoPic-D1 --location=apac
    npx --yes pnpm@10.24.0 exec wrangler kv namespace create CACHE_KV

Queues are optional. Only create one when USE_QUEUE is true:

    npx --yes pnpm@10.24.0 exec wrangler queues create cattopic-delete-queue

For a new database, initialize the schema from the worker directory:

    npx --yes pnpm@10.24.0 exec wrangler d1 execute CattoPic-D1 --remote --file=schema.sql

Existing deployments should not run the schema file again.

## 2. Configure the Production Worker

Production deployment uses worker/wrangler.prod.toml. Replace its R2, D1,
and KV values with resources from your Cloudflare account. Also set:

- R2_PUBLIC_URL: the public domain used for image files.
- CORS_ORIGINS: comma-separated origins for a separate frontend domain.

Keep this section in the production configuration:

    [assets]
    directory = '../out'
    binding = 'ASSETS'
    html_handling = 'auto-trailing-slash'

When frontend and API use the same Worker domain, the current origin is
trusted automatically. Do not copy the old wrangler.example.toml flow.

## 3. Build and Deploy the Single Worker

Run these commands from the repository root:

    npx --yes pnpm@10.24.0 install --frozen-lockfile
    npx --yes pnpm@10.24.0 run build
    npx --yes pnpm@10.24.0 -C worker install --frozen-lockfile
    npx --yes pnpm@10.24.0 -C worker exec tsc --noEmit
    npx --yes pnpm@10.24.0 -C worker exec wrangler deploy --config wrangler.prod.toml

The frontend build creates out/, which Wrangler uploads as static Assets of the
same Worker. The deployment serves both the frontend and API:

    https://cattopic-worker.<your-subdomain>.workers.dev/
    https://cattopic-worker.<your-subdomain>.workers.dev/api/random

## 4. Create the Administrator

After deployment, open /admin/setup on the Worker domain and create the first
username and password. Passwords are stored as PBKDF2 hashes in D1; browser
sessions are stored in KV. Use /admin/login for later sign-ins.

Protected management and upload endpoints use the HttpOnly cattopic_session
cookie. /api/random remains public.

Check setup state without logging in:

    curl https://cattopic-worker.<your-subdomain>.workers.dev/api/auth/session

## 5. GitHub Actions Deployment

The Deploy Worker workflow builds the frontend, typechecks the Worker, and
deploys worker/wrangler.prod.toml.

Configure these repository secrets:

| Secret | Description |
|--------|-------------|
| CLOUDFLARE_API_TOKEN | Cloudflare API token for Worker deployment |
| CLOUDFLARE_ACCOUNT_ID | Cloudflare account ID |

WRANGLER_TOML is no longer required. Push frontend or Worker changes to main,
or run the workflow manually.

## 6. Upgrading Existing Deployments

Keep the existing D1 database and R2 bucket. Do not reinitialize the schema.
The admin_users table is created automatically when setup or login first runs.
The legacy api_keys table, if present, is no longer used.

The deletion_jobs table is created lazily when deletion handling first needs
it. No manual migration is required for this release.

For a former separate-frontend plus Worker deployment, update the production
bindings, set CORS_ORIGINS to the old frontend domain if needed, then build and
deploy the single Worker. Verify the Worker URL before removing the old
frontend deployment.

## 7. Local Development

Local development still runs frontend and Worker separately:

    # Terminal 1
    cd worker
    npx --yes pnpm@10.24.0 dev

    # Terminal 2, from the repository root
    npx --yes pnpm@10.24.0 dev

The Worker runs at http://localhost:8787; Next.js runs at
http://localhost:3000. Set this in the root .env.local:

    NEXT_PUBLIC_API_URL=http://localhost:8787

Production does not need NEXT_PUBLIC_API_URL; it uses same-origin /api/*
requests.

## 8. API Overview

Public endpoints include /api/random, /api/auth/session, /api/auth/setup,
/api/auth/login, and /api/auth/logout.

Protected endpoints require the cattopic_session cookie and include image
upload/list/update/delete, tag management, configuration, statistics, and
cleanup routes.

For request details, see API_EN.md. Its authentication examples are from the
legacy API-key release; use the session endpoints above for the current
application.

## FAQ

### 401 Unauthorized

Open /admin/login and sign in. If initialization is required, open
/admin/setup first. Check /api/auth/session to inspect session state.

### Reset the administrator

Delete the single row from admin_users in the remote D1 database, then open
/admin/setup again:

    npx --yes pnpm@10.24.0 -C worker exec wrangler d1 execute CattoPic-D1 --remote --command "DELETE FROM admin_users;"

For custom image domains, check R2_PUBLIC_URL, R2 public access, and DNS
propagation.

## Updating

Repeat the build and deploy commands in section 3, or push to main and let
GitHub Actions deploy the same single Worker.
