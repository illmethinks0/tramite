# Email Delivery Setup (Resend)

This application uses [Resend](https://resend.com) for email delivery.

## Features

- **Submission Notifications**: Send completed PDFs to configured recipients
- **Draft Resume Links**: Email users a link to resume their saved progress
- **GDPR Compliant**: Includes consent tracking and data retention policies

## Setup Instructions

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email address
3. Complete account setup

### 2. Get API Key

1. Navigate to **API Keys** in the Resend dashboard
2. Click **Create API Key**
3. Give it a name (e.g., "PDF Autofill Production")
4. Copy the generated API key

### 3. Configure Domain (Production)

For production use, you need to verify your sending domain:

1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the required DNS records to your domain provider:
   - **SPF Record**: Verifies your domain can send email
   - **DKIM Record**: Adds digital signature to emails
   - **DMARC Record**: Protects against email spoofing

5. Wait for DNS propagation (can take up to 48 hours)
6. Verify domain status shows "Verified" in Resend

### 4. Set Environment Variables

Add these to your `.env.local` file:

```bash
# Resend API Key (required)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Sender Email Address
# Development: Use @resend.dev (no domain verification needed)
# Production: Use your verified domain
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Development vs Production:**

- **Development**: Use `onboarding@resend.dev` - works without domain verification
- **Production**: Use your verified domain email (e.g., `noreply@yourdomain.com`)

### 5. Test Email Delivery

Test email delivery using the API:

```bash
curl -X POST http://localhost:3000/api/submissions/draft \
  -H "Content-Type: application/json" \
  -d '{
    "form_id": "your-form-id",
    "submitter_email": "test@example.com",
    "form_data": {}
  }'
```

Check your inbox for the draft resume email.

## Email Templates

The application includes two email templates:

### 1. Submission Notification

Sent to configured recipients when a form is submitted.

**Includes:**
- Form name
- Submitter information
- Submission timestamp
- PDF attachment

**Triggered by:** Form submission at `/forms/[slug]`

### 2. Draft Resume Link

Sent when user saves progress on a form.

**Includes:**
- Resume link (secure token)
- Expiration date (7 days)
- Form name

**Triggered by:** "Save Progress" button on public forms

## Troubleshooting

### Emails Not Sending

1. **Check API Key**: Verify `RESEND_API_KEY` is set correctly
2. **Check Logs**: Look for Resend API errors in server logs
3. **Verify Domain**: Ensure domain DNS records are properly configured
4. **Check Rate Limits**: Resend has rate limits based on your plan

### Emails Going to Spam

1. **Verify Domain**: Complete SPF, DKIM, and DMARC setup
2. **Warm Up Domain**: Start with small volumes and gradually increase
3. **Check Content**: Avoid spam trigger words
4. **Monitor Reputation**: Use Resend's analytics to track deliverability

### API Errors

Common errors and solutions:

- `401 Unauthorized`: Invalid API key - check `RESEND_API_KEY`
- `403 Forbidden`: Domain not verified - complete domain verification
- `422 Validation Error`: Invalid email format or missing required fields
- `429 Too Many Requests`: Rate limit exceeded - upgrade plan or reduce volume

## Resend Pricing

**Free Tier:**
- 100 emails/day
- 3,000 emails/month
- Perfect for testing and small deployments

**Pro Tier** ($20/month):
- 50,000 emails/month
- $1 per 1,000 additional emails
- Priority support

See [resend.com/pricing](https://resend.com/pricing) for current rates.

## Analytics & Monitoring

Track email delivery in the `email_deliveries` table:

```sql
SELECT
  status,
  COUNT(*) as count
FROM email_deliveries
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

**Status Values:**
- `queued`: Email queued for delivery
- `sent`: Successfully sent via Resend
- `failed`: Delivery failed (check `error_message`)

## Security Best Practices

1. **Never commit API keys**: Keep `.env` in `.gitignore`
2. **Use service role key**: For public form submissions (bypasses RLS)
3. **Rate limiting**: Implement rate limiting to prevent abuse
4. **Email validation**: Always validate email addresses before sending
5. **Unsubscribe links**: Include unsubscribe option in notification emails

## Support

- **Resend Documentation**: [resend.com/docs](https://resend.com/docs)
- **Resend Support**: [resend.com/support](https://resend.com/support)
- **Status Page**: [status.resend.com](https://status.resend.com)
