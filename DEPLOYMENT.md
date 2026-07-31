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
5. Scroll down to the **Connection string** section, select **URI**, and copy the connection string. It will look like this:
   ```text
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   *Replace `[YOUR-PASSWORD]` with the database password you chose in step 3.*

---

## Step 2: Push Database Schema & Seed Data

Since we are using Prisma ORM, you need to apply migrations to your live Supabase database.

1. Open your terminal in the `/server` directory of your project.
2. Run the Prisma migration deployment command using your Supabase connection string:
   ```bash
   # On Windows (PowerShell)
   $env:DATABASE_URL="YOUR_SUPABASE_CONNECTION_STRING"
   npx prisma migrate deploy

   # On Linux/macOS
   DATABASE_URL="YOUR_SUPABASE_CONNECTION_STRING" npx prisma migrate deploy
   ```
3. Run the seed script to populate the reference database tables (Income Categories, Expense Categories, Saving Categories, and Account Types):
   ```bash
   # On Windows (PowerShell)
   $env:DATABASE_URL="YOUR_SUPABASE_CONNECTION_STRING"
   node prisma/seed.js

   # On Linux/macOS
   DATABASE_URL="YOUR_SUPABASE_CONNECTION_STRING" node prisma/seed.js
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
   - **Start Command**: `npm start`
5. Scroll down and click **Advanced** to add **Environment Variables**:
   - `DATABASE_URL`: *Your Supabase connection string (obtained in Step 1)*
   - `PORT`: `3000`
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `587`
   - `SMTP_USER`: `marcodes.fintrack.no.reply@gmail.com`
   - `SMTP_PASS`: `woil encp huoo fmky` *(or your dedicated SMTP app password)*
   - `SMTP_SENDER_NAME`: `FinTrack`
6. Click **Create Web Service**. 
7. Once the build completes and the service is live, copy the public service URL (e.g., `https://fintrack-api.onrender.com`).

---

## Step 4: Update API Base URLs (Angular)

We have already configured your Angular client code to dynamically determine the API endpoint using `window.location.origin`. However, if you ever need to change the target production domain, update the production URLs in these files:

- **Frontend API client**: [api.service.ts](src/app/services/api.service.ts)
  ```typescript
  private baseUrl = window.location.origin.includes('localhost')
    ? 'http://localhost:3000/api'
    : 'https://fintrack-api.onrender.com/api'; // Make sure this matches your Render URL
  ```
- **Frontend Auth client**: [auth.service.ts](src/app/services/auth.service.ts)
  ```typescript
  private baseUrl = window.location.origin.includes('localhost')
    ? 'http://localhost:3000/api/auth'
    : 'https://fintrack-api.onrender.com/api/auth'; // Make sure this matches your Render URL
  ```

*Since you've modified these files, remember to push them to GitHub:*
```bash
git add src/app/services/api.service.ts src/app/services/auth.service.ts
git commit -m "chore: align production endpoints with Render API"
git push origin main
```

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
