import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Forms API
 *
 * POST /api/forms - Create new form from template
 * GET /api/forms - List all forms for organization
 */

export async function POST(request: NextRequest) {
  try {
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
    const { template_id, name, branding, conditional_rules, email_config } = body

    if (!template_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: template_id, name' },
        { status: 400 }
      )
    }

    // Verify template exists and belongs to organization
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('id, name')
      .eq('id', template_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found or access denied' },
        { status: 404 }
      )
    }

    // Generate URL-friendly slug from form name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36)

    // Create form
    const { data: form, error: formError } = await supabase
      .from('forms')
      .insert({
        organization_id: profile.organization_id,
        template_id,
        name,
        slug,
        is_published: false,
        branding: branding || {
          logo: null,
          primaryColor: '#4F46E5',
          font: 'Inter'
        },
        conditional_rules: conditional_rules || [],
        email_config: email_config || {
          recipients: [],
          subject: `New submission: ${name}`,
          includeSubmitterCopy: true
        },
        submission_count: 0,
        completion_rate: 0
      })
      .select()
      .single()

    if (formError) {
      console.error('Error creating form:', formError)
      return NextResponse.json(
        { error: 'Failed to create form', details: formError.message },
        { status: 500 }
      )
    }

    // Get template fields to create corresponding form fields
    const { data: templateFields, error: fieldsError } = await supabase
      .from('template_fields')
      .select('*')
      .eq('template_id', template_id)
      .order('page_number', { ascending: true })

    if (fieldsError) {
      console.error('Error fetching template fields:', fieldsError)
      return NextResponse.json(
        { error: 'Failed to fetch template fields' },
        { status: 500 }
      )
    }

    // Create form fields from template fields
    const formFields = (templateFields || []).map((field, index) => ({
      form_id: form.id,
      template_field_id: field.id,
      label: field.field_name,
      help_text: null,
      placeholder: '',
      is_required: field.is_required || false,
      validation_rules: field.validation_regex ? { regex: field.validation_regex } : {},
      conditional_visibility: null,
      display_order: index
    }))

    if (formFields.length > 0) {
      const { error: formFieldsError } = await supabase
        .from('form_fields')
        .insert(formFields)

      if (formFieldsError) {
        console.error('Error creating form fields:', formFieldsError)
        // Don't fail the request, but log the error
      }
    }

    return NextResponse.json({
      success: true,
      form: {
        ...form,
        fieldCount: formFields.length
      }
    })
  } catch (error) {
    console.error('Error in POST /api/forms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url)
    const template_id = searchParams.get('template_id')

    let query = supabase
      .from('forms')
      .select(`
        *,
        template:templates(id, name, file_name),
        form_fields(count)
      `)
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (template_id) {
      query = query.eq('template_id', template_id)
    }

    const { data: forms, error: formsError } = await query

    if (formsError) {
      console.error('Error fetching forms:', formsError)
      return NextResponse.json(
        { error: 'Failed to fetch forms' },
        { status: 500 }
      )
    }

    return NextResponse.json({ forms: forms || [] })
  } catch (error) {
    console.error('Error in GET /api/forms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
