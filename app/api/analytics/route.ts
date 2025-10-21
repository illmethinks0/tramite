import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Analytics API
 *
 * GET /api/analytics - Get analytics summary for organization
 * Query params:
 * - form_id: Filter by form (optional)
 * - start_date: Start date (ISO string, default: 30 days ago)
 * - end_date: End date (ISO string, default: now)
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
    const start_date = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const end_date = searchParams.get('end_date') || new Date().toISOString()

    // Get organization forms
    let formsQuery = supabase
      .from('forms')
      .select('id, name, submission_count, completion_rate, created_at')
      .eq('organization_id', profile.organization_id)

    if (form_id) {
      formsQuery = formsQuery.eq('id', form_id)
    }

    const { data: forms, error: formsError } = await formsQuery

    if (formsError) {
      console.error('Error fetching forms:', formsError)
      return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 })
    }

    if (!forms || forms.length === 0) {
      return NextResponse.json({
        forms: [],
        summary: {
          total_views: 0,
          total_submissions: 0,
          total_forms: 0,
          avg_conversion_rate: 0,
          period_start: start_date,
          period_end: end_date
        },
        timeline: []
      })
    }

    // Get analytics for each form
    const analyticsPromises = forms.map(async (form) => {
      const { data, error } = await supabase.rpc('get_form_analytics', {
        form_id_input: form.id,
        start_date,
        end_date
      })

      if (error) {
        console.error(`Error fetching analytics for form ${form.id}:`, error)
        return null
      }

      return {
        form_id: form.id,
        form_name: form.name,
        ...data[0]
      }
    })

    const analyticsResults = await Promise.all(analyticsPromises)
    const analytics = analyticsResults.filter(Boolean)

    // Calculate summary statistics
    const summary = {
      total_views: analytics.reduce((sum, a) => sum + Number(a?.total_views || 0), 0),
      total_submissions: analytics.reduce((sum, a) => sum + Number(a?.total_submissions || 0), 0),
      total_forms: forms.length,
      avg_conversion_rate: analytics.length > 0
        ? analytics.reduce((sum, a) => sum + Number(a?.conversion_rate || 0), 0) / analytics.length
        : 0,
      period_start: start_date,
      period_end: end_date
    }

    // Get timeline data (daily breakdown)
    const { data: timelineData, error: timelineError } = await supabase
      .from('analytics_events')
      .select('event_type, created_at')
      .gte('created_at', start_date)
      .lte('created_at', end_date)
      .in('form_id', forms.map(f => f.id))
      .order('created_at', { ascending: true })

    if (timelineError) {
      console.error('Error fetching timeline:', timelineError)
    }

    // Group timeline data by date and event type
    const timeline = processTimelineData(timelineData || [], start_date, end_date)

    // Get device/browser stats
    const { data: deviceData } = await supabase
      .from('analytics_events')
      .select('metadata')
      .gte('created_at', start_date)
      .lte('created_at', end_date)
      .in('form_id', forms.map(f => f.id))
      .not('metadata', 'is', null)

    const deviceStats = processDeviceData(deviceData || [])

    return NextResponse.json({
      forms: analytics,
      summary,
      timeline,
      deviceStats
    })
  } catch (error) {
    console.error('Error in GET /api/analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Process timeline data into daily buckets
 */
function processTimelineData(events: any[], startDate: string, endDate: string) {
  const timeline: Record<string, { date: string; views: number; submissions: number; abandons: number }> = {}

  // Create buckets for each day in range
  const start = new Date(startDate)
  const end = new Date(endDate)
  const current = new Date(start)

  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0]
    timeline[dateKey] = {
      date: dateKey,
      views: 0,
      submissions: 0,
      abandons: 0
    }
    current.setDate(current.getDate() + 1)
  }

  // Fill buckets with event data
  events.forEach(event => {
    const dateKey = new Date(event.created_at).toISOString().split('T')[0]
    if (timeline[dateKey]) {
      if (event.event_type === 'form_view') {
        timeline[dateKey].views++
      } else if (event.event_type === 'form_submit') {
        timeline[dateKey].submissions++
      } else if (event.event_type === 'form_abandon') {
        timeline[dateKey].abandons++
      }
    }
  })

  return Object.values(timeline).sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Process device/browser data
 */
function processDeviceData(events: any[]) {
  const devices: Record<string, number> = {}
  const browsers: Record<string, number> = {}

  events.forEach(event => {
    if (event.metadata?.user_agent) {
      const ua = event.metadata.user_agent.toLowerCase()

      // Simple device detection
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        devices['Mobile'] = (devices['Mobile'] || 0) + 1
      } else if (ua.includes('tablet') || ua.includes('ipad')) {
        devices['Tablet'] = (devices['Tablet'] || 0) + 1
      } else {
        devices['Desktop'] = (devices['Desktop'] || 0) + 1
      }

      // Simple browser detection
      if (ua.includes('chrome') && !ua.includes('edge')) {
        browsers['Chrome'] = (browsers['Chrome'] || 0) + 1
      } else if (ua.includes('firefox')) {
        browsers['Firefox'] = (browsers['Firefox'] || 0) + 1
      } else if (ua.includes('safari') && !ua.includes('chrome')) {
        browsers['Safari'] = (browsers['Safari'] || 0) + 1
      } else if (ua.includes('edge')) {
        browsers['Edge'] = (browsers['Edge'] || 0) + 1
      } else {
        browsers['Other'] = (browsers['Other'] || 0) + 1
      }
    }
  })

  return { devices, browsers }
}
