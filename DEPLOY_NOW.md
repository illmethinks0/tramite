# 🚀 Deploy Tramite to Production - Step by Step

**Complete this checklist in order. Check off each step as you go.**

---

## ✅ STEP 1: Create Supabase Project (5 minutes)

### 1.1 Create Project
1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Enter:
   - **Name:** `tramite-production`
   - **Database Password:** (Generate strong password - **SAVE THIS!**)
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
4. Click **"Create new project"**
5. ⏳ Wait ~2 minutes for provisioning

### 1.2 Get Supabase Credentials
Once project is created:

1. Go to **Settings → API**
2. Copy these values (you'll need them later):

```bash
# Save these in a text file:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # ⚠️ Keep this secret!
```

**Status:** ⬜ Supabase project created

---

## ✅ STEP 2: Run Database Migrations (10 minutes)

### 2.1 Open SQL Editor
1. In Supabase dashboard, click **"SQL Editor"**
2. Click **"New query"**

### 2.2 Run Migration 1 - Core Schema
1. Open file: `supabase/migrations/001_initial_schema.sql`
2. Copy ALL contents
3. Paste into SQL Editor
4. Click **"Run"** (or press Cmd/Ctrl + Enter)
5. ✅ Verify: You should see "Success. No rows returned"

### 2.3 Run Migration 2 - Forms & Submissions
1. Open file: `supabase/migrations/002_forms_and_submissions.sql`
2. Copy ALL contents
3. Paste into SQL Editor (replace previous query)
4. Click **"Run"**
5. ✅ Verify: Success message

### 2.4 Run Migration 3 - Database Functions
1. Open file: `supabase/migrations/003_database_functions.sql`
2. Copy ALL contents
3. Paste into SQL Editor
4. Click **"Run"**
5. ✅ Verify: Success message

### 2.5 Verify Tables Created
1. In Supabase, click **"Table Editor"**
2. You should see 10 tables:
   - organizations
   - user_profiles
   - templates
   - template_fields
   - generated_pdfs
   - forms
   - form_fields
   - submissions
   - email_deliveries
   - analytics_events

**Status:** ⬜ Database migrations completed

---

## ✅ STEP 3: Create Storage Buckets (3 minutes)

### 3.1 Create `pdf-templates` Bucket
1. Click **"Storage"** in left sidebar
2. Click **"New bucket"**
3. Enter:
   - **Name:** `pdf-templates`
   - **Public:** OFF (keep private)
   - **File size limit:** 10 MB
   - **Allowed MIME types:** `application/pdf`
4. Click **"Create bucket"**

### 3.2 Create `generated-pdfs` Bucket
1. Click **"New bucket"** again
2. Enter:
   - **Name:** `generated-pdfs`
   - **Public:** ON (for public downloads)
   - **File size limit:** 10 MB
   - **Allowed MIME types:** `application/pdf`
3. Click **"Create bucket"**

**Status:** ⬜ Storage buckets created

---

## ✅ STEP 4: Set Up Resend for Emails (5 minutes)

### 4.1 Create Resend Account
1. Go to https://resend.com
2. Sign up for free account (3,000 emails/month free)
3. Verify your email

### 4.2 Get API Key
1. In Resend dashboard, go to **"API Keys"**
2. Click **"Create API Key"**
3. Name: `tramite-production`
4. Copy the API key (starts with `re_...`)

```bash
# Save this:
RESEND_API_KEY=re_xxxxx
```

### 4.3 Add Sending Domain (Optional but Recommended)
**For now, you can use:** `onboarding@resend.dev` (free tier)

**For production with custom domain:**
1. Click **"Domains"** → **"Add Domain"**
2. Enter your domain (e.g., `tramite.app`)
3. Add DNS records to your domain provider
4. Wait for verification

```bash
# Use this for now:
RESEND_FROM_EMAIL=onboarding@resend.dev

# Or your verified domain:
# RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Status:** ⬜ Resend configured

---

## ✅ STEP 5: Deploy to Render (10 minutes)

### 5.1 Create Render Account
1. Go to https://render.com
2. Sign up (free tier available)
3. Connect your GitHub account

### 5.2 Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Click **"Connect account"** for GitHub
3. Find and select: **`tramite`** repository
4. Configure:
   - **Name:** `tramite-production`
   - **Region:** Same as Supabase (e.g., Oregon, Ohio)
   - **Branch:** `main`
   - **Root Directory:** (leave empty)
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free` (or Starter $7/month for better performance)

### 5.3 Add Environment Variables
**CRITICAL:** Click **"Advanced"** → **"Add Environment Variable"**

Add these one by one:

```bash
NODE_VERSION=18.17.0

NEXT_PUBLIC_SUPABASE_URL=<paste from Step 1.2>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste from Step 1.2>
SUPABASE_SERVICE_ROLE_KEY=<paste from Step 1.2>

RESEND_API_KEY=<paste from Step 4.2>
RESEND_FROM_EMAIL=onboarding@resend.dev

NEXT_PUBLIC_APP_URL=https://tramite-production.onrender.com
```

**Replace values** with your actual credentials from previous steps!

### 5.4 Deploy
1. Click **"Create Web Service"**
2. ⏳ Wait 5-10 minutes for first deployment
3. Watch the logs for any errors

**Status:** ⬜ Deployed to Render

---

## ✅ STEP 6: Verify Deployment (5 minutes)

### 6.1 Check Deployment Status
1. In Render dashboard, wait for status: **"Live"** (green)
2. Click the URL: `https://tramite-production.onrender.com`

### 6.2 Test Homepage
1. You should see the Tramite landing page
2. Click **"Get Started Free"**

### 6.3 Test Signup
1. Create an account with your email
2. Check email for confirmation (if using email/password)
3. Or use Google OAuth if configured

### 6.4 Test Dashboard
1. After signup, you should see the dashboard
2. Check that all pages load:
   - Dashboard home
   - Forms
   - Submissions
   - Analytics

### 6.5 Check Logs
If anything fails:
1. Go to Render dashboard → **Logs**
2. Check for errors (red text)
3. Common issues:
   - Missing environment variables
   - Database connection errors
   - Build failures

**Status:** ⬜ Application verified

---

## 🎉 DEPLOYMENT COMPLETE!

Your Tramite application is now live at:
**https://tramite-production.onrender.com**

### Next Steps:
- [ ] Add custom domain (optional)
- [ ] Set up monitoring (Render provides basic metrics)
- [ ] Configure Google OAuth (optional)
- [ ] Test full workflow: Upload PDF → Create Form → Submit

---

## 🆘 Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Look for TypeScript errors in logs
- Verify Node version is 18+

### Database Errors
- Verify migrations ran successfully
- Check RLS policies are created
- Test connection with Supabase service role key

### Email Not Sending
- Verify Resend API key is correct
- Check sending domain is verified
- Look for rate limits (3000/month on free tier)

### App Won't Load
- Check all environment variables are set
- Verify `NEXT_PUBLIC_APP_URL` matches Render URL
- Check Render logs for startup errors

---

## 📋 Credentials Summary

Keep these safe (use password manager):

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Render
APP_URL=https://tramite-production.onrender.com
```

---

**Need help?** Check the full deployment guide: `docs/DEPLOYMENT_GUIDE.md`
