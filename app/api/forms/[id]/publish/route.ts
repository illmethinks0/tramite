import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Form Publish API
 *
 * POST /api/forms/[id]/publish - Publish or unpublish form
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.set(name, '', options)
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { is_published } = body

    if (typeof is_published !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required field: is_published (boolean)' },
        { status: 400 }
      )
    }

    // Get form with validation
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        *,
        form_fields(
          *,
          template_field:template_fields(*)
        )
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found or access denied' },
        { status: 404 }
      )
    }

    // Validation before publishing
    if (is_published) {
      const validationErrors: string[] = []

      // Check if form has fields
      if (!form.form_fields || form.form_fields.length === 0) {
        validationErrors.push('Form must have at least one field')
      }

      // Check if email config has recipients
      if (!form.email_config?.recipients || form.email_config.recipients.length === 0) {
        validationErrors.push('Form must have at least one email recipient configured')
      }

      // Validate email recipients format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (form.email_config?.recipients) {
        const invalidEmails = form.email_config.recipients.filter(
          (email: string) => !emailRegex.test(email)
        )
        if (invalidEmails.length > 0) {
          validationErrors.push(`Invalid email addresses: ${invalidEmails.join(', ')}`)
        }
      }

      // Check if form name is set
      if (!form.name || form.name.trim().length === 0) {
        validationErrors.push('Form must have a name')
      }

      if (validationErrors.length > 0) {
        return NextResponse.json(
          {
            error: 'Form validation failed',
            validationErrors
          },
          { status: 400 }
        )
      }
    }

    // Update form published status
    const { data: updatedForm, error: updateError } = await supabase
      .from('forms')
      .update({
        is_published,
        published_at: is_published ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating form:', updateError)
      return NextResponse.json(
        { error: 'Failed to update form', details: updateError.message },
        { status: 500 }
      )
    }

    // Generate public URL
    const publicUrl = is_published
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/forms/${form.slug}`
      : null

    return NextResponse.json({
      success: true,
      form: updatedForm,
      publicUrl
    })
  } catch (error) {
    console.error('Error in POST /api/forms/[id]/publish:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
