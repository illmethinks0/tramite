import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * List Submissions API
 *
 * GET /api/submissions/list - List submissions for organization
 * Query params:
 * - form_id: Filter by form (optional)
 * - status: Filter by status (optional)
 * - limit: Number of results (default: 50)
 * - offset: Pagination offset (default: 0)
 */

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
    const form_id = searchParams.get('form_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('submissions')
      .select(`
        *,
        form:forms(
          id,
          name,
          slug
        ),
        email_deliveries(
          id,
          recipient_email,
          status,
          sent_at,
          error_message
        )
      `, { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (form_id) {
      query = query.eq('form_id', form_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: submissions, error: submissionsError, count } = await query

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError)
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      submissions: submissions || [],
      total: count || 0,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error in GET /api/submissions/list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
