# 🔐 Google OAuth Setup Guide

**Quick Setup Time**: ~3 minutes

This guide will help you enable Google sign-in for your application.

---

## Option 1: Automated Setup (Recommended) ⚡

### Step 1: Get Google OAuth Credentials (2 minutes)

1. **Go to Google Cloud Console**:
   - Open: https://console.cloud.google.com/apis/credentials
   - Sign in with your Google account

2. **Create OAuth Client ID**:
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `Tramite PDF Autofill` (or any name you want)

3. **Add Authorized Redirect URIs**:
   ```
   https://wdhhldevvcpsoxfyavbg.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   ```

4. **Copy Credentials**:
   - You'll see a modal with:
     - **Client ID** (looks like: `123456789-abc...apps.googleusercontent.com`)
     - **Client Secret** (looks like: `GOCSPX-abc...xyz`)
   - Keep this window open or copy these values

### Step 2: Run Automated Setup (30 seconds)

```bash
cd /Users/g0m/Desktop/tramite/pdf-autofill-saas
./setup-google-oauth.sh
```

The script will:
1. ✅ Ask for your Google Client ID and Secret
2. ✅ Enable Google OAuth in Supabase automatically
3. ✅ Create `.env.local` with all required configuration
4. ✅ Fetch and add your Supabase anon key automatically

### Step 3: Restart Dev Server

```bash
npm run dev
```

### Step 4: Test Google Sign-In

1. Go to http://localhost:3000/login
2. Click "Sign in with Google"
3. You'll be redirected to Google OAuth
4. Sign in with your Google account
5. Success! 🎉

---

## Option 2: Manual Setup (5 minutes)

### Step 1: Get Google OAuth Credentials

Same as Option 1, Step 1 above.

### Step 2: Configure Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select project: **tramite-production**
3. Go to: **Authentication** → **Providers**
4. Find **Google** and click to enable
5. Paste:
   - **Client ID**: Your Google Client ID
   - **Client Secret**: Your Google Client Secret
6. Click **Save**

### Step 3: Create .env.local

Create a file `/Users/g0m/Desktop/tramite/pdf-autofill-saas/.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://wdhhldevvcpsoxfyavbg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get-from-supabase-dashboard>

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**To get Supabase Anon Key**:
1. Go to Supabase Dashboard
2. Project Settings → API
3. Copy "anon public" key

### Step 4: Restart Dev Server

```bash
npm run dev
```

---

## Troubleshooting

### "Redirect URI mismatch" error

**Solution**: Make sure you added BOTH redirect URIs to Google Cloud Console:
```
https://wdhhldevvcpsoxfyavbg.supabase.co/auth/v1/callback
http://localhost:3000/auth/callback
```

### Button clicks but nothing happens

**Possible causes**:
1. `.env.local` file not created
2. Dev server not restarted after creating `.env.local`
3. Google OAuth not enabled in Supabase

**Solution**: Re-run the automated script or check manual setup steps.

### "Invalid client" error

**Solution**: Double-check that:
1. Client ID and Secret are copied correctly (no extra spaces)
2. OAuth client type is "Web application" not "Desktop" or "Mobile"

---

## Verify Configuration

### Check Supabase OAuth Status

```bash
curl -s "https://api.supabase.com/v1/projects/wdhhldevvcpsoxfyavbg/config/auth" \
  -H "Authorization: Bearer sbp_b4e423b843c3afcfe8211f7d81e21b5f9673b84a" \
  | grep external_google_enabled
```

Should show: `"external_google_enabled":true`

### Check .env.local

```bash
cat .env.local
```

Should contain all required variables.

---

## What Happens After Setup?

1. ✅ Users can click "Sign in with Google"
2. ✅ They're redirected to Google OAuth
3. ✅ After signing in, they're redirected back to your app
4. ✅ User account is created automatically in Supabase
5. ✅ User is logged in and can access the dashboard

---

## Security Notes

- ✅ `.env.local` is in `.gitignore` (credentials won't be committed)
- ✅ Client Secret is never exposed to the browser
- ✅ Supabase handles all OAuth security
- ✅ Tokens are stored securely in httpOnly cookies

---

## Production Deployment

When deploying to production:

1. Add production redirect URI to Google Cloud Console:
   ```
   https://your-domain.com/auth/callback
   ```

2. Set environment variables in your hosting platform:
   - Vercel/Netlify: Use dashboard to add env vars
   - Render: Use environment variables in service settings

3. Update `NEXT_PUBLIC_APP_URL` to your production domain

---

## Need Help?

- **Supabase OAuth Docs**: https://supabase.com/docs/guides/auth/social-login/auth-google
- **Google OAuth Docs**: https://developers.google.com/identity/protocols/oauth2

---

**Setup Script Location**: `/Users/g0m/Desktop/tramite/pdf-autofill-saas/setup-google-oauth.sh`

**Estimated Total Time**: 3 minutes ⚡
