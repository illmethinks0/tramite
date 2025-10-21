import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSubmissionEmail } from '@/lib/services/email-service'

/**
 * Submissions API
 *
 * POST /api/submissions - Submit form (public endpoint, no auth required)
 * - Creates submission record
 * - Generates PDF from template
 * - Queues email delivery
 * - Tracks analytics event
 */

export async function POST(request: NextRequest) {
  try {
    // Use service role key for public submissions (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { form_id, form_data, submitter_email, consent_given, draft_token } = body

    if (!form_id || !form_data || !submitter_email) {
      return NextResponse.json(
        { error: 'Missing required fields: form_id, form_data, submitter_email' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(submitter_email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Get form with fields and template
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        *,
        organization:organizations(id),
        template:templates(
          id,
          name,
          file_url
        ),
        form_fields(
          *,
          template_field:template_fields(*)
        )
      `)
      .eq('id', form_id)
      .eq('is_published', true)
      .single()

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found or not published' },
        { status: 404 }
      )
    }

    // Validate required fields
    const requiredFields = form.form_fields.filter((f: any) => f.is_required)
    const missingFields: string[] = []

    for (const field of requiredFields) {
      const value = form_data[field.template_field.field_name]
      if (!value || String(value).trim() === '') {
        missingFields.push(field.label || field.template_field.field_name)
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields
        },
        { status: 400 }
      )
    }

    // Validate field formats (regex validation)
    const validationErrors: { field: string; message: string }[] = []

    for (const field of form.form_fields) {
      const fieldName = field.template_field.field_name
      const value = form_data[fieldName]

      if (!value) continue

      // Check regex validation
      if (field.validation_rules?.regex) {
        const regex = new RegExp(field.validation_rules.regex)
        if (!regex.test(String(value))) {
          validationErrors.push({
            field: field.label || fieldName,
            message: field.validation_rules.message || 'Invalid format'
          })
        }
      }

      // Type-specific validation
      if (field.template_field.field_type === 'email' && !emailRegex.test(String(value))) {
        validationErrors.push({
          field: field.label || fieldName,
          message: 'Invalid email address'
        })
      }

      if (field.template_field.field_type === 'number' && isNaN(Number(value))) {
        validationErrors.push({
          field: field.label || fieldName,
          message: 'Must be a number'
        })
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          validationErrors
        },
        { status: 400 }
      )
    }

    // Create or update submission
    let submission: any

    if (draft_token) {
      // Update existing draft
      const { data: existingSubmission, error: draftError } = await supabase
        .from('submissions')
        .select('*')
        .eq('draft_token', draft_token)
        .eq('form_id', form_id)
        .single()

      if (draftError || !existingSubmission) {
        return NextResponse.json(
          { error: 'Draft not found or expired' },
          { status: 404 }
        )
      }

      const { data: updated, error: updateError } = await supabase
        .from('submissions')
        .update({
          submitter_email,
          form_data,
          status: 'completed',
          is_draft: false,
          consent_given: consent_given || false,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubmission.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating submission:', updateError)
        return NextResponse.json(
          { error: 'Failed to update submission' },
          { status: 500 }
        )
      }

      submission = updated
    } else {
      // Create new submission
      const { data: newSubmission, error: createError } = await supabase
        .from('submissions')
        .insert({
          form_id,
          organization_id: form.organization_id,
          submitter_email,
          form_data,
          status: 'completed',
          is_draft: false,
          consent_given: consent_given || false,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating submission:', createError)
        return NextResponse.json(
          { error: 'Failed to create submission', details: createError.message },
          { status: 500 }
        )
      }

      submission = newSubmission
    }

    // Generate PDF
    try {
      const generateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: form.template.id,
            formData: form_data
          })
        }
      )

      if (generateResponse.ok) {
        const pdfBlob = await generateResponse.blob()
        const pdfArrayBuffer = await pdfBlob.arrayBuffer()
        const pdfBuffer = Buffer.from(pdfArrayBuffer)

        // Upload PDF to Supabase Storage
        const fileName = `submission-${submission.id}-${Date.now()}.pdf`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('generated-pdfs')
          .upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false
          })

        if (uploadError) {
          console.error('Error uploading PDF:', uploadError)
        } else {
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('generated-pdfs')
            .getPublicUrl(fileName)

          // Update submission with PDF URL
          await supabase
            .from('submissions')
            .update({ generated_pdf_url: publicUrl })
            .eq('id', submission.id)

          submission.generated_pdf_url = publicUrl
        }
      }
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError)
      // Don't fail the submission, just log the error
    }

    // Send email delivery
    const recipients = form.email_config?.recipients || []
    if (form.email_config?.includeSubmitterCopy) {
      recipients.push(submitter_email)
    }

    // Fetch PDF buffer if available
    let pdfBuffer: Buffer | undefined
    if (submission.generated_pdf_url) {
      try {
        const pdfResponse = await fetch(submission.generated_pdf_url)
        if (pdfResponse.ok) {
          const pdfArrayBuffer = await pdfResponse.arrayBuffer()
          pdfBuffer = Buffer.from(pdfArrayBuffer)
        }
      } catch (error) {
        console.error('Error fetching PDF for email:', error)
      }
    }

    // Send emails to all recipients
    for (const recipient of recipients) {
      // Create email delivery record
      const { data: deliveryRecord } = await supabase
        .from('email_deliveries')
        .insert({
          submission_id: submission.id,
          recipient_email: recipient,
          status: 'queued',
          provider: 'resend'
        })
        .select()
        .single()

      if (!deliveryRecord) continue

      // Send email
      const emailResult = await sendSubmissionEmail({
        to: [recipient],
        formName: form.name,
        submitterEmail: submitter_email,
        pdfBuffer,
        pdfFileName: `${form.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`,
        customSubject: form.email_config?.subject
      })

      // Update delivery status
      await supabase
        .from('email_deliveries')
        .update({
          status: emailResult.success ? 'sent' : 'failed',
          provider_message_id: emailResult.messageId,
          error_message: emailResult.error,
          sent_at: emailResult.success ? new Date().toISOString() : null
        })
        .eq('id', deliveryRecord.id)
    }

    // Track analytics event
    await supabase
      .from('analytics_events')
      .insert({
        form_id,
        event_type: 'form_submit',
        session_id: request.headers.get('x-session-id') || undefined,
        metadata: {
          submitter_email,
          timestamp: new Date().toISOString()
        }
      })

    // Increment submission count
    await supabase.rpc('increment_submission_count', { form_id_input: form_id })

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        pdf_url: submission.generated_pdf_url
      }
    })
  } catch (error) {
    console.error('Error in POST /api/submissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
