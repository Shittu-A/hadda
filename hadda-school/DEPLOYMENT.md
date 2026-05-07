# Hadda School — Deployment Guide

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Supabase |
| ORM | Prisma v7 |
| Auth | NextAuth v5 (beta) |
| Styling | Tailwind CSS v4 |
| Hosting | Vercel (recommended) |
| Storage | Supabase Storage (photos) |
| Payments | Paystack / Flutterwave |

---

## 1. Prerequisites

- Node.js 20+ (`node -v`)
- npm 10+ (`npm -v`)
- A [Supabase](https://supabase.com) account (free tier works)
- A [Vercel](https://vercel.com) account (for production)

---

## 2. Local Development Setup

### 2.1 Clone and install

```bash
git clone <your-repo-url>
cd hadda-school
npm install
```

### 2.2 Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a name, password, and region (pick one close to your users)
3. Wait for provisioning (~2 minutes)

### 2.3 Get your database URL

In Supabase Dashboard:
- **Settings → Database → Connection string**
- Switch to **URI** mode
- Copy the connection string — it looks like:
  ```
  postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  ```
- Add `?pgbouncer=true` to the end for local dev (uses the pooler)

> For Prisma migrations/seeding use the **direct** connection (port 5432), not the pooler. The pooler (port 6543) is for runtime queries.

### 2.4 Configure environment variables

Copy `.env.local` and fill in your values:

```bash
cp .env.local .env.local
```

```env
# Required — Supabase PostgreSQL
# Use the POOLER URL (port 6543) for runtime, direct URL (port 5432) for migrations
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Required — NextAuth
# Generate with: openssl rand -base64 32
AUTH_SECRET="your-32-char-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional — Supabase Storage (for student photo uploads)
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Optional — Paystack (online fee payments)
PAYSTACK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_..."
PAYSTACK_WEBHOOK_SECRET="your-webhook-secret"

# Optional — Flutterwave (alternative payment gateway)
FLUTTERWAVE_SECRET_KEY="FLWSECK_TEST-..."
NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY="FLWPUBK_TEST-..."
FLUTTERWAVE_WEBHOOK_SECRET="your-webhook-secret"
```

### 2.5 Push schema and seed

```bash
# Push the Prisma schema to your database
npm run db:push

# Seed with default data (admin user, surahs, sample academic year)
npm run db:seed
```

### 2.6 Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 3. Default Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@hadda.school | password123 |

> Change this password immediately after first login via Super Admin → Users.

---

## 4. Deploying to Vercel

### 4.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-org/hadda-school.git
git push -u origin main
```

### 4.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Vercel will auto-detect Next.js — no build settings needed

### 4.3 Set environment variables in Vercel

In Vercel Dashboard → Project → Settings → Environment Variables, add **all** of these:

| Variable | Value | Environment |
|---|---|---|
| `DATABASE_URL` | Supabase pooler URL (port 6543) + `?pgbouncer=true` | Production, Preview, Development |
| `AUTH_SECRET` | 32-char random string | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Production |
| `NEXTAUTH_URL` | `https://your-preview-url.vercel.app` | Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | All |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Settings → API | All |
| `PAYSTACK_SECRET_KEY` | From Paystack Dashboard | Production |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | From Paystack Dashboard | Production |
| `PAYSTACK_WEBHOOK_SECRET` | Set in Paystack webhook config | Production |

> For `DATABASE_URL` in production, Supabase recommends using the **Transaction pooler** (port 6543) with `?pgbouncer=true` — this is safe for serverless functions which open many short-lived connections.

### 4.4 Deploy

```bash
git push origin main
```

Vercel auto-deploys on every push to `main`. Check the deployment logs in the Vercel dashboard.

### 4.5 Run seed on production (first deploy only)

After the first production deployment, run the seed once to create the admin user and surah data:

```bash
# Set DATABASE_URL to the DIRECT connection (port 5432) for the seed script
DATABASE_URL="postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres" npm run db:seed
```

Or use the Vercel CLI:

```bash
npm i -g vercel
vercel env pull .env.production.local
DATABASE_URL="<direct-url>" npm run db:seed
```

---

## 5. Supabase Configuration

### 5.1 Row Level Security (RLS)

The app uses Prisma (server-side) for all DB access — RLS is not required for the management system. However, if you expose any tables directly via the Supabase client, enable RLS.

### 5.2 Storage bucket (for student photos)

If you use the photo upload feature:

1. Supabase Dashboard → Storage → New Bucket
2. Name it `student-photos`
3. Set to **Public** (photos are referenced by URL in the app)
4. Set file size limit: 5MB
5. Allowed MIME types: `image/jpeg, image/png, image/webp`

### 5.3 Connection limits

Supabase free tier allows 60 simultaneous connections. The pooler (pgBouncer) multiplexes connections, so the app will work fine on free tier with typical school usage.

---

## 6. Custom Domain

In Vercel Dashboard → Project → Settings → Domains:

1. Add your domain (e.g. `app.hadda.school`)
2. Follow the DNS instructions (add CNAME or A record at your registrar)
3. Update `NEXTAUTH_URL` environment variable to your custom domain

---

## 7. Post-Deployment Checklist

- [ ] Change default admin password
- [ ] Create the current academic year in Super Admin → Academic Years → Set as Current
- [ ] Create classes (e.g. Hifz 1, Hifz 2, Hifz 3) in Admin → Classes
- [ ] Create teacher accounts in Super Admin → Users
- [ ] Assign teachers to classes in Admin → Classes → [class] → Edit
- [ ] Create fee structures in Admin → Fees and assign to classes
- [ ] Configure school name and contact info in Super Admin → Settings
- [ ] Test a full student enrollment flow
- [ ] Test attendance marking
- [ ] Test a memorization log
- [ ] Verify report downloads work

---

## 8. Updating Production

```bash
# Make changes locally, test, then:
git add .
git commit -m "describe your change"
git push origin main
# Vercel auto-deploys — monitor the build in the Vercel dashboard
```

If the Prisma schema changes:

```bash
# After pushing to GitHub and Vercel deploys the new code:
# Run db:push with the direct connection URL
DATABASE_URL="<direct-url>" npx prisma db push
```

---

## 9. Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Supabase PostgreSQL connection string (pooler URL in production) |
| `AUTH_SECRET` | Yes | NextAuth secret — min 32 chars. Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Full URL of the app (including `https://`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | Supabase project URL — needed for storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase service key — needed for storage admin operations |
| `PAYSTACK_SECRET_KEY` | Optional | Paystack server-side key |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Optional | Paystack client-side key |
| `PAYSTACK_WEBHOOK_SECRET` | Optional | Validates Paystack webhook signatures |
| `FLUTTERWAVE_SECRET_KEY` | Optional | Flutterwave server-side key |
| `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` | Optional | Flutterwave client-side key |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Optional | Validates Flutterwave webhook signatures |

---

## 10. Troubleshooting

**Build fails: "PrismaClientKnownRequestError"**
The database is not reachable. Check that `DATABASE_URL` is set correctly in Vercel env vars and the Supabase project is active.

**"Cannot find module '@prisma/client'"**
Run `npm run db:generate` locally and commit the generated client, or add `prisma generate` to the Vercel build command: `prisma generate && next build`.

**Auth redirecting to /login on every page**
`AUTH_SECRET` or `NEXTAUTH_URL` is missing or wrong. Check environment variables.

**PDF download returns 500**
`@react-pdf/renderer` requires Node.js runtime (not Edge). All API routes in this app use Node.js runtime by default — do not add `export const runtime = 'edge'` to report routes.

**Excel download returns empty file**
The filter produced zero results. Check the date range or class selection.

**Notifications bell shows wrong count**
The layout fetches unread count on each page load. Hard-refresh if count seems stale.
