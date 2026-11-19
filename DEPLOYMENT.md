# FinTrack Deployment Guide (Vercel + Render + Supabase)

This guide provides step-by-step instructions for deploying the **FinTrack** application to production using **Supabase** (Database), **Render** (Backend API), and **Vercel** (Frontend).

---

## Step 1: Set Up PostgreSQL on Supabase

1. Go to [Supabase](https://supabase.com) and sign in.
2. Click **New Project** and select/create your organization.
3. Configure your project details:
   - **Name**: `fintrack-db`
   - **Database Password**: Choose a strong password (keep note of this password).
   - **Region**: Select a region close to your target audience or Render hosting region.
4. Once the project is provisioned, go to the dashboard menu on the left and navigate to **Project Settings** > **Database**.
5. Scroll down to the **Connection Pooler** section and obtain the two required connection strings:
   - **Transaction Pooler Connection String (for DATABASE_URL)**: Select **Transaction** mode, set the type to **URI**, and copy the string (port `6543`). It will look like this:
     ```text
     postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
     ```
   - **Session Pooler Connection String (for DIRECT_URL)**: Select **Session** mode, set the type to **URI**, and copy the string (port `5432`). It will look like this:
     ```text
     postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
     ```
   *Replace `[YOUR-PASSWORD]` with your actual database password. If your password contains special characters, percent-encode them.*

---

## Step 2: Push Database Schema & Seed Data

Since we are using Prisma ORM with Supabase connection pooling, we use a separate **Session Pooler** (port `5432`) to run migrations because the **Transaction Pooler** (port `6543`) does not support Prisma's database advisory locks.

### Method A: Run Automatically on Render (Recommended)
You can let Render run migrations automatically during deployment.
1. In your Render Dashboard settings for the service, set the **Start Command** to:
   ```bash
   npx prisma migrate deploy && node prisma/seed.js && npm start
   ```
2. Set your Environment Variables:
   - `JWT_SECRET`: **Required.** A long random string used to sign login tokens (e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`). The server refuses to start without it.
   - `DATABASE_URL`: Set to your **Transaction Pooler** connection string (port `6543` with `?pgbouncer=true`).
   - `DIRECT_URL`: Set to your **Session Pooler** connection string (port `5432`).

### Method B: Run Locally via Session Pooler
If you want to run migrations from your local machine:
1. Open your terminal and **navigate to the `/server` directory** of the project:
   ```bash
   cd server
   ```
2. Set the `DATABASE_URL` and `DIRECT_URL` environment variables and run deploy:
   ```bash
   # On Windows (PowerShell)
   $env:DATABASE_URL="postgresql://postgres.baawteabywruizyfirpm:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   $env:DIRECT_URL="postgresql://postgres.baawteabywruizyfirpm:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
   npx prisma migrate deploy
   node prisma/seed.js
   ```

---

## Step 3: Deploy Backend REST API on Render

1. Log in to [Render](https://render.com).
2. Click **New** > **Web Service**.
3. Connect your GitHub account and select the `fintrack-web` repository.
4. Configure the Web Service settings:
   - **Name**: `fintrack-api`
   - **Environment**: `Node`
   - **Region**: Choose a region close to your Supabase database location.
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx prisma migrate deploy && node prisma/seed.js && npm start`
5. Scroll down and click **Advanced** to add **Environment Variables**:
   - `DATABASE_URL`: *Your Supabase Transaction Pooler connection string (port 6543 with ?pgbouncer=true)*
   - `DIRECT_URL`: *Your Supabase Session Pooler connection string (port 5432)*
   - `PORT`: `3000`
   - `NODE_ENV`: `production` *(enables secure cookies and disables the mock-store fallback)*
   - `JWT_SECRET`: *A long random string (required)*
   - `CORS_ORIGINS`: *Comma-separated allowed origins, e.g. `https://your-app.vercel.app`*
   - `TRUST_PROXY_HOPS`: `2` *(Vercel, then Render; keeps rate limiting per real client IP. Confirm after deploy.)*
   - `ADMIN_EMAILS`: *Comma-separated admin emails (optional)*
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `587`
   - `SMTP_USER`: `marcodes.fintrack.no.reply@gmail.com`
   - `SMTP_PASS`: `woil encp huoo fmky` *(or your dedicated SMTP app password)*
   - `SMTP_SENDER_NAME`: `FinTrack`
6. Click **Create Web Service**. 
7. Once the build completes and the service is live, copy the public service URL (e.g., `https://fintrack-api-env1.onrender.com`).

---

## Step 4: Update API Base URLs (Angular)

The client has a single API base URL, `apiUrl` in [api.service.ts](src/app/services/api.service.ts). `AuthService` and the HTTP interceptor both read it from there.

- **Local dev** (`localhost` / `127.0.0.1`): `http://<hostname>:4902/api`. The server's own default port is `3000`, so set `PORT=4902` in `server/.env` (see D-021 in `docs/decision.md`).
- **Production**: `/api` (same origin). The session cookie is httpOnly, so the browser must see the API as first-party. [vercel.json](vercel.json) proxies it to Render:
  ```json
  { "source": "/api/:path*", "destination": "https://fintrack-api-env1.onrender.com/api/:path*" }
  ```

If your Render URL differs, change the `destination` in `vercel.json`. Do not point the client directly at Render, because the cookie would become third-party and be blocked.

Deploy the `vercel.json` rewrite and the client together.

---

## Step 5: Deploy Frontend Client on Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** > **Project**.
3. Import your GitHub repository `fintrack-web`.
4. Configure the Project Settings:
   - **Framework Preset**: `Angular`
   - **Root Directory**: `./` (Root directory of the repository)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/fintrack-web/browser`
5. *Note: The repository already includes a `vercel.json` file in the root workspace to automatically enable client-side SPA routing fallback (redirects all paths to `index.html` on refresh).*
6. Click **Deploy**. Vercel will build and host your Angular application.

---

## Step 6: Verify Production Operations

- **API Server Check**: Navigate to `https://your-render-url.onrender.com/api/health`. You should receive a status `ok` confirmation along with a successful PostgreSQL connection ping.
- **Frontend Check**: Open your Vercel deployment URL (e.g., `https://fintrack-web.vercel.app`), register a test account, log in, create a budget plan, and check the dashboard to confirm all requests flow correctly to Render and save inside Supabase.
