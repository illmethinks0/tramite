# Deployment Guide

Complete step-by-step guide for deploying the PDF Autofill SaaS platform to production.

---

## Prerequisites

- [ ] GitHub account
- [ ] Supabase account (free tier works for testing)
- [ ] Resend account (free tier: 3000 emails/month)
- [ ] Render account (free tier or paid)

---

## Part 1: Database Setup (Supabase)

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Enter project details:
   - Name: `pdf-autofill-production`
   - Database Password: (generate strong password - save it!)
   - Region: Choose closest to your users
4. Wait for project creation (~2 minutes)

### 1.2 Run Database Migrations

1. Open Supabase SQL Editor
2. Run migrations in order:

**Migration 001 - Core Schema**:
```sql
-- Copy contents from supabase/migrations/001_initial_schema.sql
-- Paste into SQL Editor
-- Click "Run"
```

**Migration 002 - Forms & Submissions**:
```sql
-- Copy contents from supabase/migrations/002_forms_and_submissions.sql
-- Paste and run
```

**Migration 003 - Functions**:
```sql
-- Copy contents from supabase/migrations/003_database_functions.sql
-- Paste and run
```

### 1.3 Create Storage Buckets

1. Navigate to **Storage** in Supabase dashboard
2. Create bucket: `pdf-templates`
   - Public: No
   - File size limit: 10MB
   - Allowed MIME types: `application/pdf`

3. Create bucket: `generated-pdfs`
   - Public: Yes (for PDF downloads)
   - File size limit: 10MB
   - Allowed MIME types: `application/pdf`

### 1.4 Configure Storage RLS Policies

**For `pdf-templates`**:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdf-templates');

-- Allow users to view own org's templates
CREATE POLICY "Users can view own templates"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pdf-templates' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM user_profiles WHERE user_id = auth.uid()
  )
);
```

**For `generated-pdfs`**:
```sql
-- Public read access
CREATE POLICY "Public can view generated PDFs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'generated-pdfs');

-- Authenticated users can create
CREATE POLICY "Authenticated can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'generated-pdfs');
```

### 1.5 Get API Keys

1. Navigate to **Settings > API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI...` (keep secret!)

---

## Part 2: Email Setup (Resend)

### 2.1 Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for free account
3. Verify your email

### 2.2 Development Setup (Quick Test)

For testing, use Resend's test domain:

1. Navigate to **API Keys**
2. Create new API key: `pdf-autofill-dev`
3. Copy the API key
4. Use `onboarding@resend.dev` as sender email

### 2.3 Production Setup (Custom Domain)

1. Navigate to **Domains**
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add DNS records to your domain provider:

**SPF Record** (TXT):
```
v=spf1 include:_spf.resend.com ~all
```

**DKIM Record** (TXT):
```
Name: resend._domainkey
Value: (provided by Resend)
```

**DMARC Record** (TXT):
```
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:postmaster@yourdomain.com
```

5. Wait for DNS propagation (up to 48 hours)
6. Verify domain in Resend dashboard
7. Use `noreply@yourdomain.com` as sender

### 2.4 Get API Key

1. Navigate to **API Keys**
2. Create key: `pdf-autofill-production`
3. Copy key (starts with `re_...`)

---

## Part 3: Application Deployment (Render)

### 3.1 Prepare Repository

1. Ensure all code is committed:
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

2. Create `.env.example` (should already exist):
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=
```

3. Ensure `.gitignore` contains:
```
.env
.env.local
node_modules/
.next/
```

### 3.2 Create Render Web Service

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure service:
   - **Name**: `pdf-autofill-saas`
   - **Region**: Choose closest to users
   - **Branch**: `main`
   - **Root Directory**: (leave blank)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free or Starter ($7/month for better performance)

### 3.3 Set Environment Variables

In Render dashboard, add environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI... (keep secret!)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://pdf-autofill-saas.onrender.com
```

**Important**: Use the actual Render URL for `NEXT_PUBLIC_APP_URL` after deployment

### 3.4 Deploy

1. Click "Create Web Service"
2. Wait for build to complete (~5-10 minutes)
3. Once deployed, click the URL to test

### 3.5 Update App URL

1. Copy your Render URL: `https://pdf-autofill-saas.onrender.com`
2. Update `NEXT_PUBLIC_APP_URL` environment variable
3. Redeploy service

---

## Part 4: Post-Deployment Configuration

### 4.1 Test Authentication

1. Navigate to your deployed app
2. Create a test account
3. Verify you can login
4. Check Supabase dashboard for user record

### 4.2 Configure OAuth (Optional)

If using Google OAuth:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth credentials
3. Add authorized redirect URI:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
4. Add to Render environment variables:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxx
   ```
5. Configure in Supabase:
   - Navigate to **Authentication > Providers**
   - Enable Google
   - Add Client ID and Secret

### 4.3 Test Email Delivery

1. Create a test form
2. Publish it
3. Fill it out and submit
4. Verify email received with PDF attachment
5. Check Resend dashboard for delivery status

### 4.4 Set Up Monitoring (Recommended)

**Sentry (Error Tracking)**:
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

**Environment Variables**:
```
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

**LogRocket (Session Replay)**:
```bash
npm install logrocket
```

### 4.5 Configure Custom Domain (Optional)

1. In Render dashboard, click "Settings"
2. Scroll to "Custom Domain"
3. Click "Add Custom Domain"
4. Enter your domain (e.g., `app.yourdomain.com`)
5. Add CNAME record to your DNS:
   ```
   CNAME: app
   Value: your-service.onrender.com
   ```
6. Wait for SSL certificate provisioning

---

## Part 5: Scheduled Tasks

### 5.1 Database Cleanup (Cron Job)

Create Render Cron Job for data cleanup:

1. Create new file: `scripts/cleanup.js`
```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanup() {
  // Cleanup expired drafts
  const { data: drafts, error: draftError } = await supabase.rpc('cleanup_expired_drafts')
  console.log(`Cleaned up ${drafts || 0} expired drafts`)

  // Cleanup old analytics
  const { data: analytics, error: analyticsError } = await supabase.rpc('cleanup_old_analytics')
  console.log(`Cleaned up ${analytics || 0} old analytics events`)
}

cleanup().catch(console.error)
```

2. In Render, create "Cron Job":
   - **Name**: `cleanup-job`
   - **Command**: `node scripts/cleanup.js`
   - **Schedule**: `0 2 * * *` (daily at 2 AM)

---

## Part 6: Backup & Recovery

### 6.1 Database Backups

Supabase Pro plan includes automatic backups:
- Daily backups retained for 7 days
- Manual backups via dashboard

**Free tier**: Set up manual backup script:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Backup database
supabase db dump --local > backup-$(date +%Y%m%d).sql
```

### 6.2 Storage Backups

Create backup script for uploaded files:

```javascript
// scripts/backup-storage.js
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Download all files from buckets
// Store in local directory or S3
```

---

## Part 7: Performance Optimization

### 7.1 Enable Caching

Add to `next.config.js`:
```javascript
module.exports = {
  images: {
    domains: ['your-supabase-project.supabase.co'],
  },
  experimental: {
    optimizeCss: true,
  }
}
```

### 7.2 Database Indexing

Indexes already created in migrations, but verify:
```sql
-- Check indexes
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 7.3 CDN for Static Assets

Render automatically serves static files via CDN

---

## Part 8: Security Hardening

### 8.1 Content Security Policy

Add to `next.config.js`:
```javascript
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

### 8.2 Rate Limiting

Install rate limiter:
```bash
npm install express-rate-limit
```

Add middleware (optional for Next.js 15 App Router)

### 8.3 Environment Variable Validation

Add to `lib/env.ts`:
```typescript
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL'
]

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`)
  }
})
```

---

## Part 9: Go Live Checklist

- [ ] All environment variables set correctly
- [ ] Database migrations run successfully
- [ ] Storage buckets created and configured
- [ ] RLS policies tested
- [ ] Email delivery tested (send test form submission)
- [ ] PDF generation tested
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Error monitoring set up (Sentry)
- [ ] Analytics configured (optional)
- [ ] Backup strategy in place
- [ ] Team members invited to Supabase/Render
- [ ] Documentation reviewed by team

---

## Part 10: Troubleshooting

### Common Issues

**Build Fails**:
```bash
# Check Node version
node --version  # Should be 18+

# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

**Database Connection Error**:
- Verify Supabase URL and keys
- Check RLS policies are not blocking requests
- Ensure service role key is used for server-side operations

**Email Not Sending**:
- Verify Resend API key
- Check sender email matches verified domain
- Review Resend dashboard for delivery logs
- Check email_deliveries table for error messages

**PDF Generation Fails**:
- Verify pdf-lib and @pdf-lib/fontkit installed
- Check template file exists in storage
- Verify field coordinates are valid numbers

**Storage Upload Fails**:
- Check bucket exists
- Verify RLS policies allow upload
- Check file size < 10MB
- Verify file type is PDF

---

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Resend Docs**: https://resend.com/docs
- **Render Docs**: https://render.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## Post-Launch Monitoring

Monitor these metrics:

1. **Application Health**
   - Uptime (Render dashboard)
   - Error rate (Sentry)
   - Response times

2. **Database Performance**
   - Query performance (Supabase dashboard)
   - Storage usage
   - Connection pool

3. **Email Deliverability**
   - Delivery rate (Resend dashboard)
   - Bounce rate
   - Spam complaints

4. **User Metrics**
   - Active users
   - Form completion rate
   - Submission volume

---

## Deployment Complete! 🎉

Your PDF Autofill SaaS is now live. Share the URL with your users and monitor the application health during the first few days.

**Next Steps**:
1. Create your first production template
2. Publish a form
3. Share with beta users
4. Collect feedback
5. Iterate and improve

Good luck! 🚀
