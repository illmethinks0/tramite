# Deployment Checklist

## Pre-Deployment (Local Setup)

### 1. Supabase Project Setup
- [ ] Create Supabase project at https://supabase.com
- [ ] Copy project URL and keys from Settings > API
- [ ] Create `.env.local` from `.env.example`
- [ ] Add credentials to `.env.local`:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
  ```

### 2. Database Migration
- [ ] Go to Supabase Dashboard > SQL Editor
- [ ] Copy contents of `supabase/migrations/001_initial_schema.sql`
- [ ] Paste and click "Run"
- [ ] Verify tables created: organizations, user_profiles, templates, template_fields, generated_pdfs
- [ ] Verify storage bucket "pdfs" exists (Dashboard > Storage)

### 3. Optional: Google OAuth
- [ ] Create OAuth credentials at https://console.cloud.google.com
- [ ] Add authorized redirect URIs:
  - Development: `http://localhost:3000/auth/callback`
  - Production: `https://your-domain.com/auth/callback`
- [ ] Add credentials to `.env.local`:
  ```env
  NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id
  GOOGLE_CLIENT_SECRET=your-client-secret
  ```
- [ ] Enable Google provider in Supabase Dashboard > Authentication > Providers

### 4. Local Testing
- [ ] Run `npm run dev`
- [ ] Test signup at http://localhost:3000/auth/signup
- [ ] Verify organization created in Supabase
- [ ] Upload a test PDF template
- [ ] Map at least 3 fields
- [ ] Generate a filled PDF
- [ ] Download and verify PDF looks correct

### 5. Pre-Deploy Validation
- [ ] Run `npm run type-check` - should pass
- [ ] Run `npm run lint` - should pass
- [ ] Run `npm run build` - should succeed
- [ ] Check bundle sizes are reasonable (< 500 KB)

## Production Deployment

### Option A: Render (Recommended)

#### 1. Repository Setup
- [ ] Initialize Git repository (if not already):
  ```bash
  git init
  git add .
  git commit -m "Initial commit - PDF Autofill SaaS"
  ```
- [ ] Create GitHub repository
- [ ] Push code:
  ```bash
  git remote add origin https://github.com/yourusername/pdf-autofill-saas.git
  git branch -M main
  git push -u origin main
  ```

#### 2. Render Service Creation
- [ ] Go to https://render.com
- [ ] Click "New +" > "Web Service"
- [ ] Connect your GitHub repository
- [ ] Configure:
  - **Name**: pdf-autofill-saas
  - **Environment**: Node
  - **Region**: Choose closest to your users
  - **Branch**: main
  - **Build Command**: `npm ci && npm run build`
  - **Start Command**: `npm start`
  - **Plan**: Free (or paid for production)

#### 3. Environment Variables (Render)
Add these in Render Dashboard > Environment:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL` (your Render URL)
- [ ] `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (if using OAuth)
- [ ] `GOOGLE_CLIENT_SECRET` (if using OAuth)

#### 4. Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for build to complete (~3-5 minutes)
- [ ] Check deployment logs for errors
- [ ] Visit your Render URL (e.g., https://pdf-autofill-saas.onrender.com)

#### 5. Post-Deploy Configuration
- [ ] Update Google OAuth redirect URI (if using):
  - Add `https://your-app.onrender.com/auth/callback`
- [ ] Update Supabase redirect URL:
  - Dashboard > Authentication > URL Configuration
  - Site URL: `https://your-app.onrender.com`
  - Redirect URLs: Add `https://your-app.onrender.com/auth/callback`

### Option B: Vercel

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Deploy
- [ ] Run `vercel` in project directory
- [ ] Follow prompts to create project
- [ ] Deploy to production: `vercel --prod`

#### 3. Environment Variables (Vercel)
- [ ] Go to Vercel Dashboard > Project > Settings > Environment Variables
- [ ] Add all variables from `.env.example`
- [ ] Redeploy: `vercel --prod`

## Post-Deployment Testing

### 1. Smoke Tests
- [ ] Visit production URL
- [ ] Homepage loads correctly
- [ ] Click "Get Started" → redirects to signup
- [ ] Sign up creates account
- [ ] Dashboard loads after signup
- [ ] Sidebar navigation works

### 2. Core Feature Tests
- [ ] Upload PDF template
  - File uploads successfully
  - Redirects to field mapper
  - PDF renders on canvas
- [ ] Map fields
  - Click on PDF captures coordinates
  - Field dialog appears
  - Field saves to database
- [ ] Generate PDF
  - Form displays correctly
  - Fill data and submit
  - PDF downloads successfully
  - Open PDF and verify data appears

### 3. Authentication Tests
- [ ] Sign out works
- [ ] Sign in works with email/password
- [ ] Google OAuth works (if configured)
- [ ] Protected routes redirect to login
- [ ] Session persists on refresh

### 4. Error Handling
- [ ] Upload non-PDF file → shows error
- [ ] Upload file > 10MB → shows error
- [ ] Try to access protected route logged out → redirects
- [ ] Network error shows friendly message

## Monitoring Setup (Optional but Recommended)

### 1. Sentry (Error Tracking)
- [ ] Create Sentry account
- [ ] Install: `npm install @sentry/nextjs`
- [ ] Configure `sentry.client.config.js`
- [ ] Add `NEXT_PUBLIC_SENTRY_DSN` to environment
- [ ] Test error reporting

### 2. Vercel Analytics
- [ ] Enable in Vercel Dashboard
- [ ] Verify events are tracking

### 3. Supabase Monitoring
- [ ] Check Database > Logs for errors
- [ ] Monitor Storage usage
- [ ] Check Auth > Users for signups

## Security Checklist

- [ ] All API routes check authentication
- [ ] Row Level Security (RLS) policies active
- [ ] Storage bucket has proper access policies
- [ ] No secrets in client-side code
- [ ] Environment variables not committed to Git
- [ ] HTTPS enforced (automatic on Render/Vercel)
- [ ] CORS configured if needed

## Performance Optimization (Optional)

- [ ] Enable Vercel Edge Cache
- [ ] Configure Supabase Connection Pooling
- [ ] Add Redis for rate limiting (if needed)
- [ ] Enable Supabase Realtime (if using)
- [ ] Configure CDN for static assets

## Backup & Recovery

- [ ] Enable Supabase daily backups (automatic on paid plans)
- [ ] Document database schema version
- [ ] Export sample data for testing
- [ ] Document environment variables in secure location
- [ ] Setup monitoring alerts (email/Slack)

## Custom Domain (Optional)

### Render
- [ ] Buy domain (e.g., Namecheap, Cloudflare)
- [ ] Go to Render Dashboard > Settings > Custom Domain
- [ ] Add domain
- [ ] Update DNS records (CNAME to Render)
- [ ] Wait for SSL certificate (automatic)

### Vercel
- [ ] Buy domain
- [ ] Go to Vercel Dashboard > Domains
- [ ] Add domain
- [ ] Update nameservers or DNS records
- [ ] Verify SSL certificate

## Launch Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Environment variables secured
- [ ] Monitoring enabled
- [ ] Error tracking configured
- [ ] Backups enabled
- [ ] Domain configured (if using)
- [ ] Team members invited
- [ ] Support email configured
- [ ] Privacy policy added (if needed)
- [ ] Terms of service added (if needed)

## Common Issues & Solutions

### Build Fails
**Problem**: TypeScript errors during build
**Solution**:
```bash
npm run type-check  # Fix all errors locally first
git commit -am "Fix type errors"
git push
```

### Environment Variables Not Loading
**Problem**: Variables undefined in production
**Solution**:
- Check spelling matches `.env.example`
- Redeploy after adding variables
- Restart service if needed

### Database Connection Fails
**Problem**: "Could not connect to database"
**Solution**:
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify Supabase project is active

### PDF Upload Fails
**Problem**: "Failed to upload PDF"
**Solution**:
- Check Supabase Storage bucket exists
- Verify storage policies allow uploads
- Check file size < 10MB
- Verify CORS configured in Supabase

### OAuth Redirect Error
**Problem**: "Redirect URI mismatch"
**Solution**:
- Add production URL to Google Console allowed URIs
- Add to Supabase allowed redirect URLs
- Format: `https://your-domain.com/auth/callback`

## Rollback Plan

If deployment fails:

1. **Render**:
   - Dashboard > Deploys
   - Find last working deploy
   - Click "Redeploy"

2. **Vercel**:
   ```bash
   vercel rollback
   ```

3. **Database**:
   - Supabase Dashboard > Database > Backups
   - Restore from last backup

## Success Criteria

Deployment is successful when:
- [ ] Application loads at production URL
- [ ] Users can sign up
- [ ] Users can upload PDFs
- [ ] Users can map fields
- [ ] Users can generate filled PDFs
- [ ] No errors in logs
- [ ] Response times < 2 seconds
- [ ] SSL certificate valid

## Post-Launch Monitoring

### First 24 Hours
- [ ] Check error logs every 2 hours
- [ ] Monitor signup count
- [ ] Verify PDFs generating correctly
- [ ] Check storage usage
- [ ] Monitor response times

### First Week
- [ ] Review error patterns
- [ ] Check user feedback
- [ ] Monitor database performance
- [ ] Review storage costs
- [ ] Check API usage

### First Month
- [ ] Analyze user behavior
- [ ] Identify bottlenecks
- [ ] Plan optimizations
- [ ] Review security logs
- [ ] Evaluate scaling needs

---

## Quick Deploy Commands

```bash
# Validate locally
npm run type-check && npm run lint && npm run build

# Deploy to Vercel
vercel --prod

# Deploy to Render (via Git)
git add .
git commit -m "Deploy to production"
git push origin main
# Render auto-deploys on push

# Check deployment status
curl https://your-app.com/api/health  # Add this endpoint if needed
```

## Support

If issues arise:
1. Check deployment logs
2. Review this checklist
3. Check Supabase logs
4. Review environment variables
5. Test locally with production env vars
6. Check GitHub Issues for similar problems

---

**You're ready to deploy! Follow this checklist step-by-step for a smooth launch.**
