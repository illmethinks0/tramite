import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Public Form API
 *
 * GET /api/forms/public/[slug] - Get published form by slug (no auth required)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Use service role key to bypass RLS for public forms
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get form with fields
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select(`
        id,
        name,
        slug,
        branding,
        form_fields(
          id,
          label,
          help_text,
          placeholder,
          is_required,
          validation_rules,
          display_order,
          template_field:template_fields(
            field_name,
            field_type,
            page_number
          )
        )
      `)
      .eq('slug', slug)
      .eq('is_published', true)
      .single()

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found or not published' },
        { status: 404 }
      )
    }

    // Sort fields by display_order
    if (form.form_fields) {
      form.form_fields.sort((a: any, b: any) => a.display_order - b.display_order)
    }

    // Track form view analytics
    await supabase
      .from('analytics_events')
      .insert({
        form_id: form.id,
        event_type: 'form_view',
        session_id: request.headers.get('x-session-id') || undefined,
        metadata: {
          timestamp: new Date().toISOString(),
          user_agent: request.headers.get('user-agent') || undefined
        }
      })

    return NextResponse.json({ form })
  } catch (error) {
    console.error('Error in GET /api/forms/public/[slug]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
