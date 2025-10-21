# QAS Validation Checklist

## Overview

Complete end-to-end testing checklist for the PDF Autofill SaaS MVP.

**Test Environment**: Local development (localhost:3000)
**Production Environment**: Render deployment

---

## 1. User Registration & Authentication

### Test Cases

- [ ] **TC-001**: User can register with email/password
  - Navigate to signup page
  - Enter valid email and password
  - Verify user is created in Supabase auth
  - Verify `user_profiles` record is created
  - Verify `organizations` record is auto-created
  - Expected: User redirected to dashboard

- [ ] **TC-002**: User can login with credentials
  - Navigate to login page
  - Enter registered email/password
  - Expected: Redirect to dashboard with session

- [ ] **TC-003**: Google OAuth registration (if configured)
  - Click "Sign in with Google"
  - Complete Google auth flow
  - Expected: User created and redirected to dashboard

- [ ] **TC-004**: Session persistence
  - Login to application
  - Refresh page
  - Expected: User remains logged in

- [ ] **TC-005**: Logout functionality
  - Click logout button
  - Expected: Session cleared, redirect to login

### SQL Verification

```sql
-- Verify user profile created
SELECT * FROM user_profiles WHERE user_id = 'user-uuid';

-- Verify organization auto-created
SELECT * FROM organizations WHERE id IN (
  SELECT organization_id FROM user_profiles WHERE user_id = 'user-uuid'
);
```

---

## 2. Template Upload & Field Mapping

### Test Cases

- [ ] **TC-101**: Upload PDF template
  - Navigate to Templates page
  - Click "Upload Template"
  - Select PDF file (< 10MB)
  - Enter template name
  - Expected: Template uploaded to Supabase storage, record created

- [ ] **TC-102**: PDF file validation
  - Attempt to upload non-PDF file
  - Expected: Error message "Invalid file type"

- [ ] **TC-103**: File size validation
  - Attempt to upload > 10MB file
  - Expected: Error message "File too large"

- [ ] **TC-104**: Visual field mapping
  - Click on uploaded template
  - Click on PDF to add field
  - Configure field properties (name, type, required)
  - Save field
  - Expected: Field saved with correct coordinates

- [ ] **TC-105**: Multi-page field mapping
  - Navigate between PDF pages
  - Add fields on different pages
  - Expected: Fields saved with correct page_number

- [ ] **TC-106**: Field type validation
  - Add fields with types: text, email, date, number
  - Expected: Field types saved correctly

- [ ] **TC-107**: Redundant field detection
  - Add multiple fields with similar names across pages
  - Click "Detect Redundant Fields"
  - Expected: Redundant groups displayed with confidence scores

- [ ] **TC-108**: Field merging
  - Detect redundant fields
  - Click "Merge Fields" on a group
  - Expected: Fields merged, primary field retained

### SQL Verification

```sql
-- Verify template created
SELECT * FROM templates WHERE organization_id = 'org-uuid';

-- Verify fields created
SELECT * FROM template_fields WHERE template_id = 'template-uuid';

-- Verify merged fields
SELECT * FROM template_fields
WHERE metadata->>'isPrimary' = 'false'
AND metadata->>'primaryFieldId' IS NOT NULL;
```

---

## 3. Form Creation & Configuration

### Test Cases

- [ ] **TC-201**: Create form from template
  - Navigate to Forms page
  - Click "Create Form"
  - Select template
  - Enter form name
  - Expected: Form created with all template fields

- [ ] **TC-202**: Field customization
  - Open form editor
  - Customize field labels
  - Add help text
  - Set placeholders
  - Toggle required flags
  - Expected: Changes saved successfully

- [ ] **TC-203**: Field reordering
  - Drag fields to reorder
  - Save form
  - Expected: display_order updated correctly

- [ ] **TC-204**: Branding customization
  - Navigate to Branding tab
  - Change form name
  - Select primary color
  - Change font
  - Expected: Branding saved

- [ ] **TC-205**: Email configuration
  - Navigate to Email tab
  - Add recipient email
  - Set custom subject
  - Toggle "Send copy to submitter"
  - Expected: Email config saved

- [ ] **TC-206**: Form preview
  - Navigate to Preview tab
  - Verify form appearance matches branding
  - Expected: Preview shows correct layout and styling

- [ ] **TC-207**: Form publish validation
  - Attempt to publish form without email recipients
  - Expected: Error "At least one recipient required"

- [ ] **TC-208**: Form publish success
  - Add email recipient
  - Click "Publish Form"
  - Expected: Form published, public URL generated

### SQL Verification

```sql
-- Verify form created
SELECT * FROM forms WHERE template_id = 'template-uuid';

-- Verify form fields created
SELECT * FROM form_fields WHERE form_id = 'form-uuid';

-- Verify form published
SELECT is_published, published_at, slug FROM forms WHERE id = 'form-uuid';
```

---

## 4. Public Form Submission

### Test Cases

- [ ] **TC-301**: Access public form
  - Copy public URL (e.g., /forms/my-form-slug)
  - Open in incognito/private window
  - Expected: Form loads without authentication

- [ ] **TC-302**: Field validation - Required fields
  - Submit form without filling required fields
  - Expected: Error "Field is required"

- [ ] **TC-303**: Field validation - Email format
  - Enter invalid email in email field
  - Expected: Error "Invalid email address"

- [ ] **TC-304**: Field validation - Number format
  - Enter text in number field
  - Expected: Error "Must be a number"

- [ ] **TC-305**: Field validation - Custom regex
  - Enter value not matching regex
  - Expected: Error message from validation_rules

- [ ] **TC-306**: GDPR consent validation
  - Submit form without checking consent
  - Expected: Error "You must agree to data processing"

- [ ] **TC-307**: Draft save functionality
  - Fill form partially
  - Enter email address
  - Click "Save Progress"
  - Expected: Draft saved, email sent with resume link

- [ ] **TC-308**: Draft resume
  - Click resume link from email
  - Expected: Form pre-filled with saved data

- [ ] **TC-309**: Draft expiration
  - Wait 8 days (or modify draft_expires_at in DB)
  - Attempt to resume draft
  - Expected: Error "Draft has expired"

- [ ] **TC-310**: Successful submission
  - Fill all required fields
  - Check GDPR consent
  - Click "Submit Form"
  - Expected: Success message, PDF download link

### SQL Verification

```sql
-- Verify draft created
SELECT * FROM submissions WHERE status = 'draft' AND form_id = 'form-uuid';

-- Verify submission created
SELECT * FROM submissions WHERE status = 'completed' AND form_id = 'form-uuid';

-- Verify form_data stored correctly
SELECT form_data FROM submissions WHERE id = 'submission-uuid';
```

---

## 5. PDF Generation

### Test Cases

- [ ] **TC-401**: PDF generated on submission
  - Submit form
  - Expected: generated_pdf_url populated in submissions table

- [ ] **TC-402**: PDF content accuracy
  - Download generated PDF
  - Open PDF
  - Verify all form data appears at correct coordinates
  - Expected: Data matches submission form_data

- [ ] **TC-403**: Multi-page PDF generation
  - Submit form with fields on multiple pages
  - Download PDF
  - Expected: All pages filled correctly

- [ ] **TC-404**: Merged fields handling
  - Submit form with merged redundant fields
  - Download PDF
  - Expected: All instances filled with same value

- [ ] **TC-405**: PDF storage
  - Verify PDF uploaded to Supabase storage
  - Check file exists in `generated-pdfs` bucket
  - Expected: PDF accessible via public URL

### SQL Verification

```sql
-- Verify PDF generated
SELECT generated_pdf_url FROM submissions WHERE id = 'submission-uuid';

-- Verify PDF record
SELECT * FROM generated_pdfs WHERE id = (
  SELECT generated_pdf_id FROM submissions WHERE id = 'submission-uuid'
);
```

---

## 6. Email Delivery

### Test Cases

- [ ] **TC-501**: Submission notification sent
  - Submit form
  - Check email inbox of configured recipient
  - Expected: Email received with PDF attachment

- [ ] **TC-502**: Email content accuracy
  - Open submission notification email
  - Verify form name
  - Verify submitter email
  - Verify timestamp
  - Expected: All information correct

- [ ] **TC-503**: PDF attachment
  - Open email attachment
  - Expected: PDF opens correctly with form data

- [ ] **TC-504**: Multiple recipients
  - Configure form with 3 email recipients
  - Submit form
  - Expected: All 3 recipients receive email

- [ ] **TC-505**: Submitter copy (optional)
  - Enable "Send copy to submitter"
  - Submit form
  - Expected: Submitter receives email

- [ ] **TC-506**: Draft resume email
  - Save form progress
  - Check email
  - Expected: Resume link email received

- [ ] **TC-507**: Draft resume link validity
  - Click resume link from email
  - Expected: Form loads with saved data

- [ ] **TC-508**: Email delivery tracking
  - Submit form
  - Check email_deliveries table
  - Expected: Records created with status 'sent'

### SQL Verification

```sql
-- Verify email deliveries created
SELECT * FROM email_deliveries WHERE submission_id = 'submission-uuid';

-- Verify email status
SELECT recipient_email, status, sent_at, error_message
FROM email_deliveries
WHERE submission_id = 'submission-uuid';
```

### Resend Dashboard Check

- [ ] Login to Resend dashboard
- [ ] Navigate to Emails
- [ ] Verify emails sent successfully
- [ ] Check delivery status (no bounces/failures)

---

## 7. Submission Management

### Test Cases

- [ ] **TC-601**: View submissions list
  - Navigate to Submissions page
  - Expected: All submissions displayed

- [ ] **TC-602**: Filter by form
  - Select form from dropdown
  - Expected: Only submissions for that form shown

- [ ] **TC-603**: Filter by status
  - Select status (completed/pending/failed)
  - Expected: Filtered results

- [ ] **TC-604**: Search functionality
  - Enter submitter email in search
  - Expected: Matching submissions shown

- [ ] **TC-605**: Pagination
  - If > 20 submissions, verify pagination controls
  - Click "Next" page
  - Expected: Next page of results loaded

- [ ] **TC-606**: Submission details modal
  - Click "View" on a submission
  - Expected: Modal opens with full details

- [ ] **TC-607**: Email delivery status in modal
  - View submission details
  - Check email deliveries section
  - Expected: All deliveries shown with status

- [ ] **TC-608**: Download PDF from dashboard
  - Click "Download" on submission
  - Expected: PDF downloads correctly

### SQL Verification

```sql
-- Verify submission count
SELECT COUNT(*) FROM submissions WHERE form_id = 'form-uuid' AND is_draft = false;

-- Verify RLS policy (as different user)
-- Should only see submissions for own organization
SELECT * FROM submissions WHERE organization_id != 'your-org-uuid';
-- Expected: 0 rows
```

---

## 8. Analytics Dashboard

### Test Cases

- [ ] **TC-701**: View analytics summary
  - Navigate to Analytics page
  - Expected: Summary stats displayed (views, submissions, conversion rate)

- [ ] **TC-702**: Date range filtering
  - Select "Last 7 days"
  - Expected: Data updates to show last 7 days

- [ ] **TC-703**: Form filtering
  - Select specific form from dropdown
  - Expected: Analytics filtered to that form

- [ ] **TC-704**: Timeline chart
  - View timeline chart
  - Expected: Daily breakdown of views/submissions shown

- [ ] **TC-705**: Form performance table
  - View table of all forms
  - Expected: Metrics for each form (views, submissions, conversion rate)

- [ ] **TC-706**: Device stats
  - View device breakdown
  - Expected: Mobile/Tablet/Desktop percentages shown

- [ ] **TC-707**: Browser stats
  - View browser breakdown
  - Expected: Chrome/Firefox/Safari/Edge percentages shown

- [ ] **TC-708**: CSV export
  - Click "Export CSV"
  - Expected: CSV file downloads with analytics data

### SQL Verification

```sql
-- Verify analytics events tracked
SELECT event_type, COUNT(*)
FROM analytics_events
WHERE form_id = 'form-uuid'
GROUP BY event_type;

-- Test analytics function
SELECT * FROM get_form_analytics(
  'form-uuid',
  NOW() - INTERVAL '30 days',
  NOW()
);
```

---

## 9. Onboarding Tour

### Test Cases

- [ ] **TC-801**: First-time user sees tour
  - Create new account
  - Login
  - Expected: Onboarding tour modal appears

- [ ] **TC-802**: Tour navigation
  - Click "Next" through all steps
  - Expected: All 7 steps shown in order

- [ ] **TC-803**: Tour skip
  - Click "Skip Tour"
  - Expected: Tour closed, not shown again

- [ ] **TC-804**: Tour completion
  - Complete all tour steps
  - Click "Get Started"
  - Expected: Redirected to dashboard

- [ ] **TC-805**: Tour doesn't re-appear
  - Complete tour
  - Logout and login again
  - Expected: Tour not shown

- [ ] **TC-806**: Tour action buttons
  - Click action button on a step (e.g., "Upload PDF Template")
  - Expected: Redirected to correct page, tour closes

### LocalStorage Verification

```javascript
// Check onboarding completion flag
localStorage.getItem('onboarding_completed')
// Expected: "true" after completion

// Reset for testing
localStorage.removeItem('onboarding_completed')
```

---

## 10. Security & RLS Policies

### Test Cases

- [ ] **TC-901**: Multi-tenant isolation
  - Create 2 users in different organizations
  - User A creates template
  - Login as User B
  - Attempt to access User A's template
  - Expected: Template not visible

- [ ] **TC-902**: RLS on forms
  - User A creates form
  - Login as User B
  - Attempt to access /api/forms/[user-a-form-id]
  - Expected: 404 or unauthorized

- [ ] **TC-903**: RLS on submissions
  - User A has submissions
  - Login as User B
  - Attempt to access /api/submissions/list
  - Expected: Only User B's submissions returned

- [ ] **TC-904**: Public form access
  - Publish form
  - Access public URL without authentication
  - Expected: Form loads successfully

- [ ] **TC-905**: Unauthorized API access
  - Logout
  - Attempt to access /api/forms
  - Expected: 401 Unauthorized

- [ ] **TC-906**: CSRF protection
  - Verify all POST/PUT/DELETE requests use proper authentication
  - Expected: No CSRF vulnerabilities

### SQL RLS Testing

```sql
-- Login as different user and test RLS
SET LOCAL jwt.claims.sub = 'different-user-uuid';

-- Try to access another org's data
SELECT * FROM templates WHERE organization_id != (
  SELECT organization_id FROM user_profiles WHERE user_id = current_setting('jwt.claims.sub')::uuid
);
-- Expected: 0 rows (blocked by RLS)
```

---

## 11. Performance Testing

### Test Cases

- [ ] **TC-1001**: Page load time
  - Measure time for dashboard to load
  - Expected: < 2 seconds

- [ ] **TC-1002**: PDF generation time
  - Submit form
  - Measure time from submission to PDF generation
  - Expected: < 5 seconds

- [ ] **TC-1003**: Large form submission
  - Create form with 50+ fields
  - Fill and submit
  - Expected: No timeout, submission completes

- [ ] **TC-1004**: Multiple concurrent submissions
  - Submit 10 forms simultaneously
  - Expected: All complete successfully

- [ ] **TC-1005**: Image/PDF rendering
  - Upload 5MB PDF
  - View in template mapper
  - Expected: Renders within 3 seconds

### Performance Tools

```bash
# Lighthouse audit
npx lighthouse http://localhost:3000/dashboard --view

# Bundle analysis
npm run build
# Check for bundle size warnings

# API response time
time curl http://localhost:3000/api/forms
```

---

## 12. Edge Cases & Error Handling

### Test Cases

- [ ] **TC-1101**: Offline form submission
  - Fill form
  - Disconnect internet
  - Submit form
  - Expected: Error message "Network error"

- [ ] **TC-1102**: Session expiration during form fill
  - Start filling form in dashboard
  - Wait for session to expire (or clear cookies)
  - Try to save
  - Expected: Redirect to login

- [ ] **TC-1103**: Duplicate form names
  - Create form "Test Form"
  - Create another form "Test Form"
  - Expected: Both allowed (slug will be unique)

- [ ] **TC-1104**: Special characters in field names
  - Add field with name "User's Email (Required)"
  - Save and submit form
  - Expected: Handles special characters correctly

- [ ] **TC-1105**: Very long field values
  - Submit form with 10,000 character text
  - Expected: Stored and displayed correctly

- [ ] **TC-1106**: Empty form submission
  - Create form with all optional fields
  - Submit without filling anything
  - Expected: Submission succeeds

- [ ] **TC-1107**: PDF generation failure
  - Corrupt template field coordinates
  - Submit form
  - Expected: Graceful error, submission still recorded

- [ ] **TC-1108**: Email delivery failure
  - Configure invalid email recipient
  - Submit form
  - Expected: email_deliveries status = 'failed', submission still completes

---

## 13. GDPR Compliance

### Test Cases

- [ ] **TC-1201**: Data retention policy
  - Check data_retention_until column
  - Expected: Set to 90 days from submission

- [ ] **TC-1202**: Consent tracking
  - Submit form with consent checked
  - Expected: consent_given = true, consent_timestamp recorded

- [ ] **TC-1203**: Draft cleanup
  - Run cleanup_expired_drafts() function
  - Expected: Drafts older than 7 days deleted

- [ ] **TC-1204**: Analytics cleanup
  - Run cleanup_old_analytics() function
  - Expected: Events older than 90 days deleted

- [ ] **TC-1205**: Data export (future feature)
  - User requests data export
  - Expected: All user data exportable

### SQL Verification

```sql
-- Verify consent tracking
SELECT consent_given, consent_timestamp FROM submissions WHERE id = 'submission-uuid';

-- Test draft cleanup
SELECT COUNT(*) FROM submissions
WHERE is_draft = true AND draft_expires_at < NOW();

INSERT INTO submissions (form_id, organization_id, is_draft, draft_expires_at, ...)
VALUES ('form-uuid', 'org-uuid', true, NOW() - INTERVAL '8 days', ...);

SELECT cleanup_expired_drafts();
-- Expected: 1 row deleted

-- Test analytics cleanup
SELECT COUNT(*) FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days';
```

---

## 14. Deployment Readiness

### Pre-Deployment Checklist

- [ ] **Environment Variables**
  - [ ] NEXT_PUBLIC_SUPABASE_URL set
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set
  - [ ] SUPABASE_SERVICE_ROLE_KEY set
  - [ ] RESEND_API_KEY set
  - [ ] RESEND_FROM_EMAIL set (verified domain in production)
  - [ ] NEXT_PUBLIC_APP_URL set

- [ ] **Database**
  - [ ] All migrations run (001, 002, 003)
  - [ ] RLS policies enabled on all tables
  - [ ] Indexes created
  - [ ] Functions and triggers working
  - [ ] Storage buckets created (`pdf-templates`, `generated-pdfs`)
  - [ ] Storage RLS policies set

- [ ] **Build & Deploy**
  - [ ] `npm run build` succeeds with no errors
  - [ ] `npm run type-check` passes
  - [ ] `npm run lint` passes
  - [ ] No console errors in production build
  - [ ] All dependencies in package.json

- [ ] **Resend Configuration**
  - [ ] Domain verified in Resend (production only)
  - [ ] SPF, DKIM, DMARC records configured
  - [ ] Test email sent successfully
  - [ ] Email templates rendering correctly

- [ ] **Security**
  - [ ] No API keys in code
  - [ ] .env in .gitignore
  - [ ] RLS policies tested
  - [ ] HTTPS enabled (Render auto-provisions)
  - [ ] CORS configured correctly

---

## Test Execution Summary

### Test Results

| Category | Total Tests | Passed | Failed | Blocked |
|----------|-------------|--------|--------|---------|
| Authentication | 5 | - | - | - |
| Templates | 8 | - | - | - |
| Forms | 8 | - | - | - |
| Public Submissions | 10 | - | - | - |
| PDF Generation | 5 | - | - | - |
| Email Delivery | 8 | - | - | - |
| Submissions Dashboard | 8 | - | - | - |
| Analytics | 8 | - | - | - |
| Onboarding | 6 | - | - | - |
| Security | 6 | - | - | - |
| Performance | 5 | - | - | - |
| Edge Cases | 8 | - | - | - |
| GDPR | 5 | - | - | - |
| **TOTAL** | **90** | **-** | **-** | **-** |

### Critical Issues Found

_(Document any critical bugs discovered during testing)_

1.

### Known Limitations

1. Email analytics require user agent tracking (may be blocked by privacy tools)
2. Draft emails sent via Resend (requires API key)
3. PDF generation limited to pdf-lib capabilities
4. File uploads limited to 10MB

### Recommendations

1. Add automated tests (Jest, Playwright)
2. Set up monitoring (Sentry, LogRocket)
3. Configure backup strategy for Supabase
4. Implement rate limiting on public endpoints
5. Add webhook for submission notifications

---

## Sign-Off

**Tested By**: ___________________
**Date**: ___________________
**Environment**: [ ] Local [ ] Staging [ ] Production
**Status**: [ ] Approved [ ] Rejected [ ] Needs Revision

**Notes**:
