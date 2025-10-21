/**
 * Email Service
 *
 * Handles email delivery using Resend API
 * - PDF attachment delivery
 * - Draft resume links
 * - Submission notifications
 */

import { Resend } from 'resend'

// Lazy-initialize Resend to avoid build-time errors
let resend: Resend | null = null

function getResendClient() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resend = new Resend(apiKey)
  }
  return resend
}

export interface SendSubmissionEmailParams {
  to: string[]
  formName: string
  submitterEmail: string
  submitterName?: string
  pdfBuffer?: Buffer
  pdfFileName?: string
  customSubject?: string
}

export interface SendDraftResumeEmailParams {
  to: string
  formName: string
  resumeUrl: string
  expiresAt: Date
}

/**
 * Send submission notification with PDF attachment
 */
export async function sendSubmissionEmail({
  to,
  formName,
  submitterEmail,
  submitterName,
  pdfBuffer,
  pdfFileName,
  customSubject
}: SendSubmissionEmailParams) {
  try {
    const subject = customSubject || `New submission: ${formName}`

    const attachments = pdfBuffer && pdfFileName ? [
      {
        filename: pdfFileName,
        content: pdfBuffer
      }
    ] : []

    const client = getResendClient()
    const { data, error } = await client.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to,
      subject,
      html: generateSubmissionEmailHTML({
        formName,
        submitterEmail,
        submitterName,
        hasPdf: !!pdfBuffer
      }),
      attachments
    })

    if (error) {
      console.error('Resend API error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send email',
        messageId: null
      }
    }

    return {
      success: true,
      error: null,
      messageId: data?.id || null
    }
  } catch (error) {
    console.error('Error sending submission email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      messageId: null
    }
  }
}

/**
 * Send draft resume email
 */
export async function sendDraftResumeEmail({
  to,
  formName,
  resumeUrl,
  expiresAt
}: SendDraftResumeEmailParams) {
  try {
    const client = getResendClient()
    const { data, error } = await client.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
      to: [to],
      subject: `Resume your ${formName} submission`,
      html: generateDraftResumeEmailHTML({
        formName,
        resumeUrl,
        expiresAt
      })
    })

    if (error) {
      console.error('Resend API error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send email',
        messageId: null
      }
    }

    return {
      success: true,
      error: null,
      messageId: data?.id || null
    }
  } catch (error) {
    console.error('Error sending draft resume email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      messageId: null
    }
  }
}

/**
 * Generate HTML for submission notification email
 */
function generateSubmissionEmailHTML({
  formName,
  submitterEmail,
  submitterName,
  hasPdf
}: {
  formName: string
  submitterEmail: string
  submitterName?: string
  hasPdf: boolean
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Form Submission</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #4F46E5;
    }
    .header h1 {
      color: #4F46E5;
      margin: 0;
      font-size: 24px;
    }
    .content {
      margin-bottom: 30px;
    }
    .info-row {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-label {
      font-weight: 600;
      width: 140px;
      color: #6b7280;
    }
    .info-value {
      flex: 1;
      color: #111827;
    }
    .attachment-notice {
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 6px;
      padding: 16px;
      margin-top: 20px;
    }
    .attachment-notice p {
      margin: 0;
      color: #166534;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 New Form Submission</h1>
    </div>

    <div class="content">
      <p>You have received a new submission for <strong>${formName}</strong>.</p>

      <div class="info-row">
        <span class="info-label">Form:</span>
        <span class="info-value">${formName}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Submitted by:</span>
        <span class="info-value">${submitterName || 'Not provided'}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">${submitterEmail}</span>
      </div>

      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${new Date().toLocaleString()}</span>
      </div>

      ${hasPdf ? `
      <div class="attachment-notice">
        <p><strong>✓ PDF Attached</strong></p>
        <p>The completed form is attached to this email as a PDF document.</p>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>This is an automated notification from Tramite.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Generate HTML for draft resume email
 */
function generateDraftResumeEmailHTML({
  formName,
  resumeUrl,
  expiresAt
}: {
  formName: string
  resumeUrl: string
  expiresAt: Date
}) {
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume Your Form</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f9fafb;
    }
    .container {
      background: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #4F46E5;
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .content {
      margin-bottom: 30px;
    }
    .cta-button {
      display: block;
      width: fit-content;
      margin: 30px auto;
      padding: 14px 32px;
      background: #4F46E5;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      text-align: center;
    }
    .cta-button:hover {
      background: #4338CA;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin-top: 20px;
      border-radius: 4px;
    }
    .warning p {
      margin: 0;
      color: #92400e;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
    }
    .url-fallback {
      margin-top: 20px;
      padding: 12px;
      background: #f3f4f6;
      border-radius: 4px;
      word-break: break-all;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💾 Resume Your Form</h1>
      <p>Continue where you left off</p>
    </div>

    <div class="content">
      <p>You saved your progress on <strong>${formName}</strong>.</p>
      <p>Click the button below to resume filling out your form:</p>

      <a href="${resumeUrl}" class="cta-button">
        Resume Form
      </a>

      <div class="warning">
        <p><strong>⏰ This link expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}</strong></p>
        <p>Make sure to complete and submit your form before ${expiresAt.toLocaleDateString()}.</p>
      </div>

      <div class="url-fallback">
        <p><strong>Button not working?</strong> Copy and paste this URL:</p>
        <p>${resumeUrl}</p>
      </div>
    </div>

    <div class="footer">
      <p>This is an automated notification from Tramite.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
