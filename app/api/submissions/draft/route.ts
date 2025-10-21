import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import { sendDraftResumeEmail } from '@/lib/services/email-service'

/**
 * Draft Submissions API
 *
 * POST /api/submissions/draft - Save form progress as draft
 * GET /api/submissions/draft?token=xxx - Resume draft by token
 */

export async function POST(request: NextRequest) {
  try {
    // Use service role key for public submissions (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await request.json()
    const { form_id, form_data, submitter_email } = body

    if (!form_id || !submitter_email) {
      return NextResponse.json(
        { error: 'Missing required fields: form_id, submitter_email' },
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

    // Verify form exists and is published
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, name, organization_id, is_published')
      .eq('id', form_id)
      .eq('is_published', true)
      .single()

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found or not published' },
        { status: 404 }
      )
    }

    // Generate secure draft token
    const draftToken = randomBytes(32).toString('hex')

    // Calculate draft expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create draft submission
    const { data: draft, error: createError } = await supabase
      .from('submissions')
      .insert({
        form_id,
        organization_id: form.organization_id,
        submitter_email,
        form_data: form_data || {},
        status: 'draft',
        is_draft: true,
        draft_token: draftToken,
        draft_expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating draft:', createError)
      return NextResponse.json(
        { error: 'Failed to save draft', details: createError.message },
        { status: 500 }
      )
    }

    // Generate resume URL
    const resumeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/forms/resume?token=${draftToken}`

    // Send email with resume link
    const emailResult = await sendDraftResumeEmail({
      to: submitter_email,
      formName: form.name,
      resumeUrl,
      expiresAt: new Date(draft.draft_expires_at)
    })

    if (!emailResult.success) {
      console.error('Failed to send draft resume email:', emailResult.error)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      draft: {
        id: draft.id,
        token: draftToken,
        expires_at: draft.draft_expires_at,
        resume_url: resumeUrl,
        email_sent: emailResult.success
      }
    })
  } catch (error) {
    console.error('Error in POST /api/submissions/draft:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Missing draft token' },
        { status: 400 }
      )
    }

    // Use service role key for public access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get draft submission
    const { data: draft, error: draftError } = await supabase
      .from('submissions')
      .select(`
        *,
        form:forms(
          id,
          name,
          slug,
          is_published,
          branding,
          form_fields(
            *,
            template_field:template_fields(*)
          )
        )
      `)
      .eq('draft_token', token)
      .eq('status', 'draft')
      .single()

    if (draftError || !draft) {
      return NextResponse.json(
        { error: 'Draft not found or already submitted' },
        { status: 404 }
      )
    }

    // Check if draft is expired
    const expiresAt = new Date(draft.draft_expires_at)
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Draft has expired' },
        { status: 410 }
      )
    }

    // Check if form is still published
    if (!draft.form.is_published) {
      return NextResponse.json(
        { error: 'Form is no longer available' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      draft: {
        id: draft.id,
        form_id: draft.form_id,
        form_data: draft.form_data,
        submitter_email: draft.submitter_email,
        expires_at: draft.draft_expires_at,
        form: draft.form
      }
    })
  } catch (error) {
    console.error('Error in GET /api/submissions/draft:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
