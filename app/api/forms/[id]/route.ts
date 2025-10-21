import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Individual Form API
 *
 * GET /api/forms/[id] - Get form details
 * PUT /api/forms/[id] - Update form
 * DELETE /api/forms/[id] - Delete form
 */

export async function GET(
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

    // Get form with fields
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        *,
        template:templates(id, name, file_name, file_url),
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

    // Sort fields by display_order
    if (form.form_fields) {
      form.form_fields.sort((a: any, b: any) => a.display_order - b.display_order)
    }

    return NextResponse.json({ form })
  } catch (error) {
    console.error('Error in GET /api/forms/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { name, branding, conditional_rules, email_config, fields } = body

    // Verify form belongs to organization
    const { data: existingForm, error: checkError } = await supabase
      .from('forms')
      .select('id, is_published')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (checkError || !existingForm) {
      return NextResponse.json(
        { error: 'Form not found or access denied' },
        { status: 404 }
      )
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updates.name = name
    if (branding !== undefined) updates.branding = branding
    if (conditional_rules !== undefined) updates.conditional_rules = conditional_rules
    if (email_config !== undefined) updates.email_config = email_config

    // Update form
    const { data: form, error: updateError } = await supabase
      .from('forms')
      .update(updates)
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

    // Update fields if provided
    if (fields && Array.isArray(fields)) {
      // Update each field
      for (const field of fields) {
        if (!field.id) continue

        const { error: fieldUpdateError } = await supabase
          .from('form_fields')
          .update({
            label: field.label,
            help_text: field.help_text,
            placeholder: field.placeholder,
            is_required: field.is_required,
            validation_rules: field.validation_rules,
            conditional_visibility: field.conditional_visibility,
            display_order: field.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', field.id)
          .eq('form_id', id)

        if (fieldUpdateError) {
          console.error('Error updating field:', fieldUpdateError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      form
    })
  } catch (error) {
    console.error('Error in PUT /api/forms/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Check if form has submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('id')
      .eq('form_id', id)
      .limit(1)

    if (submissionsError) {
      console.error('Error checking submissions:', submissionsError)
    }

    if (submissions && submissions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete form with existing submissions. Archive it instead.' },
        { status: 400 }
      )
    }

    // Delete form (cascade will delete form_fields)
    const { error: deleteError } = await supabase
      .from('forms')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (deleteError) {
      console.error('Error deleting form:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete form', details: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/forms/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
